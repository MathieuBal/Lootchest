// Chest open / upgrade logic.
import { state, notify } from './state.js';
import { CHEST_TIERS, CHEST_OPEN_COOLDOWN_MS, CURRENCY_TYPES, keyCostForTier } from './data.js';
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

// Coût d'ouverture en clés du tier courant (BAL-011). Indexé sur le tier pour
// que le sink suive le revenu de clés qui scale avec la progression.
export function openCost() {
  return keyCostForTier(state.chestTier);
}

export function canOpen() {
  if (Date.now() - lastOpenAt < CHEST_OPEN_COOLDOWN_MS) return false;
  if ((state.keys || 0) < openCost()) return false;
  return true;
}

// Number of items a single open yields. Base 1, with a small (tier+prestige
// scaled) chance for bonus items — the "item quantity" / magic-find faucet.
export function rollItemQuantity(chestTier) {
  const prestige = state.prestige?.level || 0;
  let qty = 1;
  const pTwo = Math.min(0.5, 0.02 * (chestTier - 1) + 0.03 * prestige);
  if (Math.random() < pTwo) qty += 1;
  const pThree = Math.min(0.2, 0.01 * (chestTier - 1) + 0.015 * prestige);
  if (qty === 2 && Math.random() < pThree) qty += 1;
  return qty;
}

// Consume a focus orb (if one is held and a slot is targeted) and return that
// slot so the next generated item is forced to it. Returns null otherwise.
function consumeFocusSlot() {
  if (state.focusSlot && (state.orbs.focus || 0) > 0) {
    state.orbs.focus -= 1;
    return state.focusSlot;
  }
  return null;
}

export function cooldownRemaining() {
  return Math.max(0, CHEST_OPEN_COOLDOWN_MS - (Date.now() - lastOpenAt));
}

export function hasKey() {
  return (state.keys || 0) >= openCost();
}

export function openChest() {
  if (!canOpen()) return null;
  lastOpenAt = Date.now();
  state.keys = (state.keys || 0) - openCost();
  state.opened += 1;
  // Push-your-luck: 0.5% chance the chest is a Mimic. We hand off to the
  // encounter modal; the player's choices decide what they walk away with.
  if (shouldTriggerMimic()) {
    notify();
    return { mimic: startMimicEncounter({ chestTier: state.chestTier }) };
  }
  const forceSlot = consumeFocusSlot();
  const qty = rollItemQuantity(state.chestTier);
  const items = [];
  for (let i = 0; i < qty; i++) {
    // The focus only steers the first item of the open.
    items.push(generateItemFromChest(state.chestTier, { forceSlot: i === 0 ? forceSlot : null }));
  }
  const orbs = rollOrbDrops(state.chestTier);
  notify();
  return { items, orbs, focusUsed: !!forceSlot };
}

// Bulk open up to `n` chests (capped by available keys). Items are returned
// aggregated; the caller applies auto-sell/salvage and shows a recap.
export function openChests(n) {
  const items = [];
  const orbs = [];
  let opened = 0;
  let mimic = null;
  const cost = openCost(); // BAL-011 : coût par coffre, constant pour le tier courant
  while (opened < n && (state.keys || 0) >= cost) {
    state.keys -= cost;
    state.opened += 1;
    opened += 1;
    // Chaque coffre fait son PROPRE jet de Mimic, exactement comme autant
    // d'ouvertures unitaires (BUG-010). Le Mimic est une rencontre interactive
    // qui ne peut pas se résoudre en lot : dès qu'un coffre le déclenche, on
    // s'arrête. Le coffre déclencheur est consommé (comme en ouverture simple,
    // il ne donne pas de butin normal) mais les clés restantes ne le sont PAS,
    // donc la probabilité cumulée n'est jamais réduite — le joueur rouvrira le
    // reste après avoir résolu le Mimic.
    if (shouldTriggerMimic()) {
      mimic = startMimicEncounter({ chestTier: state.chestTier });
      break;
    }
    const forceSlot = consumeFocusSlot();
    const qty = rollItemQuantity(state.chestTier);
    for (let i = 0; i < qty; i++) {
      items.push(generateItemFromChest(state.chestTier, { forceSlot: i === 0 ? forceSlot : null }));
    }
    orbs.push(...rollOrbDrops(state.chestTier));
  }
  if (opened > 0) {
    lastOpenAt = Date.now();
    bountyTrack('open_chests', opened);
    notify();
  }
  return { items, orbs, opened, mimic };
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
