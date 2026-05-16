// Chest open / upgrade logic.
import { state, notify } from './state.js';
import { CHEST_TIERS, CHEST_OPEN_COOLDOWN_MS } from './data.js';
import { generateItem } from './loot.js';

let lastOpenAt = 0;

export function canOpen() {
  return Date.now() - lastOpenAt >= CHEST_OPEN_COOLDOWN_MS;
}

export function cooldownRemaining() {
  return Math.max(0, CHEST_OPEN_COOLDOWN_MS - (Date.now() - lastOpenAt));
}

export function openChest() {
  if (!canOpen()) return null;
  lastOpenAt = Date.now();
  state.opened += 1;
  const item = generateItem(state.chestTier);
  notify();
  return item;
}

export function getCurrentTier() {
  return CHEST_TIERS.find(t => t.tier === state.chestTier);
}

export function getNextTier() {
  return CHEST_TIERS.find(t => t.tier === state.chestTier + 1) || null;
}

export function canUpgrade() {
  const current = getCurrentTier();
  if (!current || current.upgradeCost === null) return false;
  return state.gold >= current.upgradeCost;
}

export function upgradeChest() {
  if (!canUpgrade()) return false;
  const current = getCurrentTier();
  state.gold -= current.upgradeCost;
  state.chestTier += 1;
  notify();
  return true;
}
