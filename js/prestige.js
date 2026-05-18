// Prestige / Ascension: reset most of the run for permanent multipliers.
import { state, notify } from './state.js';
import { SLOTS, PRESTIGE_REQUIREMENTS } from './data.js';
import { syncAbsoluteProgress as bountySync } from './bounties.js';

export function canAscend() {
  return state.chestTier >= PRESTIGE_REQUIREMENTS.minChestTier
      && state.combat.highestUnlocked >= PRESTIGE_REQUIREMENTS.minFloor;
}

export function ascensionRequirements() {
  return PRESTIGE_REQUIREMENTS;
}

export function ascend() {
  if (!canAscend()) return false;
  state.prestige.level += 1;
  state.prestige.totalAscensions += 1;
  state.talentPoints = (state.talentPoints || 0) + 2;
  // Reset run state — keep achievements unlocked, prestige itself, ui prefs, stats counters.
  state.gold = 0;
  state.keys = 10;
  state.chestTier = 1;
  state.opened = 0;
  state.inventory = [];
  for (const slot of SLOTS) state.equipment[slot.id] = null;
  state.combat = { currentFloor: 1, highestUnlocked: 1, kills: 0, deaths: 0, bossKills: 0 };
  state.pity = { sinceLegendary: 0 };
  for (const r of Object.keys(state.autoSell)) {
    state.autoSell[r].unlocked = (r === 'common');
    state.autoSell[r].on = false;
  }
  bountySync();
  notify();
  return true;
}
