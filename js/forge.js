// PoE-style forge: each action consumes a specific orb (currency).
// Reroll+ keeps using crystals (shards) for guaranteed high-roll affixes.
import { state, notify } from './state.js';
import { RARITIES, RARITY_BY_ID, AFFIXES, AFFIXES_BY_ID, AFFIX_LIMITS } from './data.js';
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

// Resolve the type of an affix (read from data.js if missing on legacy items)
function affixType(aff) {
  return aff.type || AFFIXES_BY_ID[aff.id]?.type || 'prefix';
}

// Returns { prefixUsed, suffixUsed, prefixMax, suffixMax }
function countAffixSlots(item) {
  const limits = AFFIX_LIMITS[item.rarity] || { prefix: 0, suffix: 0 };
  let prefixUsed = 0, suffixUsed = 0;
  for (const a of item.affixes) {
    if (affixType(a) === 'prefix') prefixUsed++;
    else suffixUsed++;
  }
  return { prefixUsed, suffixUsed, prefixMax: limits.prefix, suffixMax: limits.suffix };
}

function hasFreeSlot(item, forType /* optional */) {
  const s = countAffixSlots(item);
  const canPrefix = s.prefixUsed < s.prefixMax;
  const canSuffix = s.suffixUsed < s.suffixMax;
  if (forType === 'prefix') return canPrefix;
  if (forType === 'suffix') return canSuffix;
  return canPrefix || canSuffix;
}

// Pick a random affix definition that fits an available slot and is not already on the item.
function pickAffixForAvailableSlot(item) {
  const s = countAffixSlots(item);
  const canPrefix = s.prefixUsed < s.prefixMax;
  const canSuffix = s.suffixUsed < s.suffixMax;
  const usedStats = new Set(item.affixes.map(a => a.stat));
  let pool;
  if (canPrefix && canSuffix) {
    pool = AFFIXES.filter(a => !usedStats.has(a.stat));
  } else if (canPrefix) {
    pool = AFFIXES.filter(a => a.type === 'prefix' && !usedStats.has(a.stat));
  } else if (canSuffix) {
    pool = AFFIXES.filter(a => a.type === 'suffix' && !usedStats.has(a.stat));
  } else {
    return null;
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function recomputeGold(item) {
  const r = RARITY_BY_ID[item.rarity];
  item.goldValue = Math.round(r.goldMult * (1 + item.chestTier * item.chestTier * 0.6));
}

function rollSingleAffix(affixDef, chestTier) {
  const range = affixDef.max - affixDef.min;
  const value = Math.max(1, Math.round((Math.random() * range + affixDef.min) * chestTier));
  return { id: affixDef.id, stat: affixDef.stat, label: affixDef.label, value, percent: affixDef.percent, type: affixDef.type };
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
  item.affixes = [];
  const def = pickAffixForAvailableSlot(item);
  if (def) item.affixes.push(rollSingleAffix(def, item.chestTier));
  recomputeGold(item);
  trackForge();
  notify();
  return true;
}

// 🔵 Augmentation: add 1 affix to a magic item respecting prefix/suffix slots.
export function canAugmentation(item) {
  if (!item || item.uniqueId) return false;
  if (item.rarity !== 'magic') return false;
  if (!hasFreeSlot(item)) return false;
  return (state.orbs.augm || 0) >= 1;
}
export function applyAugmentation(item) {
  if (!canAugmentation(item)) return false;
  spendOrb('augm');
  const def = pickAffixForAvailableSlot(item);
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
  // After upgrading rarity, recompute available slots and add an affix.
  const def = pickAffixForAvailableSlot(item);
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

// 🔴 Exil: add 1 affix to a rare+ item (respects prefix/suffix slots).
export function canExil(item) {
  if (!item || item.uniqueId) return false;
  if (rarityIndex(item.rarity) < 2) return false;
  if (!hasFreeSlot(item)) return false;
  return (state.orbs.exil || 0) >= 1;
}
export function applyExil(item) {
  if (!canExil(item)) return false;
  spendOrb('exil');
  const def = pickAffixForAvailableSlot(item);
  if (def) item.affixes.push(rollSingleAffix(def, item.chestTier));
  trackForge();
  notify();
  return true;
}

// 🟪 Maître Forgeron: add a SPECIFIC affix chosen by the player.
// Caller must pass an affixId. Validity = orb available, affix not already present,
// type has free slot for this rarity.
export function canMasterCraft(item) {
  if (!item || item.uniqueId) return false;
  if (rarityIndex(item.rarity) < 1) return false;  // magic or higher
  if (!hasFreeSlot(item)) return false;
  return (state.orbs.maitre || 0) >= 1;
}

// Returns list of affix definitions available to craft on this item right now.
export function availableMasterCraftAffixes(item) {
  if (!item) return [];
  const usedStats = new Set(item.affixes.map(a => a.stat));
  return AFFIXES.filter(a => {
    if (usedStats.has(a.stat)) return false;
    return hasFreeSlot(item, a.type);
  });
}

export function applyMasterCraft(item, affixId) {
  if (!canMasterCraft(item)) return false;
  const def = AFFIXES_BY_ID[affixId];
  if (!def) return false;
  // Re-check this specific affix is craftable
  if (item.affixes.some(a => a.stat === def.stat)) return false;
  if (!hasFreeSlot(item, def.type)) return false;
  spendOrb('maitre');
  item.affixes.push(rollSingleAffix(def, item.chestTier));
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
  { id: 'maitre',        label: 'Maître Forgeron', orb: 'maitre', can: canMasterCraft,   apply: null /* opens sub-mode */,
    desc: 'choisis l\'affixe', group: 'Affixes', interactive: true },
  { id: 'rerollplus',    label: 'Reroll+',      orb: null,      can: canRerollPlus,    apply: rerollPlus,
    desc: 'reroll hauts rolls (3 💎)', group: 'Affixes', shards: REROLL_PLUS_SHARD_COST },
];
