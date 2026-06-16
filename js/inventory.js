// Inventory + selling + auto-sell unlock logic.
import { state, notify } from './state.js';
import { AUTOSELL_UNLOCK_COSTS, prestigeGoldMult } from './data.js';
import { sellMultiplier, shardBonus } from './talents.js';
import { trackProgress as bountyTrack } from './bounties.js';
import { villageSellMult, marketUnlocksAutoSell } from './village.js';

function sellPrice(item, goldFindBonus) {
  return Math.round(item.goldValue * (1 + goldFindBonus / 100) * prestigeGoldMult(state.prestige?.level) * sellMultiplier() * villageSellMult());
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
  // Refuse to sell locked items.
  if (item.locked) return 0;
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
  bountyTrack('sell_items', 1);
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
    if (raritySet.has(item.rarity) && !item.locked) {
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
  if (sold > 0) bountyTrack('sell_items', sold);
  notify();
  return totalEarned;
}

export function toggleLockItem(itemId) {
  const it = state.inventory.find(i => i.id === itemId);
  if (!it) return null;
  it.locked = !it.locked;
  notify();
  return it.locked;
}

export function unlockAutoSell(rarityId) {
  const cost = AUTOSELL_UNLOCK_COSTS[rarityId];
  if (cost === null || cost === undefined) return false;
  if (state.autoSell[rarityId].unlocked) return false;
  // The Marché (village) unlocks auto-sell for free.
  const free = marketUnlocksAutoSell();
  if (!free && state.gold < cost) return false;
  if (!free) state.gold -= cost;
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

// 'sell' | 'salvage' | 'off' — what to do with auto-handled drops of this rarity.
export function autoActionFor(rarityId) {
  const slot = state.autoSell[rarityId];
  if (!slot || !slot.unlocked || !slot.on) return 'off';
  return slot.mode || 'sell';
}

export function setAutoMode(rarityId, mode) {
  const slot = state.autoSell[rarityId];
  if (!slot || !slot.unlocked) return false;
  slot.mode = mode === 'salvage' ? 'salvage' : 'sell';
  notify();
  return true;
}

// Salvage a fresh drop directly (without going through the inventory).
// Used by auto-salvage on a drop.
export function salvageDrop(item) {
  const qty = shardYield(item);
  state.shards[item.rarity] = (state.shards[item.rarity] || 0) + qty;
  notify();
  return qty;
}

// === Salvage / shards ===

export function shardYield(item) {
  const base = Math.max(1, Math.floor(item.goldValue / 25));
  return base + Math.floor(item.chestTier / 2) + shardBonus();
}

export function salvageItem(item) {
  if (item.locked) return 0;
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
    if (raritySet.has(item.rarity) && !item.locked) {
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

// === Vente groupée par sélection (UX-006) ===
// Prévisualise le total d'une sélection — n'inclut QUE les objets non
// verrouillés, comme la vente réelle, pour que le total affiché soit exact.
export function previewSell(idSet) {
  if (!idSet || !idSet.size) return { count: 0, total: 0 };
  const goldFindBonus = computeGoldFindBonus();
  let count = 0, total = 0;
  for (const item of state.inventory) {
    if (idSet.has(item.id) && !item.locked) { total += sellPrice(item, goldFindBonus); count++; }
  }
  return { count, total };
}

// Vend en UNE seule transaction (un seul notify, une seule sauvegarde) tous les
// objets sélectionnés non verrouillés. Les objets équipés ne sont pas dans
// state.inventory, donc ils ne peuvent pas être vendus accidentellement.
export function sellItemsByIds(idSet) {
  if (!idSet || !idSet.size) return { sold: 0, earned: 0 };
  const goldFindBonus = computeGoldFindBonus();
  let earned = 0, sold = 0;
  const remaining = [];
  for (const item of state.inventory) {
    if (idSet.has(item.id) && !item.locked) {
      earned += sellPrice(item, goldFindBonus);
      sold++;
    } else {
      remaining.push(item);
    }
  }
  state.inventory = remaining;
  state.gold += earned;
  if (state.stats) {
    state.stats.itemsSold += sold;
    state.stats.totalGoldEarned += earned;
  }
  if (sold > 0) bountyTrack('sell_items', sold);
  notify();
  return { sold, earned };
}
