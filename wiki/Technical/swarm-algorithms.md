# Swarm Intelligence Algorithms

## Overview

This document outlines the core swarm intelligence algorithms that power NeuroSwarm's decentralized AI agent coordination system. Swarm intelligence enables emergent collective behavior through simple agent interactions, creating robust, adaptive, and scalable AI systems.

## Core Principles

### 1. Decentralized Coordination
- **No central authority**: All decisions emerge from agent interactions
- **Local communication**: Agents only communicate with nearby peers
- **Self-organization**: System adapts without external control

### 2. Emergent Behavior
- **Collective intelligence**: Individual agents create system-level capabilities
- **Adaptive resilience**: System maintains functionality despite agent failures
- **Scalable complexity**: Performance improves with agent count

## Algorithm Categories

### A. Task Allocation Algorithms

#### 1. Response Threshold Model
```typescript
interface TaskAllocation {
  taskId: string;
  agentId: string;
  threshold: number;
  stimulus: number;
  responseProbability: number;
}

function calculateResponseProbability(
  stimulus: number,
  threshold: number,
  sensitivity: number
): number {
  return 1 / (1 + Math.exp(-(stimulus - threshold) * sensitivity));
}
```

**Evaluation Metrics:**
- **Allocation Efficiency**: Tasks assigned to most suitable agents
- **Response Time**: Time from task creation to assignment
- **Load Balancing**: Even distribution across agent capabilities

#### 2. Market-Based Allocation
```typescript
interface Bid {
  agentId: string;
  taskId: string;
  bidAmount: number;
  confidence: number;
  estimatedCompletion: number;
}

function evaluateBid(bid: Bid, task: Task): number {
  const capabilityMatch = calculateCapabilityMatch(bid.agentId, task.requirements);
  const timeEfficiency = 1 / bid.estimatedCompletion;
  const costEfficiency = 1 / bid.bidAmount;

  return (capabilityMatch * 0.4) + (timeEfficiency * 0.3) + (costEfficiency * 0.3);
}
```

### B. Consensus Algorithms

#### 1. Weighted Majority Voting
```typescript
interface ConsensusVote {
  agentId: string;
  proposalId: string;
  vote: 'accept' | 'reject' | 'abstain';
  weight: number; // Based on reputation/stake
  confidence: number;
}

function calculateConsensusOutcome(votes: ConsensusVote[]): ConsensusResult {
  const totalWeight = votes.reduce((sum, vote) => sum + vote.weight, 0);
  const acceptWeight = votes
    .filter(v => v.vote === 'accept')
    .reduce((sum, vote) => sum + vote.weight, 0);

  const consensusRatio = acceptWeight / totalWeight;
  const quorumReached = totalWeight >= MIN_QUORUM_WEIGHT;

  return {
    accepted: consensusRatio >= CONSENSUS_THRESHOLD && quorumReached,
    ratio: consensusRatio,
    totalWeight,
    quorumReached
  };
}
```

#### 2. Quadratic Consensus
```typescript
function calculateQuadraticWeight(baseWeight: number, conviction: number): number {
  // Quadratic voting: cost = votes²
  // Weight = sqrt(votes) for fairness
  return Math.sqrt(conviction);
}

function aggregateQuadraticVotes(votes: QuadraticVote[]): ConsensusResult {
  const totalWeight = votes.reduce((sum, vote) =>
    sum + calculateQuadraticWeight(vote.baseWeight, vote.conviction), 0);

  const acceptWeight = votes
    .filter(v => v.vote === 'accept')
    .reduce((sum, vote) =>
      sum + calculateQuadraticWeight(vote.baseWeight, vote.conviction), 0);

  return {
    accepted: acceptWeight > totalWeight / 2,
    ratio: acceptWeight / totalWeight,
    totalWeight
  };
}
```

### C. Swarm Formation Algorithms

#### 1. K-Means Clustering for Task Grouping
```typescript
interface TaskCluster {
  centroid: TaskVector;
  tasks: Task[];
  assignedAgents: Agent[];
}

function clusterTasks(tasks: Task[], k: number): TaskCluster[] {
  // Initialize centroids randomly
  let centroids = initializeCentroids(tasks, k);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Assign tasks to nearest centroid
    const clusters = assignTasksToClusters(tasks, centroids);

    // Update centroids
    centroids = updateCentroids(clusters);

    // Check convergence
    if (hasConverged(centroids, previousCentroids)) {
      break;
    }
  }

  return clusters;
}
```

#### 2. Ant Colony Optimization for Path Finding
```typescript
interface PheromoneTrail {
  fromAgent: string;
  toAgent: string;
  pheromone: number;
  distance: number;
}

function updatePheromone(trail: PheromoneTrail, quality: number): number {
  const evaporation = trail.pheromone * (1 - EVAPORATION_RATE);
  const deposit = quality / trail.distance;
  return evaporation + deposit;
}

function selectNextAgent(
  currentAgent: Agent,
  candidates: Agent[],
  trails: PheromoneTrail[]
): Agent {
  const probabilities = candidates.map(candidate => {
    const trail = trails.find(t =>
      t.fromAgent === currentAgent.id && t.toAgent === candidate.id);

    return trail ? Math.pow(trail.pheromone, ALPHA) * Math.pow(1/trail.distance, BETA) : 0;
  });

  return selectByProbability(candidates, probabilities);
}
```

## Evaluation Metrics

### 1. Performance Metrics

#### Throughput
```
Tasks_Completed_Per_Second = Total_Tasks / Total_Time
```

#### Latency
```
Average_Task_Latency = Σ(Task_Completion_Time - Task_Creation_Time) / Task_Count
```

#### Resource Utilization
```
Agent_Utilization = Active_Time / Total_Time
System_Utilization = Σ(Agent_Utilization) / Agent_Count
```

### 2. Quality Metrics

#### Task Success Rate
```
Success_Rate = Successful_Tasks / Total_Tasks
```

#### Consensus Accuracy
```
Consensus_Accuracy = Correct_Consensus_Outcomes / Total_Consensus_Events
```

#### Emergent Behavior Quality
```
Behavior_Quality = (Task_Success_Rate × Consensus_Accuracy × System_Resilience)
```

### 3. Fairness Metrics

#### Load Distribution Fairness
```
Jain_Fairness_Index = (Σ(Agent_Load))² / (Agent_Count × Σ(Agent_Load²))
```

#### Reward Distribution Fairness
```
Reward_Equity = 1 - (Variance_Rewards / Mean_Rewards)
```

### 4. Resilience Metrics

#### Fault Tolerance
```
System_Degradation = Performance_After_Failure / Performance_Before_Failure
```

#### Recovery Time
```
Mean_Time_To_Recovery = Average_Time_To_Restore_Full_Functionality
```

## Simulation Framework

### Small-Scale Testing Setup
```typescript
interface SimulationConfig {
  agentCount: number;
  taskArrivalRate: number;
  networkTopology: 'fully-connected' | 'small-world' | 'scale-free';
  failureRate: number;
  consensusThreshold: number;
}

class SwarmSimulation {
  constructor(config: SimulationConfig) {
    this.agents = initializeAgents(config.agentCount);
    this.network = createNetwork(config.networkTopology);
    this.taskGenerator = new TaskGenerator(config.taskArrivalRate);
    this.failureInjector = new FailureInjector(config.failureRate);
  }

  async runSimulation(duration: number): Promise<SimulationResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      // Generate tasks
      const newTasks = this.taskGenerator.generateTasks();

      // Inject failures
      this.failureInjector.injectFailures(this.agents);

      // Run swarm coordination
      await this.coordinateSwarm(newTasks);

      // Collect metrics
      this.collectMetrics();
    }

    return this.generateReport();
  }
}
```

### Benchmark Scenarios

#### Scenario 1: Task Allocation Under Load
- **Setup**: 100 agents, 50 tasks/minute, varying complexity
- **Metrics**: Allocation efficiency, queue length, agent utilization
- **Expected Outcome**: <90% allocation efficiency, <5 minute average queue time

#### Scenario 2: Consensus Under Adversary
- **Setup**: 50 agents, 20% adversarial, quadratic voting
- **Metrics**: Consensus accuracy, time to consensus, resistance to manipulation
- **Expected Outcome**: >95% accuracy, <10 minute consensus time

#### Scenario 3: Swarm Resilience
- **Setup**: 200 agents, 10% random failures, dynamic task load
- **Metrics**: System throughput, recovery time, emergent behavior quality
- **Expected Outcome**: <10% performance degradation, <2 minute recovery

## Implementation Roadmap

### Phase 1: Core Algorithms (Current)
- [x] Task allocation algorithms
- [x] Basic consensus mechanisms
- [ ] Swarm formation primitives

### Phase 2: Advanced Features (Next)
- [ ] Multi-objective optimization
- [ ] Adaptive algorithm selection
- [ ] Cross-swarm coordination

### Phase 3: Production Optimization (Future)
- [ ] Real-time performance monitoring
- [ ] Automated parameter tuning
- [ ] Fault prediction and prevention

## References

1. Bonabeau, E., et al. "Swarm Intelligence: From Natural to Artificial Systems"
2. Kennedy, J. & Eberhart, R. "Particle Swarm Optimization"
3. Dorigo, M. "Ant Colony Optimization"
4. Larrañaga, P. & Lozano, J.A. "Estimation of Distribution Algorithms"