// Global game state + simple pub/sub for UI redraws.
import { SLOTS, AUTOSELL_UNLOCK_COSTS } from './data.js';

const listeners = new Set();

export const state = {
  version: 4,
  gold: 0,
  keys: 10,               // 🗝 chest opening currency — farmed in dungeon
  chestTier: 1,
  opened: 0,
  focusSlot: null,        // 🎯 slot targeted for the next open (consumes a focus orb)
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
    loopMode: false,        // auto re-fight current floor while it's already unlocked
  },
  pity: {
    sinceLegendary: 0,
    sinceAncestral: 0,   // opens since last ancestral
    sinceUnique: 0,      // legendaries since last unique
  },
  ui: {
    leftTab: 'chest',     // 'chest' | 'dungeon'
    muted: false,
    hasSeenWelcome: false, // first-visit tutorial flag
    hasSeenIntro: false,   // intro cinematic shown once
  },
  settings: {
    fastCombat: false,    // skip animations during fights
    reducedParticles: false,
    confirmAscend: true,
    confirmDestructiveSell: true, // confirm "sell all" of epic+ rarities
    hardMode: false,      // monsters tougher (+50% HP/dmg) but drops +50%
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
    relics: {},                // { relicId: count } — permanent build modifiers
    pendingRelicChoice: null,  // [relicId, relicId, relicId] awaiting a pick
    pendingRelicRerolls: 0,    // free rerolls left on the pending choice
  },
  dive: {                      // Deep Dive roguelite run (persisted: best score only)
    bestDepth: 0,
    totalDives: 0,
  },
  village: {                   // management/idle layer (gold + dungeon sink)
    townhall: 1,
    resources: { wood: 60, stone: 40, metal: 0, essence: 0 },
    buildings: { houses: 0, sawmill: 0, quarry: 0, locksmith: 0 },
    workers: { sawmill: 0, quarry: 0, locksmith: 0 },
    lastTick: 0,
    _keyBuf: 0,
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
    chaos: 0, divin: 0, exil: 0, pierre: 0, maitre: 0, focus: 0,
  },
  talents: {},        // { talentId: rank }
  talentPoints: 0,    // unspent points
  loadout: ['ab_power_strike', 'ab_frenzy', 'ab_second_wind'], // active ability slots

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
  story: {            // the Chronicle: linear chapter progression
    step: 0,
    claimed: {},
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
  if (!state.pity) state.pity = { sinceLegendary: 0, sinceAncestral: 0, sinceUnique: 0 };
  if (state.pity.sinceAncestral === undefined) state.pity.sinceAncestral = 0;
  if (state.pity.sinceUnique === undefined) state.pity.sinceUnique = 0;
  if (state.focusSlot === undefined) state.focusSlot = null;
  if (!state.ui) state.ui = { leftTab: 'chest', muted: false, hasSeenWelcome: false };
  if (state.ui.muted === undefined) state.ui.muted = false;
  if (state.ui.hasSeenWelcome === undefined) {
    // Existing saves: skip welcome if they already opened anything
    state.ui.hasSeenWelcome = state.opened > 0;
  }
  // Existing saves shouldn't be ambushed by the intro; only brand-new ones see it.
  if (state.ui.hasSeenIntro === undefined) state.ui.hasSeenIntro = state.opened > 0;
  if (!state.settings) state.settings = {};
  const defaultSettings = { fastCombat: false, reducedParticles: false, confirmAscend: true, confirmDestructiveSell: true, hardMode: false };
  for (const [k, v] of Object.entries(defaultSettings)) {
    if (state.settings[k] === undefined) state.settings[k] = v;
  }
  if (!state.achievements) state.achievements = { unlocked: {} };
  if (!state.stats) state.stats = {};
  for (const k of ['legendaryDropped','ancestralDropped','uniquesDropped','itemsSold','totalGoldEarned','forgesPerformed','maxSetEquipped']) {
    if (state.stats[k] === undefined) state.stats[k] = 0;
  }
  if (!state.prestige) state.prestige = { level: 0, totalAscensions: 0 };
  if (!state.prestige.relics) state.prestige.relics = {};
  if (state.prestige.pendingRelicChoice === undefined) state.prestige.pendingRelicChoice = null;
  if (state.prestige.pendingRelicRerolls === undefined) state.prestige.pendingRelicRerolls = 0;
  if (!state.dive) state.dive = { bestDepth: 0, totalDives: 0 };
  if (!state.village) state.village = { townhall: 1, resources: { wood: 60, stone: 40, metal: 0, essence: 0 }, buildings: { houses: 0, sawmill: 0, quarry: 0, locksmith: 0 }, workers: { sawmill: 0, quarry: 0, locksmith: 0 }, lastTick: 0, _keyBuf: 0 };
  if (!state.village.resources) state.village.resources = { wood: 60, stone: 40, metal: 0 };
  if (state.village.resources.metal === undefined) state.village.resources.metal = 0;
  if (state.village.resources.essence === undefined) state.village.resources.essence = 0;
  if (!state.village.buildings) state.village.buildings = { houses: 0, sawmill: 0, quarry: 0, locksmith: 0 };
  if (!state.village.workers) state.village.workers = { sawmill: 0, quarry: 0, locksmith: 0 };
  if (!state.village.townhall) state.village.townhall = 1;
  if (state.village.construction === undefined) state.village.construction = null;
  if (!state.shards) state.shards = {};
  for (const k of ['common','magic','rare','epic','legendary','ancestral']) {
    if (state.shards[k] === undefined) state.shards[k] = 0;
  }
  if (!state.orbs) state.orbs = {};
  for (const k of ['transmu','augm','alte','regal','chaos','divin','exil','pierre','maitre','focus']) {
    if (state.orbs[k] === undefined) state.orbs[k] = 0;
  }
  if (!state.talents) state.talents = {};
  if (state.talentPoints === undefined) state.talentPoints = 0;
  if (!Array.isArray(state.loadout)) state.loadout = ['ab_power_strike', 'ab_frenzy', 'ab_second_wind'];
  if (!state.milestonesGranted) state.milestonesGranted = {};
  if (!state.codex) state.codex = { uniques: {}, sets: {}, bosses: {} };
  if (!state.codex.uniques) state.codex.uniques = {};
  if (!state.codex.sets) state.codex.sets = {};
  if (!state.codex.bosses) state.codex.bosses = {};
  if (!state.bounties) state.bounties = { active: [], completed: 0 };
  if (!Array.isArray(state.bounties.active)) state.bounties.active = [];
  if (!state.story) state.story = { step: 0, claimed: {} };
  if (typeof state.story.step !== 'number') state.story.step = 0;
  if (!state.story.claimed) state.story.claimed = {};
  if (state.keys === undefined) state.keys = 10;
  notify();
}

export function resetState() {
  state.gold = 0;
  state.keys = 10;
  state.chestTier = 1;
  state.opened = 0;
  state.inventory = [];
  for (const slot of SLOTS) state.equipment[slot.id] = null;
  for (const r of Object.keys(state.autoSell)) {
    state.autoSell[r].unlocked = (r === 'common');
    state.autoSell[r].on = false;
  }
  state.combat = { currentFloor: 1, highestUnlocked: 1, kills: 0, deaths: 0, bossKills: 0 };
  state.pity = { sinceLegendary: 0, sinceAncestral: 0, sinceUnique: 0 };
  state.focusSlot = null;
  state.ui = { leftTab: 'chest', muted: state.ui?.muted || false };
  state.achievements = { unlocked: {} };
  state.stats = { legendaryDropped: 0, ancestralDropped: 0, uniquesDropped: 0, itemsSold: 0, totalGoldEarned: 0, forgesPerformed: 0, maxSetEquipped: 0 };
  state.prestige = { level: 0, totalAscensions: 0, relics: {}, pendingRelicChoice: null };
  state.shards = { common: 0, magic: 0, rare: 0, epic: 0, legendary: 0, ancestral: 0 };
  state.orbs = { transmu: 0, augm: 0, alte: 0, regal: 0, chaos: 0, divin: 0, exil: 0, pierre: 0, maitre: 0, focus: 0 };
  state.talents = {};
  state.talentPoints = 0;
  state.loadout = ['ab_power_strike', 'ab_frenzy', 'ab_second_wind'];
  state.milestonesGranted = {};
  state.codex = { uniques: {}, sets: {}, bosses: {} };
  state.bounties = { active: [], completed: 0 };
  state.village = { townhall: 1, resources: { wood: 60, stone: 40, metal: 0, essence: 0 }, buildings: { houses: 0, sawmill: 0, quarry: 0, locksmith: 0 }, workers: { sawmill: 0, quarry: 0, locksmith: 0 }, lastTick: 0, _keyBuf: 0, construction: null };
  state.story = { step: 0, claimed: {} };
  notify();
}
