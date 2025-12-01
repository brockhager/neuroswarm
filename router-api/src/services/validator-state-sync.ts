import registry from './validator-registry';
import { SolanaService } from './solana';

const POLL_INTERVAL_SECONDS = Number(process.env.VALIDATOR_SYNC_INTERVAL || 15);
const solana = new SolanaService();

export class ValidatorStateSync {
    private interval: NodeJS.Timeout | null = null;

    constructor() {
        console.log(`[StateSync] Validator State Sync initialized (interval=${POLL_INTERVAL_SECONDS}s)`);
    }

    public start() {
        if (this.interval) return;
        this.tick().catch(err => console.error('[StateSync] initial tick failed', err));
        this.interval = setInterval(() => this.tick().catch(err => console.error('[StateSync] periodic tick failed', err)), POLL_INTERVAL_SECONDS * 1000);
    }

    public stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private async tick() {
        try {
            // 1) Get on-chain validator metadata (stake, reputation)
            const onchain = await solana.getOnChainValidators();

            // 2) For each validator, probe the endpoint for health/capacity/latency
            for (const v of onchain) {
                const id = v.id;
                const endpoint = process.env[`VALIDATOR_ENDPOINT_${id}`] || null; // optional override

                // default synthetic values in case endpoint not configured
                let latency_ms = 500;
                let capacity_used = 0;
                let max_capacity = 8;

                try {
                    if (endpoint) {
                        const start = Date.now();
                        const res = await fetch(`${endpoint}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) } as any);
                        const stop = Date.now();
                        latency_ms = stop - start;
                        if (res.ok) {
                            const json = await res.json().catch(() => null);
                            if (json && typeof json.capacity_used === 'number') capacity_used = json.capacity_used;
                            if (json && typeof json.max_capacity === 'number') max_capacity = json.max_capacity;
                        }
                    }
                } catch (err) {
                    // If probe fails, we mark the node as less healthy (increase latency)
                    console.warn(`[StateSync] Failed probe for ${id} @ ${endpoint}:`, (err as any)?.message || err);
                    latency_ms = 2000;
                }

                // Upsert to registry (ensure latest values are provided)
                registry.upsert({
                    id,
                    endpoint: endpoint || `https://${id}.neuroswarm.io`,
                    wallet_address: v.wallet,
                    stake: v.stake,
                    reputation: v.reputation,
                    latency_ms,
                    capacity_used,
                    max_capacity
                });
            }

            // 3) Debug log summarizing registry size
            console.log(`[StateSync] Synced ${onchain.length} validators. Registry now has ${registry.getAll().length} entries.`);

        } catch (err) {
            console.error('[StateSync] Tick failed:', err);
        }
    }
}

export default ValidatorStateSync;
