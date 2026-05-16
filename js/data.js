// Static game data: rarities, slots, item bases, affix pools, chest tiers.

export const RARITIES = [
  { id: 'common',    name: 'Commun',     color: '#9aa0a6', cssClass: 'common',    affixes: 0, statMult: 1.0,  goldMult: 1,  weightKey: 'common' },
  { id: 'magic',     name: 'Magique',    color: '#4a9ef5', cssClass: 'magic',     affixes: 1, statMult: 1.3,  goldMult: 3,  weightKey: 'magic' },
  { id: 'rare',      name: 'Rare',       color: '#ffe14a', cssClass: 'rare',      affixes: 2, statMult: 1.7,  goldMult: 8,  weightKey: 'rare' },
  { id: 'epic',      name: 'Épique',     color: '#b35bd6', cssClass: 'epic',      affixes: 3, statMult: 2.3,  goldMult: 22, weightKey: 'epic' },
  { id: 'legendary', name: 'Légendaire', color: '#ff7a1a', cssClass: 'legendary', affixes: 4, statMult: 3.2,  goldMult: 60, weightKey: 'legendary' },
  { id: 'ancestral', name: 'Ancestral',  color: '#ff3050', cssClass: 'ancestral', affixes: 4, statMult: 4.8,  goldMult: 180,weightKey: 'ancestral' },
];

export const RARITY_BY_ID = Object.fromEntries(RARITIES.map(r => [r.id, r]));

// Equipment slots — order matters for the equipment grid (3 cols)
export const SLOTS = [
  { id: 'helmet',   name: 'Casque',  emptyEmoji: '🪖' },
  { id: 'armor',    name: 'Armure',  emptyEmoji: '👕' },
  { id: 'amulet',   name: 'Amulette',emptyEmoji: '📿' },
  { id: 'weapon',   name: 'Arme',    emptyEmoji: '⚔️' },
  { id: 'shield',   name: 'Bouclier',emptyEmoji: '🛡️' },
  { id: 'ring',     name: 'Anneau',  emptyEmoji: '💍' },
];

export const SLOT_BY_ID = Object.fromEntries(SLOTS.map(s => [s.id, s]));

// Base item types per slot. Each one has an emoji + base stats template (per tier).
// baseStats values are PER TIER 1 and scale up.
export const BASE_TYPES = {
  helmet: [
    { id: 'cap',     name: 'Casquette',     emoji: '🧢', baseStats: { armor: 4,  vitality: 2 } },
    { id: 'helm',    name: 'Heaume',        emoji: '🪖', baseStats: { armor: 6,  vitality: 1 } },
    { id: 'crown',   name: 'Couronne',      emoji: '👑', baseStats: { armor: 3,  vitality: 5 } },
  ],
  armor: [
    { id: 'tunic',   name: 'Tunique',       emoji: '👕', baseStats: { armor: 7,  vitality: 4 } },
    { id: 'plate',   name: 'Plastron',      emoji: '🦺', baseStats: { armor: 11, vitality: 2 } },
    { id: 'robe',    name: 'Robe',          emoji: '🥋', baseStats: { armor: 5,  vitality: 8 } },
  ],
  weapon: [
    { id: 'sword',   name: 'Épée',          emoji: '⚔️', baseStats: { damage: 8 } },
    { id: 'axe',     name: 'Hache',         emoji: '🪓', baseStats: { damage: 11 } },
    { id: 'bow',     name: 'Arc',           emoji: '🏹', baseStats: { damage: 7 } },
    { id: 'wand',    name: 'Baguette',      emoji: '🪄', baseStats: { damage: 9 } },
    { id: 'dagger',  name: 'Dague',         emoji: '🗡️', baseStats: { damage: 6 } },
  ],
  shield: [
    { id: 'buckler', name: 'Targe',         emoji: '🛡️', baseStats: { armor: 9 } },
    { id: 'tower',   name: 'Pavois',        emoji: '🛡', baseStats: { armor: 14, vitality: 1 } },
  ],
  ring: [
    { id: 'band',    name: 'Anneau',        emoji: '💍', baseStats: {} },
    { id: 'signet',  name: 'Chevalière',    emoji: '💎', baseStats: {} },
  ],
  amulet: [
    { id: 'pendant', name: 'Pendentif',     emoji: '📿', baseStats: {} },
    { id: 'talisman',name: 'Talisman',      emoji: '🧿', baseStats: {} },
  ],
};

// Affix pool — each affix has a stat key, a label, a range per tier, and a flag if percent
export const AFFIXES = [
  { id: 'vit',     stat: 'vitality',  label: 'Vie',          min: 3,  max: 8,  percent: false },
  { id: 'dmg',     stat: 'damage',    label: 'Dégâts',       min: 2,  max: 6,  percent: false },
  { id: 'arm',     stat: 'armor',     label: 'Armure',       min: 2,  max: 5,  percent: false },
  { id: 'crit',    stat: 'crit',      label: 'Crit',         min: 1,  max: 4,  percent: true  },
  { id: 'fire',    stat: 'fireDmg',   label: 'Dégâts feu',   min: 2,  max: 6,  percent: true  },
  { id: 'gold',    stat: 'goldFind',  label: 'Or trouvé',    min: 3,  max: 9,  percent: true  },
  { id: 'spd',     stat: 'speed',     label: 'Vitesse',      min: 1,  max: 3,  percent: true  },
];

// Random adjectives for procedural item names
export const NAME_PREFIXES = [
  'Brûlant', 'Maudit', 'Vorace', 'Sanglant', 'Givré', 'Sacré', 'Ancien',
  'Spectral', 'Foudroyant', 'Brillant', 'Cruel', 'Royal', 'Sauvage', 'Astral',
];
export const NAME_SUFFIXES = [
  'du Dragon', 'de l\'Ombre', 'des Ténèbres', 'du Roi', 'du Titan', 'des Cieux',
  'de la Lune', 'du Loup', 'du Néant', 'de la Tempête', 'du Sage',
];

// Chest tiers. Each tier defines drop weights and upgrade cost to NEXT tier.
export const CHEST_TIERS = [
  { tier: 1, name: 'Bois',      emoji: '📦', weights: { common: 75, magic: 23, rare:  2, epic:  0, legendary: 0, ancestral: 0 }, upgradeCost: 250 },
  { tier: 2, name: 'Fer',       emoji: '🗃', weights: { common: 45, magic: 38, rare: 14, epic:  3, legendary: 0, ancestral: 0 }, upgradeCost: 1500 },
  { tier: 3, name: 'Or',        emoji: '🏆', weights: { common: 20, magic: 35, rare: 30, epic: 12, legendary: 3, ancestral: 0 }, upgradeCost: 8000 },
  { tier: 4, name: 'Mythique',  emoji: '🎁', weights: { common:  5, magic: 25, rare: 35, epic: 25, legendary: 9, ancestral: 1 }, upgradeCost: 40000 },
  { tier: 5, name: 'Ancestral', emoji: '⚱',  weights: { common:  0, magic: 10, rare: 25, epic: 35, legendary: 20, ancestral: 10 }, upgradeCost: null },
];

export const CHEST_OPEN_COOLDOWN_MS = 800;

// Pity timer: every N non-legendary+ drops, force a legendary on the next chest open.
export const PITY_THRESHOLD = 50;

// Monsters for the dungeon. Stats are TIER 1 baseline, scaled by floor.
export const MONSTER_TYPES = [
  { name: 'Gobelin',        emoji: '👺', hpBase: 30, dmgBase: 4,  armorBase: 1, goldBase: 8  },
  { name: 'Squelette',      emoji: '💀', hpBase: 25, dmgBase: 5,  armorBase: 0, goldBase: 10 },
  { name: 'Slime',          emoji: '🟢', hpBase: 55, dmgBase: 3,  armorBase: 3, goldBase: 12 },
  { name: 'Loup',           emoji: '🐺', hpBase: 35, dmgBase: 6,  armorBase: 1, goldBase: 9  },
  { name: 'Araignée',       emoji: '🕷', hpBase: 28, dmgBase: 7,  armorBase: 0, goldBase: 11 },
  { name: 'Chauve-souris',  emoji: '🦇', hpBase: 22, dmgBase: 5,  armorBase: 0, goldBase: 8  },
  { name: 'Orc',            emoji: '👹', hpBase: 45, dmgBase: 7,  armorBase: 2, goldBase: 13 },
  { name: 'Zombie',         emoji: '🧟', hpBase: 50, dmgBase: 5,  armorBase: 1, goldBase: 11 },
  { name: 'Bandit',         emoji: '🥷', hpBase: 32, dmgBase: 8,  armorBase: 1, goldBase: 14 },
];

// Bosses appear every 5 floors. Stats much higher + guaranteed drop.
export const BOSS_TYPES = [
  { name: 'Dragon',           emoji: '🐉', hpBase: 120, dmgBase: 12, armorBase: 5, goldBase: 100 },
  { name: 'Seigneur Démon',   emoji: '😈', hpBase: 100, dmgBase: 15, armorBase: 3, goldBase: 120 },
  { name: 'Archisorcier',     emoji: '🧙', hpBase: 80,  dmgBase: 18, armorBase: 2, goldBase: 130 },
  { name: 'Cyclope',          emoji: '👁', hpBase: 150, dmgBase: 10, armorBase: 6, goldBase: 110 },
  { name: 'Liche',            emoji: '☠', hpBase: 90,  dmgBase: 16, armorBase: 4, goldBase: 125 },
  { name: 'Hydre',            emoji: '🐲', hpBase: 140, dmgBase: 13, armorBase: 4, goldBase: 135 },
];

// Player base stats (without equipment)
export const PLAYER_BASE = {
  hp: 100,
  damage: 5,
  armor: 0,
};


// Auto-sell unlock costs (per rarity). Common is free from start.
export const AUTOSELL_UNLOCK_COSTS = {
  common: 0,
  magic: 500,
  rare: 5000,
  epic: 30000,
  legendary: 200000,
  ancestral: null,    // never auto-sell ancestrals
};

// Power Score weights for total character stats
export const POWER_WEIGHTS = {
  damage: 2.5,
  armor: 1.5,
  vitality: 1.0,
  crit: 3,
  fireDmg: 1.5,
  goldFind: 0.5,
  speed: 1.2,
};
