// Forge actions: reroll affixes, upgrade chest tier of an item, transmute (upgrade rarity).
import { state, notify } from './state.js';
import { RARITIES, FORGE_COSTS } from './data.js';
import { rebuildItemAffixesOnly, rebuildItemAffixesAndStats, rebuildItemAffixesPlus } from './loot.js';

export const REROLL_PLUS_SHARD_COST = 3;

export function rerollCost(item) {
  return Math.max(50, Math.round(item.goldValue * FORGE_COSTS.rerollMult));
}

export function upgradeTierCost(item) {
  return Math.max(200, Math.round(item.goldValue * FORGE_COSTS.upgradeTierMult));
}

export function transmuteCost(item) {
  return Math.max(300, Math.round(item.goldValue * FORGE_COSTS.transmuteMult));
}

export function canReroll(item) {
  // common items have no affixes; unique items have fixed affixes
  return item && !item.uniqueId && item.affixes.length > 0 && state.gold >= rerollCost(item);
}

export function canUpgradeTier(item) {
  return item && item.chestTier < 5 && state.gold >= upgradeTierCost(item);
}

export function canTransmute(item) {
  if (!item) return false;
  if (item.uniqueId) return false;       // uniques can't change rarity
  const idx = RARITIES.findIndex(r => r.id === item.rarity);
  if (idx < 0 || idx >= RARITIES.length - 1) return false;
  return state.gold >= transmuteCost(item);
}

function trackForge() {
  if (state.stats) state.stats.forgesPerformed += 1;
}

export function reroll(item) {
  if (!canReroll(item)) return false;
  state.gold -= rerollCost(item);
  rebuildItemAffixesOnly(item);
  trackForge();
  notify();
  return true;
}

export function upgradeTier(item) {
  if (!canUpgradeTier(item)) return false;
  state.gold -= upgradeTierCost(item);
  item.chestTier += 1;
  rebuildItemAffixesAndStats(item);
  trackForge();
  notify();
  return true;
}

export function transmute(item) {
  if (!canTransmute(item)) return false;
  state.gold -= transmuteCost(item);
  const idx = RARITIES.findIndex(r => r.id === item.rarity);
  item.rarity = RARITIES[idx + 1].id;
  rebuildItemAffixesAndStats(item);
  trackForge();
  notify();
  return true;
}

export function rerollPlusGoldCost(item) {
  return Math.max(100, Math.round(item.goldValue * 2));
}

export function canRerollPlus(item) {
  if (!item || item.uniqueId) return false;
  if (item.affixes.length === 0) return false;
  if ((state.shards[item.rarity] || 0) < REROLL_PLUS_SHARD_COST) return false;
  if (state.gold < rerollPlusGoldCost(item)) return false;
  return true;
}

export function rerollPlus(item) {
  if (!canRerollPlus(item)) return false;
  state.gold -= rerollPlusGoldCost(item);
  state.shards[item.rarity] -= REROLL_PLUS_SHARD_COST;
  rebuildItemAffixesPlus(item);
  trackForge();
  notify();
  return true;
}
