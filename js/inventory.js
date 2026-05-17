// Inventory + selling + auto-sell unlock logic.
import { state, notify } from './state.js';
import { AUTOSELL_UNLOCK_COSTS, PRESTIGE_BONUS_PER_LEVEL } from './data.js';
import { sellMultiplier, shardBonus } from './talents.js';

function prestigeGoldMult() {
  return Math.pow(PRESTIGE_BONUS_PER_LEVEL.goldMult, state.prestige?.level || 0);
}

function sellPrice(item, goldFindBonus) {
  return Math.round(item.goldValue * (1 + goldFindBonus / 100) * prestigeGoldMult() * sellMultiplier());
}

export function addToInventory(item) {
  state.inventory.push(item);
  notify();
}

export function removeFromInventory(itemId) {
  const idx = state.inventory.findIndex(i => i.id === itemId);
  if (idx >= 0) {
    const [item] = state.inventory.splice(idx, 1);
    notify();
    return item;
  }
  return null;
}

export function sellItem(item) {
  // Find the item in inventory or equipment, remove it, give gold.
  let removed = removeFromInventory(item.id);
  if (!removed) {
    // Maybe it's equipped?
    for (const [slotId, it] of Object.entries(state.equipment)) {
      if (it && it.id === item.id) {
        state.equipment[slotId] = null;
        removed = it;
        break;
      }
    }
  }
  if (!removed) return 0;
  const goldFindBonus = computeGoldFindBonus();
  const earned = sellPrice(removed, goldFindBonus);
  state.gold += earned;
  if (state.stats) {
    state.stats.itemsSold += 1;
    state.stats.totalGoldEarned += earned;
  }
  notify();
  return earned;
}

function computeGoldFindBonus() {
  let bonus = 0;
  for (const item of Object.values(state.equipment)) {
    if (!item) continue;
    for (const aff of item.affixes || []) {
      if (aff.stat === 'goldFind') bonus += aff.value;
    }
  }
  return bonus;
}

export function sellAllOfRarities(raritySet) {
  let totalEarned = 0;
  let sold = 0;
  const goldFindBonus = computeGoldFindBonus();
  const remaining = [];
  for (const item of state.inventory) {
    if (raritySet.has(item.rarity)) {
      totalEarned += sellPrice(item, goldFindBonus);
      sold += 1;
    } else {
      remaining.push(item);
    }
  }
  state.inventory = remaining;
  state.gold += totalEarned;
  if (state.stats) {
    state.stats.itemsSold += sold;
    state.stats.totalGoldEarned += totalEarned;
  }
  notify();
  return totalEarned;
}

export function unlockAutoSell(rarityId) {
  const cost = AUTOSELL_UNLOCK_COSTS[rarityId];
  if (cost === null || cost === undefined) return false;
  if (state.autoSell[rarityId].unlocked) return false;
  if (state.gold < cost) return false;
  state.gold -= cost;
  state.autoSell[rarityId].unlocked = true;
  state.autoSell[rarityId].on = true;
  notify();
  return true;
}

export function toggleAutoSell(rarityId) {
  const slot = state.autoSell[rarityId];
  if (!slot || !slot.unlocked) return false;
  slot.on = !slot.on;
  notify();
  return slot.on;
}

export function isAutoSellOn(rarityId) {
  return state.autoSell[rarityId] && state.autoSell[rarityId].on;
}

// === Salvage / shards ===

export function shardYield(item) {
  const base = Math.max(1, Math.floor(item.goldValue / 25));
  return base + Math.floor(item.chestTier / 2) + shardBonus();
}

export function salvageItem(item) {
  let removed = removeFromInventory(item.id);
  if (!removed) {
    for (const [slotId, it] of Object.entries(state.equipment)) {
      if (it && it.id === item.id) {
        state.equipment[slotId] = null;
        removed = it;
        break;
      }
    }
  }
  if (!removed) return 0;
  const qty = shardYield(removed);
  state.shards[removed.rarity] = (state.shards[removed.rarity] || 0) + qty;
  notify();
  return qty;
}

export function salvageAllOfRarities(raritySet) {
  let totalShards = 0;
  const yields = {};
  const remaining = [];
  for (const item of state.inventory) {
    if (raritySet.has(item.rarity)) {
      const q = shardYield(item);
      yields[item.rarity] = (yields[item.rarity] || 0) + q;
      totalShards += q;
    } else {
      remaining.push(item);
    }
  }
  state.inventory = remaining;
  for (const [r, q] of Object.entries(yields)) {
    state.shards[r] = (state.shards[r] || 0) + q;
  }
  notify();
  return { totalShards, yields };
}

// Sell a single drop directly (without going through the inventory).
// Used by auto-sell on a fresh drop.
export function sellDrop(item) {
  const goldFindBonus = computeGoldFindBonus();
  const earned = sellPrice(item, goldFindBonus);
  state.gold += earned;
  if (state.stats) {
    state.stats.itemsSold += 1;
    state.stats.totalGoldEarned += earned;
  }
  notify();
  return earned;
}
