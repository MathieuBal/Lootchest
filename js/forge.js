// PoE-style forge: each action consumes a specific orb (currency).
// Reroll+ keeps using crystals (shards) for guaranteed high-roll affixes.
import { state, notify } from './state.js';
import { RARITIES, RARITY_BY_ID, AFFIXES, MAX_BONUS_AFFIXES } from './data.js';
import {
  rebuildItemAffixesOnly, rebuildItemAffixesPlus, rebuildItemAffixesAndStats,
} from './loot.js';

export const REROLL_PLUS_SHARD_COST = 3;

// === Helpers ===

function spendOrb(id) {
  if ((state.orbs[id] || 0) < 1) return false;
  state.orbs[id] -= 1;
  return true;
}

function trackForge() {
  if (state.stats) state.stats.forgesPerformed += 1;
}

function maxAffixesFor(item) {
  const r = RARITY_BY_ID[item.rarity];
  return (r?.affixes || 0) + MAX_BONUS_AFFIXES;
}

function recomputeGold(item) {
  const r = RARITY_BY_ID[item.rarity];
  item.goldValue = Math.round(r.goldMult * (1 + item.chestTier * item.chestTier * 0.6));
}

function rollSingleAffix(affixDef, chestTier) {
  const range = affixDef.max - affixDef.min;
  const value = Math.max(1, Math.round((Math.random() * range + affixDef.min) * chestTier));
  return { id: affixDef.id, stat: affixDef.stat, label: affixDef.label, value, percent: affixDef.percent };
}

function pickRandomAffixDef(excludeStats) {
  const pool = AFFIXES.filter(a => !excludeStats.has(a.stat));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function rarityIndex(rarityId) {
  return RARITIES.findIndex(r => r.id === rarityId);
}

// === Reroll+ (shard-based, keeps existing behaviour) ===

export function canRerollPlus(item) {
  if (!item || item.uniqueId) return false;
  if (item.affixes.length === 0) return false;
  return (state.shards[item.rarity] || 0) >= REROLL_PLUS_SHARD_COST;
}

export function rerollPlus(item) {
  if (!canRerollPlus(item)) return false;
  state.shards[item.rarity] -= REROLL_PLUS_SHARD_COST;
  rebuildItemAffixesPlus(item);
  trackForge();
  notify();
  return true;
}

// === Orb actions ===

// 🟢 Transmutation: common → magic, adds 1 affix.
export function canTransmutation(item) {
  return !!item && !item.uniqueId && item.rarity === 'common' && (state.orbs.transmu || 0) >= 1;
}
export function applyTransmutation(item) {
  if (!canTransmutation(item)) return false;
  spendOrb('transmu');
  item.rarity = 'magic';
  const def = pickRandomAffixDef(new Set());
  item.affixes = def ? [rollSingleAffix(def, item.chestTier)] : [];
  recomputeGold(item);
  trackForge();
  notify();
  return true;
}

// 🔵 Augmentation: add 1 affix to a magic item (≤ 2).
export function canAugmentation(item) {
  if (!item || item.uniqueId) return false;
  if (item.rarity !== 'magic') return false;
  if (item.affixes.length >= 2) return false;
  return (state.orbs.augm || 0) >= 1;
}
export function applyAugmentation(item) {
  if (!canAugmentation(item)) return false;
  spendOrb('augm');
  const used = new Set(item.affixes.map(a => a.stat));
  const def = pickRandomAffixDef(used);
  if (def) item.affixes.push(rollSingleAffix(def, item.chestTier));
  trackForge();
  notify();
  return true;
}

// 🟣 Altération: full reroll of magic affixes (keeps rarity, same count).
export function canAlteration(item) {
  return !!item && !item.uniqueId && item.rarity === 'magic' && (state.orbs.alte || 0) >= 1;
}
export function applyAlteration(item) {
  if (!canAlteration(item)) return false;
  spendOrb('alte');
  rebuildItemAffixesOnly(item);
  trackForge();
  notify();
  return true;
}

// 🟡 Régal: magic → rare, adds 1 affix on top of existing.
export function canRegal(item) {
  return !!item && !item.uniqueId && item.rarity === 'magic' && (state.orbs.regal || 0) >= 1;
}
export function applyRegal(item) {
  if (!canRegal(item)) return false;
  spendOrb('regal');
  item.rarity = 'rare';
  const used = new Set(item.affixes.map(a => a.stat));
  const def = pickRandomAffixDef(used);
  if (def) item.affixes.push(rollSingleAffix(def, item.chestTier));
  recomputeGold(item);
  trackForge();
  notify();
  return true;
}

// 🟠 Chaos: full reroll of rare+ affixes.
export function canChaos(item) {
  if (!item || item.uniqueId) return false;
  if (rarityIndex(item.rarity) < 2) return false;
  return (state.orbs.chaos || 0) >= 1;
}
export function applyChaos(item) {
  if (!canChaos(item)) return false;
  spendOrb('chaos');
  rebuildItemAffixesOnly(item);
  trackForge();
  notify();
  return true;
}

// ⚪ Divin: reroll only the VALUES of existing affixes (keep which stats).
export function canDivine(item) {
  if (!item || item.uniqueId) return false;
  if (!item.affixes || item.affixes.length === 0) return false;
  return (state.orbs.divin || 0) >= 1;
}
export function applyDivine(item) {
  if (!canDivine(item)) return false;
  spendOrb('divin');
  for (const aff of item.affixes) {
    const def = AFFIXES.find(a => a.id === aff.id);
    if (def) {
      const range = def.max - def.min;
      aff.value = Math.max(1, Math.round((Math.random() * range + def.min) * item.chestTier));
    }
  }
  trackForge();
  notify();
  return true;
}

// 🔴 Exil: add 1 affix to a rare+ item (only if below max).
export function canExil(item) {
  if (!item || item.uniqueId) return false;
  if (rarityIndex(item.rarity) < 2) return false;
  if (item.affixes.length >= maxAffixesFor(item)) return false;
  return (state.orbs.exil || 0) >= 1;
}
export function applyExil(item) {
  if (!canExil(item)) return false;
  spendOrb('exil');
  const used = new Set(item.affixes.map(a => a.stat));
  const def = pickRandomAffixDef(used);
  if (def) item.affixes.push(rollSingleAffix(def, item.chestTier));
  trackForge();
  notify();
  return true;
}

// 🪨 Pierre de Forge: increase item chestTier by +1 (max T5), re-scales stats.
export function canPierre(item) {
  if (!item) return false;
  if (item.chestTier >= 5) return false;
  return (state.orbs.pierre || 0) >= 1;
}
export function applyPierre(item) {
  if (!canPierre(item)) return false;
  spendOrb('pierre');
  item.chestTier += 1;
  rebuildItemAffixesAndStats(item);
  trackForge();
  notify();
  return true;
}

// === Aggregated definition for UI iteration ===

export const FORGE_ACTIONS = [
  { id: 'transmutation', label: 'Transmuter',   orb: 'transmu', can: canTransmutation, apply: applyTransmutation,
    desc: 'commun → magique', group: 'Rareté' },
  { id: 'augmentation',  label: 'Augmenter',    orb: 'augm',    can: canAugmentation,  apply: applyAugmentation,
    desc: '+1 affixe (magique)', group: 'Affixes' },
  { id: 'alteration',    label: 'Altérer',      orb: 'alte',    can: canAlteration,    apply: applyAlteration,
    desc: 'reroll magique', group: 'Affixes' },
  { id: 'regal',         label: 'Régal',        orb: 'regal',   can: canRegal,         apply: applyRegal,
    desc: 'magique → rare', group: 'Rareté' },
  { id: 'chaos',         label: 'Chaos',        orb: 'chaos',   can: canChaos,         apply: applyChaos,
    desc: 'reroll rare+', group: 'Affixes' },
  { id: 'divine',        label: 'Divin',        orb: 'divin',   can: canDivine,        apply: applyDivine,
    desc: 'reroll valeurs', group: 'Affixes' },
  { id: 'exil',          label: 'Exil',         orb: 'exil',    can: canExil,          apply: applyExil,
    desc: '+1 affixe (rare+)', group: 'Affixes' },
  { id: 'pierre',        label: 'Pierre',       orb: 'pierre',  can: canPierre,        apply: applyPierre,
    desc: 'tier d\'objet +1', group: 'Tier' },
  { id: 'rerollplus',    label: 'Reroll+',      orb: null,      can: canRerollPlus,    apply: rerollPlus,
    desc: 'reroll hauts rolls (3 💎)', group: 'Affixes', shards: REROLL_PLUS_SHARD_COST },
];
