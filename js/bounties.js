// Bounty board: 3 active contracts at a time, each with a target, progress, and reward.
// Completing one auto-replaces it with a new randomly-generated contract.
import { state, notify } from './state.js';
import { CURRENCY_TYPES } from './data.js';
import { villageBountySlots, villageRerollMult } from './village.js';

// Active contract slots: base 3, +1 per Guilde (village) level.
export function maxBountySlots() { return 3 + villageBountySlots(); }

// Templates: each can be instantiated at easy/medium/hard difficulty.
// `targets` gives [min, max] range per difficulty; the actual target is picked uniformly.
export const BOUNTY_TYPES = [
  {
    type: 'kill_monsters', name: 'Chasseur', emoji: '⚔',
    descFn: t => `Tue ${t} monstres en donjon`,
    targets: { easy: [10, 30],   medium: [80, 200], hard: [400, 800] },
  },
  {
    type: 'kill_bosses', name: 'Tueur de boss', emoji: '👑',
    descFn: t => `Tue ${t} boss en donjon`,
    targets: { easy: [1, 3],     medium: [5, 10],   hard: [20, 40] },
  },
  {
    type: 'loot_rare_plus', name: 'Collecteur', emoji: '🎁',
    descFn: t => `Loot ${t} objets rare ou mieux`,
    targets: { easy: [5, 15],    medium: [40, 100], hard: [200, 500] },
  },
  {
    type: 'loot_legendary', name: 'Légendes', emoji: '🔥',
    descFn: t => `Loot ${t} objets légendaires`,
    targets: { easy: [1, 3],     medium: [5, 12],   hard: [25, 50] },
  },
  {
    type: 'reach_floor', name: 'Explorateur', emoji: '🗺',
    descFn: t => `Atteins l'étage ${t}`,
    targets: { easy: [5, 15],    medium: [25, 50],  hard: [80, 150] },
    isAbsolute: true,
  },
  {
    type: 'use_forge', name: 'Forgeron', emoji: '⚒',
    descFn: t => `Utilise la forge ${t} fois`,
    targets: { easy: [3, 10],    medium: [20, 50],  hard: [100, 200] },
  },
  {
    type: 'open_chests', name: 'Ouvreur', emoji: '📦',
    descFn: t => `Ouvre ${t} coffres`,
    targets: { easy: [20, 60],   medium: [150, 400],hard: [800, 1500] },
  },
  {
    type: 'sell_items', name: 'Marchand', emoji: '💰',
    descFn: t => `Vends ${t} objets`,
    targets: { easy: [10, 30],   medium: [80, 200], hard: [400, 800] },
  },
  {
    type: 'ascend_count', name: 'Ascétique', emoji: '🌟',
    descFn: t => `Effectue ${t} ascension${t > 1 ? 's' : ''}`,
    targets: { easy: [1, 1],     medium: [2, 3],    hard: [5, 8] },
    isAbsolute: true,
  },
];

const DIFFICULTY_REWARDS = {
  easy:   { goldMin: 200,   goldMax: 2000,   orbCount: 1, talents: 0, color: '#6acc6a' },
  medium: { goldMin: 5000,  goldMax: 30000,  orbCount: 2, talents: 0, color: '#ffe14a' },
  hard:   { goldMin: 80000, goldMax: 500000, orbCount: 4, talents: 1, color: '#ff7a1a' },
};

export const REROLL_COST_GOLD = 5000;

const handlers = new Set();
export function onBountyComplete(fn) { handlers.add(fn); }

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

function generateReward(difficulty) {
  const cfg = DIFFICULTY_REWARDS[difficulty];
  const gold = randInt(cfg.goldMin, cfg.goldMax);
  const orbs = {};
  // Weight orbs by drop rarity (rarer orbs = less likely in rewards)
  const orbPool = CURRENCY_TYPES.map(c => ({ value: c.id, weight: c.baseDropChance * 1000 }));
  for (let i = 0; i < cfg.orbCount; i++) {
    const orbId = pickWeighted(orbPool);
    orbs[orbId] = (orbs[orbId] || 0) + 1;
  }
  return { gold, orbs, talents: cfg.talents };
}

function generateBounty(excludeTypes = []) {
  const difficulty = pickWeighted([
    { value: 'easy',   weight: 4 },
    { value: 'medium', weight: 4 },
    { value: 'hard',   weight: 2 },
  ]);
  // Avoid duplicates among active bounties
  const pool = BOUNTY_TYPES.filter(t => !excludeTypes.includes(t.type));
  const tpl = pickRandom(pool.length ? pool : BOUNTY_TYPES);
  const [tMin, tMax] = tpl.targets[difficulty];
  let target = randInt(tMin, tMax);
  let progress = 0;
  if (tpl.isAbsolute) {
    if (tpl.type === 'reach_floor') {
      const current = state.combat?.highestUnlocked || 1;
      target = Math.max(target, current + Math.ceil(target * 0.5));
      progress = current;
    } else if (tpl.type === 'ascend_count') {
      const current = state.prestige?.totalAscensions || 0;
      target = current + target;
      progress = current;
    }
  }
  return {
    id: `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type: tpl.type,
    name: tpl.name,
    emoji: tpl.emoji,
    desc: tpl.descFn(target),
    target,
    progress,
    difficulty,
    diffColor: DIFFICULTY_REWARDS[difficulty].color,
    reward: generateReward(difficulty),
    completed: false,
  };
}

export function refreshBoardIfEmpty() {
  if (!state.bounties) state.bounties = { active: [], completed: 0 };
  while (state.bounties.active.length < maxBountySlots()) {
    const excludeTypes = state.bounties.active.map(b => b.type);
    state.bounties.active.push(generateBounty(excludeTypes));
  }
  notify();
}

function grantReward(reward) {
  state.gold += reward.gold;
  for (const [orbId, q] of Object.entries(reward.orbs)) {
    state.orbs[orbId] = (state.orbs[orbId] || 0) + q;
  }
  if (reward.talents) state.talentPoints = (state.talentPoints || 0) + reward.talents;
}

function completeBounty(b) {
  if (b.completed) return;
  b.completed = true;
  state.bounties.completed += 1;
  grantReward(b.reward);
  for (const fn of handlers) fn(b);
  // Replace after a short delay (handled by caller polling state, but we set a flag)
  // The caller should call refreshBoardIfEmpty() to fill the slot.
  setTimeout(() => {
    if (!state.bounties) return;
    const idx = state.bounties.active.findIndex(x => x.id === b.id);
    if (idx >= 0) {
      const excludeTypes = state.bounties.active.filter(x => x.id !== b.id).map(x => x.type);
      state.bounties.active[idx] = generateBounty(excludeTypes);
      notify();
    }
  }, 1500);
}

export function trackProgress(type, amount = 1) {
  refreshBoardIfEmpty();
  let any = false;
  for (const b of state.bounties.active) {
    if (b.type !== type || b.completed) continue;
    b.progress = Math.min(b.target, b.progress + amount);
    any = true;
    if (b.progress >= b.target) completeBounty(b);
  }
  if (any) notify();
}

// For absolute-progress bounties (reach_floor, ascend_count): re-sync against current state.
export function syncAbsoluteProgress() {
  if (!state.bounties) return;
  let any = false;
  for (const b of state.bounties.active) {
    if (b.completed) continue;
    if (b.type === 'reach_floor') {
      const v = state.combat?.highestUnlocked || 1;
      if (v !== b.progress) { b.progress = Math.min(b.target, v); any = true; }
      if (b.progress >= b.target) completeBounty(b);
    } else if (b.type === 'ascend_count') {
      const v = state.prestige?.totalAscensions || 0;
      if (v !== b.progress) { b.progress = Math.min(b.target, v); any = true; }
      if (b.progress >= b.target) completeBounty(b);
    }
  }
  if (any) notify();
}

export function rerollCost() { return Math.round(REROLL_COST_GOLD * villageRerollMult()); }
export function rerollBounty(bountyId) {
  const cost = rerollCost();
  if ((state.gold || 0) < cost) return false;
  if (!state.bounties) return false;
  const idx = state.bounties.active.findIndex(b => b.id === bountyId);
  if (idx < 0) return false;
  state.gold -= cost;
  const excludeTypes = state.bounties.active.filter((_, i) => i !== idx).map(b => b.type);
  state.bounties.active[idx] = generateBounty(excludeTypes);
  notify();
  return true;
}
