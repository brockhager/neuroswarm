/**
 * Fork Choice Rule
 * Determines the canonical chain head based on finality and chain length
 * Implements "Longest Chain with Finality" rule
 */

export class ForkChoice {
    constructor(options = {}) {
        this.consensusManager = options.consensusManager;
        this.MAX_REORG_DEPTH = options.maxReorgDepth || 100;
    }

    /**
     * Select the best block from a set of candidates
     * @param {Array} candidates - List of block headers/metadata
     * @returns {Object} The selected head block
     */
    getHead(candidates) {
        if (!candidates || candidates.length === 0) {
            return null;
        }

        // 1. Get last finalized block
        const finalizedHead = this.consensusManager ? this.consensusManager.getFinalizedHead() : { height: 0, hash: null };

        // 2. Filter candidates that don't descend from finalized head
        const validCandidates = candidates.filter(block => {
            // Must be higher than finalized block
            if (block.height <= finalizedHead.height) return false;

            // Verify ancestry (mock for now, but crucial for real implementation)
            if (!this.verifyAncestry(block, finalizedHead)) {
                return false;
            }

            return true;
        });

        if (validCandidates.length === 0) {
            return null;
        }

        // 3. Select longest chain (highest height)
        return validCandidates.reduce((best, current) => {
            if (!best) return current;

            if (current.height > best.height) {
                return current;
            } else if (current.height === best.height) {
                // Tie-breaker: lexicographical comparison of hashes
                return current.hash < best.hash ? current : best;
            }

            return best;
        }, null);
    }

    /**
     * Check if a reorg is safe
     * @param {Object} currentHead 
     * @param {Object} newHead 
     */
    isReorgSafe(currentHead, newHead) {
        // 1. Cannot reorg if current head is finalized (unless new head is descendant of it)
        if (this.consensusManager && this.consensusManager.isFinalized(currentHead.hash)) {
            if (newHead.height <= currentHead.height) return false;
        }

        // 2. Check Reorg Depth Limit
        // If we are switching branches, we shouldn't revert more than MAX_REORG_DEPTH blocks
        // Note: Without full chain storage access here, we approximate by height difference
        // In a real system, we'd find the common ancestor.

        // If new head is significantly lower, it's suspicious (but might just be a short chain)
        // If new head is higher, we need to ensure we aren't jumping from a completely different long chain

        // Simplified check: If both chains are long, and we switch, ensure we don't drop too much height
        // (This is a weak proxy for common ancestor check)
        if (currentHead.height - newHead.height > this.MAX_REORG_DEPTH) {
            return false;
        }

        return true;
    }

    /**
     * Verify if a block descends from an ancestor
     * @param {Object} block 
     * @param {Object} ancestor 
     */
    verifyAncestry(block, ancestor) {
        // If ancestor is genesis/null, everything descends from it
        if (!ancestor || !ancestor.hash) return true;

        // If we have direct parent link
        if (block.previousHash === ancestor.hash) {
            return true;
        }

        // If block height is exactly ancestor + 1, but hashes don't match (and we checked above), then no.
        if (block.height === ancestor.height + 1 && block.previousHash !== ancestor.hash) {
            return false;
        }

        // For deeper ancestry, we'd need to traverse the chain.
        // Mock: Assume valid if height > ancestor.height
        // In production, this MUST traverse the block store.
        return block.height > ancestor.height;
    }
}
