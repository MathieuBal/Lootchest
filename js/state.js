// Global game state + simple pub/sub for UI redraws.
import { SLOTS, AUTOSELL_UNLOCK_COSTS } from './data.js';

const listeners = new Set();

export const state = {
  version: 1,
  gold: 0,
  chestTier: 1,
  opened: 0,
  inventory: [],          // array of Item
  equipment: {},          // { slotId: Item | null }
  autoSell: {             // { rarityId: { unlocked: bool, on: bool } }
    common: { unlocked: true,  on: false },
    magic:  { unlocked: false, on: false },
    rare:   { unlocked: false, on: false },
    epic:   { unlocked: false, on: false },
    legendary: { unlocked: false, on: false },
    ancestral: { unlocked: false, on: false },
  },
};

// Init empty equipment slots
for (const slot of SLOTS) state.equipment[slot.id] = null;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let pendingNotify = false;
export function notify() {
  if (pendingNotify) return;
  pendingNotify = true;
  queueMicrotask(() => {
    pendingNotify = false;
    for (const fn of listeners) fn(state);
  });
}

export function replaceState(newState) {
  // Merge into existing object so module references stay valid.
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, newState);
  // Ensure all slots exist (in case the save is old / partial)
  if (!state.equipment) state.equipment = {};
  for (const slot of SLOTS) {
    if (!(slot.id in state.equipment)) state.equipment[slot.id] = null;
  }
  // Ensure all rarities exist in autoSell
  if (!state.autoSell) state.autoSell = {};
  for (const r of Object.keys(AUTOSELL_UNLOCK_COSTS)) {
    if (!state.autoSell[r]) {
      state.autoSell[r] = { unlocked: r === 'common', on: false };
    }
  }
  notify();
}

export function resetState() {
  state.gold = 0;
  state.chestTier = 1;
  state.opened = 0;
  state.inventory = [];
  for (const slot of SLOTS) state.equipment[slot.id] = null;
  for (const r of Object.keys(state.autoSell)) {
    state.autoSell[r].unlocked = (r === 'common');
    state.autoSell[r].on = false;
  }
  notify();
}
