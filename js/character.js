// Character equipment management + stat computation.
import { state, notify } from './state.js';
import { SLOTS, POWER_WEIGHTS, SETS_BY_ID } from './data.js';

export function equipItem(item) {
  const previous = state.equipment[item.slot] || null;
  state.equipment[item.slot] = item;
  // Remove from inventory if present
  const idx = state.inventory.findIndex(i => i.id === item.id);
  if (idx >= 0) state.inventory.splice(idx, 1);
  // Push old item back to inventory
  if (previous) state.inventory.push(previous);
  // Track max set pieces equipped (for achievements)
  if (state.stats) {
    state.stats.maxSetEquipped = Math.max(state.stats.maxSetEquipped || 0, maxSetCount());
  }
  notify();
  return previous;
}

export function unequipSlot(slotId) {
  const item = state.equipment[slotId];
  if (!item) return null;
  state.equipment[slotId] = null;
  state.inventory.push(item);
  notify();
  return item;
}

export function computeStats() {
  // Sum base stats + affixes across all equipped items.
  const total = {
    vitality: 0,
    damage: 0,
    armor: 0,
    crit: 0,
    fireDmg: 0,
    goldFind: 0,
    speed: 0,
  };
  for (const slot of SLOTS) {
    const item = state.equipment[slot.id];
    if (!item) continue;
    for (const [k, v] of Object.entries(item.baseStats || {})) {
      total[k] = (total[k] || 0) + v;
    }
    for (const aff of item.affixes || []) {
      total[aff.stat] = (total[aff.stat] || 0) + aff.value;
    }
  }
  // Add set bonuses
  for (const b of computeSetBonuses()) {
    total[b.stat] = (total[b.stat] || 0) + b.value;
  }
  return total;
}

// Returns array of { setId, setName, color, count, activeBonuses: [{stat, value, percent, label, threshold}] }
export function computeSetSummary() {
  const counts = {};       // { setId: count of distinct slots equipped }
  const slots = {};        // { setId: Set<slotId> }
  for (const item of Object.values(state.equipment)) {
    if (item && item.setId) {
      if (!slots[item.setId]) slots[item.setId] = new Set();
      slots[item.setId].add(item.slot);
    }
  }
  const result = [];
  for (const [setId, slotSet] of Object.entries(slots)) {
    const set = SETS_BY_ID[setId];
    if (!set) continue;
    const count = slotSet.size;
    const totalPieces = Object.keys(set.pieces).length;
    const activeBonuses = [];
    for (const [threshold, bonuses] of Object.entries(set.bonuses)) {
      if (count >= parseInt(threshold)) {
        activeBonuses.push(...bonuses.map(b => ({ ...b, threshold: parseInt(threshold) })));
      }
    }
    result.push({ setId, setName: set.name, color: set.color, count, totalPieces, activeBonuses });
  }
  return result;
}

// Just the flat bonus list (for computeStats)
function computeSetBonuses() {
  const summary = computeSetSummary();
  const out = [];
  for (const s of summary) out.push(...s.activeBonuses);
  return out;
}

// Returns the max number of distinct slots equipped from any single set
export function maxSetCount() {
  return computeSetSummary().reduce((max, s) => Math.max(max, s.count), 0);
}

export function computePower(stats) {
  let p = 0;
  for (const [k, w] of Object.entries(POWER_WEIGHTS)) {
    p += (stats[k] || 0) * w;
  }
  return Math.round(p);
}
