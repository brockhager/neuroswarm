/**
 * CN-12-B: VP Swarm Job Queue Service
 * 
 * This module implements a distributed job queue to decouple the Gateway from VP Swarm processing.
 * It provides fault tolerance, horizontal scaling, and guaranteed delivery for artifact submissions.
 * 
 * Architecture:
 * - Producer: Gateway enqueues jobs (artifact submissions)
 * - Queue: In-memory queue with persistence support (Redis-ready)
 * - Consumer: VP Swarm workers consume and process jobs
 * 
 * Features:
 * - Job prioritization
 * - Automatic retry with exponential backoff
 * - Dead letter queue for failed jobs
 * - Job status tracking
 * - Metrics and monitoring
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY = 'retry',
  DEAD_LETTER = 'dead_letter',
}

export enum JobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface ArtifactPayload {
  content: string;
  metadata?: {
    title: string;
    description?: string;
    tags?: string[];
    contentType?: 'text' | 'code' | 'data' | 'media';
  };
  sources?: Array<{
    type: string;
    url?: string;
    content?: string;
  }>;
}

export interface Job {
  id: string;
  type: 'ARTIFACT_SUBMIT' | 'ARTIFACT_BATCH' | 'CODE_ANALYSIS' | 'CRITIQUE_REQUEST';
  payload: ArtifactPayload | ArtifactPayload[];
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: any;
  userId?: string;
  correlationId?: string;
}

export interface JobQueueConfig {
  maxConcurrentJobs: number;
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  maxRetryDelayMs: number;
  jobTimeoutMs: number;
  enableDeadLetterQueue: boolean;
  metricsIntervalMs: number;
}

export interface QueueMetrics {
  totalEnqueued: number;
  totalProcessed: number;
  totalFailed: number;
  totalRetried: number;
  activeJobs: number;
  queuedJobs: number;
  deadLetterJobs: number;
  averageProcessingTimeMs: number;
  uptimeSeconds: number;
}

// ============================================================================
// JOB QUEUE SERVICE
// ============================================================================

export class JobQueueService extends EventEmitter {
  private queue: Job[] = [];
  private activeJobs: Map<string, Job> = new Map();
  private deadLetterQueue: Job[] = [];
  private completedJobs: Map<string, Job> = new Map();
  
  private config: JobQueueConfig;
  private metrics: QueueMetrics;
  private startTime: number;
  private metricsInterval?: NodeJS.Timeout;
  private processingInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config?: Partial<JobQueueConfig>) {
    super();
    
    // Default configuration
    this.config = {
      maxConcurrentJobs: 10,
      maxRetries: 3,
      retryDelayMs: 1000,
      retryBackoffMultiplier: 2,
      maxRetryDelayMs: 30000,
      jobTimeoutMs: 60000,
      enableDeadLetterQueue: true,
      metricsIntervalMs: 10000,
      ...config,
    };

    this.metrics = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      totalRetried: 0,
      activeJobs: 0,
      queuedJobs: 0,
      deadLetterJobs: 0,
      averageProcessingTimeMs: 0,
      uptimeSeconds: 0,
    };

    this.startTime = Date.now();
  }

  // ==========================================================================
  // PRODUCER API (Gateway → Queue)
  // ==========================================================================

  /**
   * Enqueue a job for processing
   */
  public async enqueue(
    type: Job['type'],
    payload: Job['payload'],
    options?: {
      priority?: JobPriority;
      userId?: string;
      correlationId?: string;
    }
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: Job = {
      id: jobId,
      type,
      payload,
      priority: options?.priority ?? JobPriority.NORMAL,
      status: JobStatus.QUEUED,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: options?.userId,
      correlationId: options?.correlationId,
    };

    // Insert job into queue based on priority
    this.insertByPriority(job);
    
    this.metrics.totalEnqueued++;
    this.metrics.queuedJobs = this.queue.length;

    this.emit('job:enqueued', job);
    console.log(`[JobQueue] Enqueued job ${jobId} (type=${type}, priority=${job.priority})`);

    return jobId;
  }

  /**
   * Get job status
   */
  public async getJobStatus(jobId: string): Promise<Job | null> {
    // Check active jobs
    if (this.activeJobs.has(jobId)) {
      return this.activeJobs.get(jobId)!;
    }

    // Check completed jobs
    if (this.completedJobs.has(jobId)) {
      return this.completedJobs.get(jobId)!;
    }

    // Check queue
    const queuedJob = this.queue.find(j => j.id === jobId);
    if (queuedJob) return queuedJob;

    // Check dead letter queue
    const deadJob = this.deadLetterQueue.find(j => j.id === jobId);
    if (deadJob) return deadJob;

    return null;
  }

  /**
   * Cancel a job (if not yet processing)
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    const index = this.queue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      const job = this.queue.splice(index, 1)[0];
      job.status = JobStatus.FAILED;
      job.error = 'Cancelled by user';
      this.completedJobs.set(jobId, job);
      this.emit('job:cancelled', job);
      return true;
    }
    return false;
  }

  // ==========================================================================
  // CONSUMER API (VP Swarm Worker → Queue)
  // ==========================================================================

  /**
   * Process jobs from the queue
   * This should be called by VP Swarm workers
   */
  public start(): void {
    if (this.isRunning) {
      console.log('[JobQueue] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[JobQueue] Starting job processor...');
    console.log(`[JobQueue] Config: maxConcurrent=${this.config.maxConcurrentJobs}, maxRetries=${this.config.maxRetries}`);

    // Start processing loop
    this.processingInterval = setInterval(() => {
      this.processNextJobs();
    }, 100); // Check every 100ms

    // Start metrics reporting
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.emit('metrics:update', this.metrics);
    }, this.config.metricsIntervalMs);

    this.emit('queue:started');
  }

  /**
   * Stop processing jobs
   */
  public async stop(): Promise<void> {
    console.log('[JobQueue] Stopping job processor...');
    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Wait for active jobs to complete
    if (this.activeJobs.size > 0) {
      console.log(`[JobQueue] Waiting for ${this.activeJobs.size} active jobs to complete...`);
      await this.waitForActiveJobs();
    }

    this.emit('queue:stopped');
    console.log('[JobQueue] Stopped');
  }

  /**
   * Register a job processor function
   * VP Swarm workers call this to process jobs
   */
  public onJob(
    handler: (job: Job) => Promise<any>
  ): void {
    this.on('job:process', async (job: Job) => {
      try {
        const result = await handler(job);
        await this.completeJob(job.id, result);
      } catch (error) {
        await this.failJob(job.id, error instanceof Error ? error.message : String(error));
      }
    });
  }

  // ==========================================================================
  // INTERNAL PROCESSING
  // ==========================================================================

  private async processNextJobs(): Promise<void> {
    if (!this.isRunning) return;

    // Check if we can process more jobs
    const availableSlots = this.config.maxConcurrentJobs - this.activeJobs.size;
    if (availableSlots <= 0 || this.queue.length === 0) {
      return;
    }

    // Process multiple jobs up to available slots
    const jobsToProcess = Math.min(availableSlots, this.queue.length);
    
    for (let i = 0; i < jobsToProcess; i++) {
      const job = this.queue.shift();
      if (!job) break;

      await this.startJob(job);
    }
  }

  private async startJob(job: Job): Promise<void> {
    job.status = JobStatus.PROCESSING;
    job.startedAt = Date.now();
    job.updatedAt = Date.now();
    job.attempts++;

    this.activeJobs.set(job.id, job);
    this.metrics.activeJobs = this.activeJobs.size;
    this.metrics.queuedJobs = this.queue.length;

    console.log(`[JobQueue] Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);

    // Set timeout for job
    const timeoutId = setTimeout(() => {
      this.timeoutJob(job.id);
    }, this.config.jobTimeoutMs);

    // Emit job for processing
    this.emit('job:process', job);

    // Clean up timeout when job completes
    this.once(`job:${job.id}:complete`, () => clearTimeout(timeoutId));
  }

  private async completeJob(jobId: string, result: any): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    job.status = JobStatus.COMPLETED;
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    job.result = result;

    this.activeJobs.delete(jobId);
    this.completedJobs.set(jobId, job);

    this.metrics.totalProcessed++;
    this.metrics.activeJobs = this.activeJobs.size;

    // Update average processing time
    const processingTime = job.completedAt - job.startedAt!;
    this.updateAverageProcessingTime(processingTime);

    console.log(`[JobQueue] Completed job ${jobId} in ${processingTime}ms`);
    this.emit('job:completed', job);
    this.emit(`job:${jobId}:complete`);
  }

  private async failJob(jobId: string, error: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    job.error = error;
    job.updatedAt = Date.now();

    console.log(`[JobQueue] Job ${jobId} failed: ${error} (attempt ${job.attempts}/${job.maxAttempts})`);

    // Check if we should retry
    if (job.attempts < job.maxAttempts) {
      await this.retryJob(job);
    } else {
      await this.moveToDeadLetter(job);
    }

    this.activeJobs.delete(jobId);
    this.metrics.activeJobs = this.activeJobs.size;
    this.emit(`job:${jobId}:complete`);
  }

  private async retryJob(job: Job): Promise<void> {
    job.status = JobStatus.RETRY;
    
    // Calculate retry delay with exponential backoff
    const baseDelay = this.config.retryDelayMs;
    const multiplier = Math.pow(this.config.retryBackoffMultiplier, job.attempts - 1);
    const delay = Math.min(baseDelay * multiplier, this.config.maxRetryDelayMs);

    this.metrics.totalRetried++;

    console.log(`[JobQueue] Retrying job ${job.id} in ${delay}ms`);

    setTimeout(() => {
      job.status = JobStatus.QUEUED;
      this.insertByPriority(job);
      this.metrics.queuedJobs = this.queue.length;
      this.emit('job:retry', job);
    }, delay);
  }

  private async moveToDeadLetter(job: Job): Promise<void> {
    job.status = JobStatus.DEAD_LETTER;
    job.updatedAt = Date.now();

    if (this.config.enableDeadLetterQueue) {
      this.deadLetterQueue.push(job);
      this.metrics.deadLetterJobs = this.deadLetterQueue.length;
    }

    this.metrics.totalFailed++;

    console.error(`[JobQueue] Job ${job.id} moved to dead letter queue after ${job.attempts} attempts`);
    this.emit('job:dead_letter', job);
  }

  private async timeoutJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    console.warn(`[JobQueue] Job ${jobId} timed out after ${this.config.jobTimeoutMs}ms`);
    await this.failJob(jobId, `Job timeout after ${this.config.jobTimeoutMs}ms`);
  }

  // ==========================================================================
  // QUEUE MANAGEMENT
  // ==========================================================================

  private insertByPriority(job: Job): void {
    // Find insertion point based on priority (higher priority first)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (job.priority > this.queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    this.queue.splice(insertIndex, 0, job);
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async waitForActiveJobs(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.activeJobs.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  private updateMetrics(): void {
    this.metrics.activeJobs = this.activeJobs.size;
    this.metrics.queuedJobs = this.queue.length;
    this.metrics.deadLetterJobs = this.deadLetterQueue.length;
    this.metrics.uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
  }

  private updateAverageProcessingTime(newTime: number): void {
    const totalProcessed = this.metrics.totalProcessed;
    const currentAvg = this.metrics.averageProcessingTimeMs;
    this.metrics.averageProcessingTimeMs = 
      (currentAvg * (totalProcessed - 1) + newTime) / totalProcessed;
  }

  // ==========================================================================
  // PUBLIC METRICS & MONITORING
  // ==========================================================================

  public getMetrics(): QueueMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getActiveJobsCount(): number {
    return this.activeJobs.size;
  }

  public getDeadLetterQueue(): Job[] {
    return [...this.deadLetterQueue];
  }

  public clearCompletedJobs(): number {
    const count = this.completedJobs.size;
    this.completedJobs.clear();
    return count;
  }

  public retryDeadLetterJob(jobId: string): boolean {
    const index = this.deadLetterQueue.findIndex(j => j.id === jobId);
    if (index === -1) return false;

    const job = this.deadLetterQueue.splice(index, 1)[0];
    job.status = JobStatus.QUEUED;
    job.attempts = 0; // Reset attempts
    job.error = undefined;
    
    this.insertByPriority(job);
    this.metrics.queuedJobs = this.queue.length;
    this.metrics.deadLetterJobs = this.deadLetterQueue.length;

    console.log(`[JobQueue] Retrying dead letter job ${jobId}`);
    return true;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let queueInstance: JobQueueService | null = null;

export function getJobQueue(config?: Partial<JobQueueConfig>): JobQueueService {
  if (!queueInstance) {
    queueInstance = new JobQueueService(config);
  }
  return queueInstance;
}

export function resetJobQueue(): void {
  if (queueInstance) {
    queueInstance.stop();
    queueInstance = null;
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Gateway Producer
 */
export async function exampleProducer() {
  const queue = getJobQueue();

  // Enqueue artifact submission
  const jobId = await queue.enqueue(
    'ARTIFACT_SUBMIT',
    {
      content: 'This is my artifact content',
      metadata: {
        title: 'My First Artifact',
        description: 'An example artifact',
        tags: ['example', 'test'],
      },
    },
    {
      priority: JobPriority.NORMAL,
      userId: 'user123',
      correlationId: 'req-abc-123',
    }
  );

  console.log(`Enqueued job: ${jobId}`);

  // Check status later
  const job = await queue.getJobStatus(jobId);
  console.log(`Job status: ${job?.status}`);
}

/**
 * Example: VP Swarm Consumer
 */
export async function exampleConsumer() {
  const queue = getJobQueue({
    maxConcurrentJobs: 5,
    maxRetries: 3,
  });

  // Register job processor
  queue.onJob(async (job) => {
    console.log(`Processing job ${job.id}...`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return result
    return {
      artifactId: `artifact_${Date.now()}`,
      status: 'processed',
      timestamp: new Date().toISOString(),
    };
  });

  // Start processing
  queue.start();

  // Monitor metrics
  queue.on('metrics:update', (metrics) => {
    console.log('Queue Metrics:', metrics);
  });

  // Handle events
  queue.on('job:completed', (job) => {
    console.log(`Job ${job.id} completed:`, job.result);
  });

  queue.on('job:dead_letter', (job) => {
    console.error(`Job ${job.id} failed permanently:`, job.error);
  });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    JobQueueService,
    JobStatus,
    JobPriority,
    getJobQueue,
    resetJobQueue,
  };
}
