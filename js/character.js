// Character equipment management + stat computation.
import { state, notify } from './state.js';
import { SLOTS, POWER_WEIGHTS } from './data.js';

export function equipItem(item) {
  const previous = state.equipment[item.slot] || null;
  state.equipment[item.slot] = item;
  // Remove from inventory if present
  const idx = state.inventory.findIndex(i => i.id === item.id);
  if (idx >= 0) state.inventory.splice(idx, 1);
  // Push old item back to inventory
  if (previous) state.inventory.push(previous);
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
  return total;
}

export function computePower(stats) {
  let p = 0;
  for (const [k, w] of Object.entries(POWER_WEIGHTS)) {
    p += (stats[k] || 0) * w;
  }
  return Math.round(p);
}
