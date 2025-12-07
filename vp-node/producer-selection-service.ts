/**
 * vp-node/producer-selection-service.ts
 *
 * CN-07-A (VP): Producer selection algorithm for VP Swarm workers.
 *
 * This module provides functions to pick a single producer from an active set of
 * validators. Selection is stake-weighted but includes a small configurable
 * randomness factor to prevent strict monopolization by the largest stakers.
 *
 * Two selection helpers are provided:
 *  - chooseProducerFromActiveSet: uses a runtime RNG (Math.random by default)
 *  - deterministicChooseProducer: produces deterministic selection given a
 *    seed string (useful for tests and deterministic scheduling)
 */

import crypto from 'crypto';

export interface ValidatorCandidate {
  id: string;
  stake: number; // numeric stake weight (units are platform-dependent)
}

export interface SelectionOptions {
  randomnessFactor?: number; // fraction [0..1] of stake variation introduced
  minStake?: number; // minimum stake for eligibility
  rng?: () => number; // deterministic RNG (0..1) if provided
}

/**
 * Small helper that perturbs a base stake by a small random factor.
 * weight = stake * (1 + randomnessFactor * (u*2 - 1)) where u in [0,1) -> factor in [-rf, +rf]
 */
function perturbedWeight(stake: number, randomnessFactor: number, u: number) {
  const factor = 1 + randomnessFactor * ((u * 2) - 1);
  return Math.max(0, stake * factor);
}

/**
 * Weighted random pick helper. Takes an array of {id,weight} and RNG to pick
 * a single id proportional to weight. Returns null if empty or totalWeight==0.
 */
function weightedPick<T extends { id: string; weight: number }>(
  items: T[],
  rng: () => number = Math.random
): string | null {
  if (!items || items.length === 0) return null;
  const total = items.reduce((s, it) => s + it.weight, 0);
  if (total <= 0) return null;
  const r = rng() * total;
  let acc = 0;
  for (const it of items) {
    acc += it.weight;
    if (r < acc) return it.id;
  }
  // fallback
  return items[items.length - 1].id;
}

/**
 * Choose a producer from an active set using a small random perturbation.
 * Non-deterministic when no RNG is passed.
 */
export function chooseProducerFromActiveSet(
  active: ValidatorCandidate[],
  opts: SelectionOptions = {}
): string | null {
  const randomnessFactor = Math.max(0, Math.min(1, opts.randomnessFactor ?? 0.02));
  const minStake = opts.minStake ?? 0;
  const rng = opts.rng ?? Math.random;

  // Filter eligible validators
  const eligible = (active || []).filter(v => Number.isFinite(v.stake) && v.stake >= minStake);
  if (eligible.length === 0) return null;

  // Build weight array using runtime RNG for perturbation
  const weighted = eligible.map(v => ({ id: v.id, weight: perturbedWeight(v.stake, randomnessFactor, rng()) }));

  return weightedPick(weighted, rng);
}

/**
 * Deterministic variant: given a seed string and active set, we compute a
 * per-validator pseudo-random perturbation based on hashing the seed+id.
 * This is useful for deterministic scheduling in tests or reproducible jobs.
 */
export function deterministicChooseProducer(
  active: ValidatorCandidate[],
  seed: string,
  opts: { randomnessFactor?: number; minStake?: number } = {}
): string | null {
  const randomnessFactor = Math.max(0, Math.min(1, opts.randomnessFactor ?? 0.02));
  const minStake = opts.minStake ?? 0;

  const eligible = (active || []).filter(v => Number.isFinite(v.stake) && v.stake >= minStake);
  if (eligible.length === 0) return null;

  // deterministic per-validator pseudo-random value using SHA256(seed + id)
  const weighted = eligible.map(v => {
    const h = crypto.createHash('sha256').update(seed + '|' + v.id).digest('hex');
    // take a 12-hex-digit window -> ~48 bits of entropy
    const slice = h.slice(0, 12);
    const num = parseInt(slice, 16) / (0xffffffffffff + 1); // normalize to [0,1)
    const w = perturbedWeight(v.stake, randomnessFactor, num);
    return { id: v.id, weight: w };
  });

  // deterministic weighted pick: derive a deterministic pick RNG using seed + 'pick'
  const pickHash = crypto.createHash('sha256').update(seed + '|pick').digest('hex');
  const pickNum = parseInt(pickHash.slice(0, 12), 16) / (0xffffffffffff + 1);
  const rng = () => pickNum; // single-sample deterministic RNG

  return weightedPick(weighted, rng);
}

export default {
  chooseProducerFromActiveSet,
  deterministicChooseProducer,
};
