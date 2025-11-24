export const blockMap = new Map(); // blockHash -> block {header, txs, blockHash, parentHash, cumWeight, snapshot}
export const heads = new Set(); // blockHash candidates for chain tip
export const txIndex = new Map();
export const validators = new Map(); // validatorId -> { stake: number, publicKey: string, slashed?: boolean, slashedAt?: number }
export const proposals = new Map(); // id -> { title, yes: number, no: number }

export const state = {
    canonicalTipHash: null,
    totalStake: 0,
    slashPct: 10 // Defaulting to 10% as it wasn't found in search, will verify
};

export function getCanonicalHeight() {
    let h = state.canonicalTipHash;
    let height = 0;
    while (h && blockMap.has(h)) {
        height += 1;
        h = blockMap.get(h).parentHash;
    }
    return height;
}

export function getBlockAncestors(hash) {
    const ancestors = [];
    let curr = hash;
    while (curr && blockMap.has(curr)) {
        ancestors.push(curr);
        curr = blockMap.get(curr).parentHash;
    }
    return ancestors; // from child up to genesis
}

export function findCommonAncestor(hashA, hashB) {
    const aAnc = new Set(getBlockAncestors(hashA));
    let curr = hashB;
    while (curr && blockMap.has(curr)) {
        if (aAnc.has(curr)) return curr;
        curr = blockMap.get(curr).parentHash;
    }
    return null;
}
