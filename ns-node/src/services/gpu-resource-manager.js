/**
 * GPU Resource Manager
 * 
 * Detects, monitors, and manages GPU resources on the local node.
 * Supports NVIDIA (CUDA) and AMD (ROCm) GPUs with graceful CPU fallback.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

class GpuResourceManager {
    constructor() {
        this.gpuInfo = null;
        this.lastUpdate = null;
        this.updateInterval = 5000; // 5 seconds
        this.capabilities = {
            hasGpu: false,
            vendor: 'none', // 'nvidia', 'amd', or 'none'
            deviceCount: 0,
            totalVram: 0,
            computeCapability: null,
            providers: []
        };

        this.utilizationHistory = [];
        this.maxHistorySize = 60; // Keep 5 minutes of data at 5s intervals
    }

    /**
     * Initialize GPU detection
     */
    async initialize() {
        console.log('[GPU] Initializing GPU Resource Manager...');

        // Detect GPU type
        await this.detectGpu();

        // Get initial GPU info if available
        if (this.capabilities.hasGpu) {
            await this.updateGpuInfo();

            // Start monitoring loop
            this.startMonitoring();
        }

        console.log('[GPU] Capabilities:', this.capabilities);
        return this.capabilities;
    }

    /**
     * Detect GPU vendor and availability
     */
    async detectGpu() {
        // Try NVIDIA first
        const hasNvidia = await this.detectNvidiaGpu();
        if (hasNvidia) {
            this.capabilities.vendor = 'nvidia';
            this.capabilities.hasGpu = true;
            return;
        }

        // Try AMD
        const hasAmd = await this.detectAmdGpu();
        if (hasAmd) {
            this.capabilities.vendor = 'amd';
            this.capabilities.hasGpu = true;
            return;
        }

        // No GPU detected
        this.capabilities.vendor = 'none';
        this.capabilities.hasGpu = false;
        console.log('[GPU] No GPU detected, will use CPU');
    }

    /**
     * Detect NVIDIA GPU via nvidia-smi
     */
    async detectNvidiaGpu() {
        try {
            const { stdout } = await execAsync('nvidia-smi --query-gpu=count --format=csv,noheader');
            const count = parseInt(stdout.trim());

            if (count > 0) {
                this.capabilities.deviceCount = count;
                console.log(`[GPU] Detected ${count} NVIDIA GPU(s)`);
                return true;
            }
        } catch (err) {
            // nvidia-smi not found or failed
        }
        return false;
    }

    /**
     * Detect AMD GPU via rocm-smi
     */
    async detectAmdGpu() {
        try {
            const { stdout } = await execAsync('rocm-smi --showid');

            // Parse output to count GPUs
            const lines = stdout.split('\n').filter(line => line.includes('GPU'));
            const count = lines.length;

            if (count > 0) {
                this.capabilities.deviceCount = count;
                console.log(`[GPU] Detected ${count} AMD GPU(s)`);
                return true;
            }
        } catch (err) {
            // rocm-smi not found or failed
        }
        return false;
    }

    /**
     * Update GPU information
     */
    async updateGpuInfo() {
        if (!this.capabilities.hasGpu) {
            return null;
        }

        try {
            if (this.capabilities.vendor === 'nvidia') {
                this.gpuInfo = await this.getNvidiaInfo();
            } else if (this.capabilities.vendor === 'amd') {
                this.gpuInfo = await this.getAmdInfo();
            }

            this.lastUpdate = Date.now();

            // Store utilization history
            if (this.gpuInfo && this.gpuInfo.devices) {
                const avgUtilization = this.gpuInfo.devices.reduce((sum, dev) =>
                    sum + dev.utilization, 0) / this.gpuInfo.devices.length;

                this.utilizationHistory.push({
                    timestamp: this.lastUpdate,
                    utilization: avgUtilization
                });

                // Trim history
                if (this.utilizationHistory.length > this.maxHistorySize) {
                    this.utilizationHistory.shift();
                }
            }

            return this.gpuInfo;
        } catch (err) {
            console.error('[GPU] Failed to update GPU info:', err.message);
            return null;
        }
    }

    /**
     * Get NVIDIA GPU information
     */
    async getNvidiaInfo() {
        const query = [
            'index',
            'name',
            'memory.total',
            'memory.used',
            'memory.free',
            'utilization.gpu',
            'temperature.gpu',
            'power.draw',
            'compute_cap'
        ].join(',');

        const { stdout } = await execAsync(
            `nvidia-smi --query-gpu=${query} --format=csv,noheader,nounits`
        );

        const devices = stdout.trim().split('\n').map(line => {
            const [index, name, memTotal, memUsed, memFree, util, temp, power, computeCap] =
                line.split(',').map(s => s.trim());

            return {
                index: parseInt(index),
                name,
                memoryTotal: parseInt(memTotal),
                memoryUsed: parseInt(memUsed),
                memoryFree: parseInt(memFree),
                utilization: parseInt(util),
                temperature: parseInt(temp),
                powerDraw: parseFloat(power),
                computeCapability: computeCap
            };
        });

        const totalVram = devices.reduce((sum, dev) => sum + dev.memoryTotal, 0);
        this.capabilities.totalVram = totalVram;
        this.capabilities.computeCapability = devices[0]?.computeCapability;

        return {
            vendor: 'nvidia',
            deviceCount: devices.length,
            totalVram,
            devices,
            timestamp: Date.now()
        };
    }

    /**
     * Get AMD GPU information
     */
    async getAmdInfo() {
        // ROCm SMI parsing is more complex, simplified version
        const { stdout } = await execAsync('rocm-smi --showid --showuse --showmeminfo vram --showtemp');

        // This is a simplified parser - real implementation would need more robust parsing
        const devices = [];
        let currentDevice = null;

        stdout.split('\n').forEach(line => {
            if (line.includes('GPU')) {
                if (currentDevice) devices.push(currentDevice);
                currentDevice = {
                    index: devices.length,
                    name: 'AMD GPU',
                    memoryTotal: 0,
                    memoryUsed: 0,
                    memoryFree: 0,
                    utilization: 0,
                    temperature: 0,
                    powerDraw: 0
                };
            }
            // Parse other fields...
            // This is simplified - real implementation would parse actual ROCm output
        });

        if (currentDevice) devices.push(currentDevice);

        const totalVram = devices.reduce((sum, dev) => sum + dev.memoryTotal, 0);
        this.capabilities.totalVram = totalVram;

        return {
            vendor: 'amd',
            deviceCount: devices.length,
            totalVram,
            devices,
            timestamp: Date.now()
        };
    }

    /**
     * Start monitoring loop
     */
    startMonitoring() {
        setInterval(async () => {
            await this.updateGpuInfo();
        }, this.updateInterval);

        console.log(`[GPU] Monitoring started (interval: ${this.updateInterval}ms)`);
    }

    /**
     * Get current GPU status
     */
    async getStatus() {
        const status = {
            capabilities: this.capabilities,
            current: this.gpuInfo,
            lastUpdate: this.lastUpdate,
            cpuInfo: {
                model: os.cpus()[0].model,
                cores: os.cpus().length,
                loadAverage: os.loadavg()
            }
        };

        // Fetch providers from NS-LLM (simulated/placeholder for now as we don't have direct access here easily without importing nsLLM)
        // In a real scenario, this service would depend on nsLLM service.
        // We'll leave the providers array empty or populated by what we found via SMI.

        return status;
    }

    /**
     * Check if node can handle inference request
     */
    canHandleInference(requiredVram = 0) {
        if (!this.capabilities.hasGpu) {
            // Can always fallback to CPU
            return {
                capable: true,
                device: 'cpu',
                reason: 'No GPU available, using CPU'
            };
        }

        if (!this.gpuInfo || !this.gpuInfo.devices) {
            return {
                capable: false,
                device: null,
                reason: 'GPU info not available'
            };
        }

        // Find device with sufficient free VRAM and lowest utilization
        const suitableDevices = this.gpuInfo.devices
            .filter(dev => dev.memoryFree >= requiredVram)
            .sort((a, b) => a.utilization - b.utilization);

        if (suitableDevices.length > 0) {
            return {
                capable: true,
                device: 'gpu',
                deviceIndex: suitableDevices[0].index,
                availableVram: suitableDevices[0].memoryFree,
                utilization: suitableDevices[0].utilization
            };
        }

        // Fallback to CPU if GPU VRAM insufficient
        return {
            capable: true,
            device: 'cpu',
            reason: `Insufficient GPU VRAM (required: ${requiredVram}MB, max available: ${Math.max(...this.gpuInfo.devices.map(d => d.memoryFree))
                }MB)`
        };
    }

    /**
     * Get utilization trend
     */
    getUtilizationTrend(minutes = 5) {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        const recent = this.utilizationHistory.filter(h => h.timestamp >= cutoff);

        if (recent.length === 0) {
            return { trend: 'unknown', average: 0, samples: 0 };
        }

        const average = recent.reduce((sum, h) => sum + h.utilization, 0) / recent.length;

        // Simple trend: compare last 25% vs first 25%
        const quarterSize = Math.floor(recent.length / 4);
        if (quarterSize > 0) {
            const firstQuarter = recent.slice(0, quarterSize);
            const lastQuarter = recent.slice(-quarterSize);

            const firstAvg = firstQuarter.reduce((sum, h) => sum + h.utilization, 0) / firstQuarter.length;
            const lastAvg = lastQuarter.reduce((sum, h) => sum + h.utilization, 0) / lastQuarter.length;

            const diff = lastAvg - firstAvg;
            let trend = 'stable';
            if (diff > 10) trend = 'increasing';
            else if (diff < -10) trend = 'decreasing';

            return { trend, average, samples: recent.length, change: diff };
        }

        return { trend: 'stable', average, samples: recent.length, change: 0 };
    }

    /**
     * Register GPU capabilities with peer network
     */
    getNetworkMetadata() {
        return {
            gpu: {
                available: this.capabilities.hasGpu,
                vendor: this.capabilities.vendor,
                deviceCount: this.capabilities.deviceCount,
                totalVram: this.capabilities.totalVram,
                computeCapability: this.capabilities.computeCapability,
                currentLoad: this.gpuInfo?.devices?.[0]?.utilization || 0
            },
            cpu: {
                model: os.cpus()[0].model,
                cores: os.cpus().length,
                loadAverage: os.loadavg()[0]
            }
        };
    }
}

export default GpuResourceManager;
