// Chest open / upgrade logic.
import { state, notify } from './state.js';
import { CHEST_TIERS, CHEST_OPEN_COOLDOWN_MS, CURRENCY_TYPES } from './data.js';
import { generateItemFromChest } from './loot.js';
import { orbDropMultiplier } from './talents.js';
import { trackProgress as bountyTrack } from './bounties.js';
import { shouldTriggerMimic, startMimicEncounter } from './mimic.js';

// Roll each currency type independently. Higher chest tier slightly boosts rates.
// Returns array of currency IDs that dropped this open.
export function rollOrbDrops(chestTier) {
  const tierBoost = 1 + (chestTier - 1) * 0.18;
  const talentBoost = orbDropMultiplier();
  const earned = [];
  for (const c of CURRENCY_TYPES) {
    if (Math.random() < c.baseDropChance * tierBoost * talentBoost) {
      state.orbs[c.id] = (state.orbs[c.id] || 0) + 1;
      earned.push(c.id);
    }
  }
  return earned;
}

let lastOpenAt = 0;

export function canOpen() {
  if (Date.now() - lastOpenAt < CHEST_OPEN_COOLDOWN_MS) return false;
  if ((state.keys || 0) < 1) return false;
  return true;
}

export function cooldownRemaining() {
  return Math.max(0, CHEST_OPEN_COOLDOWN_MS - (Date.now() - lastOpenAt));
}

export function hasKey() {
  return (state.keys || 0) >= 1;
}

export function openChest() {
  if (!canOpen()) return null;
  lastOpenAt = Date.now();
  state.keys = (state.keys || 0) - 1;
  state.opened += 1;
  bountyTrack('open_chests', 1);
  // Push-your-luck: occasionally the chest is a Mimic. We return a special
  // result; main.js shows the encounter modal and only resolves on player choice.
  if (shouldTriggerMimic()) {
    notify();
    return { mimic: startMimicEncounter({ chestTier: state.chestTier }) };
  }
  const item = generateItemFromChest(state.chestTier);
  const orbs = rollOrbDrops(state.chestTier);
  notify();
  return { item, orbs };
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
  const next = getNextTier();
  if (!next) return false;
  // Locked by prestige requirement?
  if (next.prestigeReq && (state.prestige?.level || 0) < next.prestigeReq) return false;
  return state.gold >= current.upgradeCost;
}

// Returns null if the next tier exists but is locked by prestige.
export function nextTierLockedBy() {
  const next = getNextTier();
  if (!next || !next.prestigeReq) return null;
  if ((state.prestige?.level || 0) >= next.prestigeReq) return null;
  return next.prestigeReq;
}

export function upgradeChest() {
  if (!canUpgrade()) return false;
  const current = getCurrentTier();
  state.gold -= current.upgradeCost;
  state.chestTier += 1;
  notify();
  return true;
}
