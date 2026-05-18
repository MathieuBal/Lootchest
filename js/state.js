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
  autoSell: {             // { rarityId: { unlocked: bool, on: bool, mode: 'sell'|'salvage' } }
    common: { unlocked: true,  on: false, mode: 'sell' },
    magic:  { unlocked: false, on: false, mode: 'sell' },
    rare:   { unlocked: false, on: false, mode: 'sell' },
    epic:   { unlocked: false, on: false, mode: 'sell' },
    legendary: { unlocked: false, on: false, mode: 'sell' },
    ancestral: { unlocked: false, on: false, mode: 'sell' },
  },
  combat: {
    currentFloor: 1,
    highestUnlocked: 1,
    kills: 0,
    deaths: 0,
    bossKills: 0,
  },
  pity: {
    sinceLegendary: 0,
  },
  ui: {
    leftTab: 'chest',     // 'chest' | 'dungeon'
    muted: false,
  },
  settings: {
    fastCombat: false,    // skip animations during fights
    reducedParticles: false,
    confirmAscend: true,
    confirmDestructiveSell: true, // confirm "sell all" of epic+ rarities
  },
  achievements: {
    unlocked: {},         // { [id]: true }
  },
  stats: {
    legendaryDropped: 0,
    ancestralDropped: 0,
    uniquesDropped: 0,
    itemsSold: 0,
    totalGoldEarned: 0,
    forgesPerformed: 0,
    maxSetEquipped: 0,
  },
  prestige: {
    level: 0,
    totalAscensions: 0,
  },
  shards: {
    common: 0,
    magic: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    ancestral: 0,
  },
  orbs: {
    transmu: 0, augm: 0, alte: 0, regal: 0,
    chaos: 0, divin: 0, exil: 0, pierre: 0, maitre: 0,
  },
  talents: {},        // { talentId: rank }
  talentPoints: 0,    // unspent points
  milestonesGranted: {}, // { milestoneLevel: true } - one-shot tracking
  codex: {
    uniques: {},      // { uniqueId: true }
    sets: {},         // { setId: piecesSeen (count) }
    bosses: {},       // { biomeId: killCount }
  },
  bounties: {
    active: [],       // up to 3 bounty objects
    completed: 0,     // lifetime completions
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
      state.autoSell[r] = { unlocked: r === 'common', on: false, mode: 'sell' };
    }
    if (!state.autoSell[r].mode) state.autoSell[r].mode = 'sell';
  }
  if (!state.combat) state.combat = { currentFloor: 1, highestUnlocked: 1, kills: 0, deaths: 0, bossKills: 0 };
  if (!state.pity) state.pity = { sinceLegendary: 0 };
  if (!state.ui) state.ui = { leftTab: 'chest', muted: false };
  if (state.ui.muted === undefined) state.ui.muted = false;
  if (!state.settings) state.settings = {};
  const defaultSettings = { fastCombat: false, reducedParticles: false, confirmAscend: true, confirmDestructiveSell: true };
  for (const [k, v] of Object.entries(defaultSettings)) {
    if (state.settings[k] === undefined) state.settings[k] = v;
  }
  if (!state.achievements) state.achievements = { unlocked: {} };
  if (!state.stats) state.stats = {};
  for (const k of ['legendaryDropped','ancestralDropped','uniquesDropped','itemsSold','totalGoldEarned','forgesPerformed','maxSetEquipped']) {
    if (state.stats[k] === undefined) state.stats[k] = 0;
  }
  if (!state.prestige) state.prestige = { level: 0, totalAscensions: 0 };
  if (!state.shards) state.shards = {};
  for (const k of ['common','magic','rare','epic','legendary','ancestral']) {
    if (state.shards[k] === undefined) state.shards[k] = 0;
  }
  if (!state.orbs) state.orbs = {};
  for (const k of ['transmu','augm','alte','regal','chaos','divin','exil','pierre','maitre']) {
    if (state.orbs[k] === undefined) state.orbs[k] = 0;
  }
  if (!state.talents) state.talents = {};
  if (state.talentPoints === undefined) state.talentPoints = 0;
  if (!state.milestonesGranted) state.milestonesGranted = {};
  if (!state.codex) state.codex = { uniques: {}, sets: {}, bosses: {} };
  if (!state.codex.uniques) state.codex.uniques = {};
  if (!state.codex.sets) state.codex.sets = {};
  if (!state.codex.bosses) state.codex.bosses = {};
  if (!state.bounties) state.bounties = { active: [], completed: 0 };
  if (!Array.isArray(state.bounties.active)) state.bounties.active = [];
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
  state.combat = { currentFloor: 1, highestUnlocked: 1, kills: 0, deaths: 0, bossKills: 0 };
  state.pity = { sinceLegendary: 0 };
  state.ui = { leftTab: 'chest', muted: state.ui?.muted || false };
  state.achievements = { unlocked: {} };
  state.stats = { legendaryDropped: 0, ancestralDropped: 0, uniquesDropped: 0, itemsSold: 0, totalGoldEarned: 0, forgesPerformed: 0, maxSetEquipped: 0 };
  state.prestige = { level: 0, totalAscensions: 0 };
  state.shards = { common: 0, magic: 0, rare: 0, epic: 0, legendary: 0, ancestral: 0 };
  state.orbs = { transmu: 0, augm: 0, alte: 0, regal: 0, chaos: 0, divin: 0, exil: 0, pierre: 0, maitre: 0 };
  state.talents = {};
  state.talentPoints = 0;
  state.milestonesGranted = {};
  state.codex = { uniques: {}, sets: {}, bosses: {} };
  state.bounties = { active: [], completed: 0 };
  notify();
}
