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

// Affix pool — each affix has a stat key, a label, a range per tier, percent flag, and a TYPE (prefix/suffix).
// Prefixes are typically additive offensive/defensive mods. Suffixes are utility/ratio mods.
export const AFFIXES = [
  { id: 'vit',     stat: 'vitality',  label: 'Vie',          min: 3,  max: 8,  percent: false, type: 'suffix', tags: ['life'] },
  { id: 'dmg',     stat: 'damage',    label: 'Dégâts',       min: 2,  max: 6,  percent: false, type: 'prefix', tags: ['attack', 'physical'] },
  { id: 'arm',     stat: 'armor',     label: 'Armure',       min: 2,  max: 5,  percent: false, type: 'prefix', tags: ['defense'] },
  { id: 'crit',    stat: 'crit',      label: 'Crit',         min: 1,  max: 4,  percent: true,  type: 'suffix', tags: ['attack', 'critical'] },
  { id: 'fire',    stat: 'fireDmg',   label: 'Dégâts feu',   min: 2,  max: 6,  percent: true,  type: 'prefix', tags: ['attack', 'elemental', 'fire'] },
  { id: 'gold',    stat: 'goldFind',  label: 'Or trouvé',    min: 3,  max: 9,  percent: true,  type: 'suffix', tags: ['utility', 'gold'] },
  { id: 'spd',     stat: 'speed',     label: 'Vitesse',      min: 1,  max: 3,  percent: true,  type: 'suffix', tags: ['utility', 'speed'] },
];

export const AFFIXES_BY_ID = Object.fromEntries(AFFIXES.map(a => [a.id, a]));

// Per-rarity max affixes by type. Drops will roll up to RARITY.affixes total (default count),
// crafting (augm/exil/maître) can grow up to these caps.
export const AFFIX_LIMITS = {
  common:    { prefix: 0, suffix: 0 },
  magic:     { prefix: 1, suffix: 1 },
  rare:      { prefix: 2, suffix: 2 },
  epic:      { prefix: 2, suffix: 2 },
  legendary: { prefix: 3, suffix: 3 },
  ancestral: { prefix: 3, suffix: 3 },
};

// Random adjectives for procedural item names
export const NAME_PREFIXES = [
  'Brûlant', 'Maudit', 'Vorace', 'Sanglant', 'Givré', 'Sacré', 'Ancien',
  'Spectral', 'Foudroyant', 'Brillant', 'Cruel', 'Royal', 'Sauvage', 'Astral',
];
export const NAME_SUFFIXES = [
  'du Dragon', 'de l\'Ombre', 'des Ténèbres', 'du Roi', 'du Titan', 'des Cieux',
  'de la Lune', 'du Loup', 'du Néant', 'de la Tempête', 'du Sage',
];

// Chest tiers. T1-T5 are default; T6-T10 require corresponding prestige level.
export const CHEST_TIERS = [
  { tier: 1,  name: 'Bois',       emoji: '📦', weights: { common: 75, magic: 23, rare:  2, epic:  0, legendary:  0, ancestral:  0 }, upgradeCost: 250 },
  { tier: 2,  name: 'Fer',        emoji: '🗃', weights: { common: 45, magic: 38, rare: 14, epic:  3, legendary:  0, ancestral:  0 }, upgradeCost: 1500 },
  { tier: 3,  name: 'Or',         emoji: '🏆', weights: { common: 20, magic: 35, rare: 30, epic: 12, legendary:  3, ancestral:  0 }, upgradeCost: 8000 },
  { tier: 4,  name: 'Mythique',   emoji: '🎁', weights: { common:  5, magic: 25, rare: 35, epic: 25, legendary:  9, ancestral:  1 }, upgradeCost: 40000 },
  { tier: 5,  name: 'Ancestral',  emoji: '⚱',  weights: { common:  0, magic: 10, rare: 25, epic: 35, legendary: 20, ancestral: 10 }, upgradeCost: 250000 },
  { tier: 6,  name: 'Stellaire',  emoji: '✨', weights: { common:  0, magic:  5, rare: 18, epic: 32, legendary: 28, ancestral: 17 }, upgradeCost: 1500000,   prestigeReq: 1 },
  { tier: 7,  name: 'Cosmique',   emoji: '🌠', weights: { common:  0, magic:  0, rare: 12, epic: 28, legendary: 35, ancestral: 25 }, upgradeCost: 8000000,   prestigeReq: 2 },
  { tier: 8,  name: 'Vide',       emoji: '🕳', weights: { common:  0, magic:  0, rare:  6, epic: 22, legendary: 38, ancestral: 34 }, upgradeCost: 40000000,  prestigeReq: 3 },
  { tier: 9,  name: 'Primordial', emoji: '🌌', weights: { common:  0, magic:  0, rare:  2, epic: 15, legendary: 38, ancestral: 45 }, upgradeCost: 200000000, prestigeReq: 4 },
  { tier: 10, name: 'Divin',      emoji: '☀',  weights: { common:  0, magic:  0, rare:  0, epic:  8, legendary: 32, ancestral: 60 }, upgradeCost: null,      prestigeReq: 5 },
];

export function maxAllowedChestTier(prestigeLevel) {
  return Math.min(10, 5 + (prestigeLevel || 0));
}

// === Talents ===
// Per-rank passive bonuses. Points earned via ascension (2 per) and dungeon milestones (1 per).
export const TALENTS = [
  { id: 'merchant',       emoji: '💰', name: 'Marchand habile',     desc: '+10% prix de vente par rang',           maxRank: 5, perRank: { sellMult: 0.10 },         category: 'wealth' },
  { id: 'sharpEye',       emoji: '👁',  name: 'Œil aiguisé',         desc: '+5% poids des raretés rare+ par rang',  maxRank: 5, perRank: { rareMult: 0.05 },         category: 'wealth' },
  { id: 'berserker',      emoji: '⚔',  name: 'Berserker',           desc: '+10% dégâts en donjon par rang',        maxRank: 5, perRank: { dmgMult: 0.10 },          category: 'combat' },
  { id: 'tanky',          emoji: '❤',  name: 'Endurci',             desc: '+15% PV max par rang',                  maxRank: 5, perRank: { hpMult: 0.15 },           category: 'combat' },
  { id: 'treasureHunter', emoji: '💎', name: 'Chasseur de trésors', desc: '+25% or des monstres par rang',         maxRank: 4, perRank: { monsterGoldMult: 0.25 }, category: 'wealth' },
  { id: 'orbFinder',      emoji: '🟪', name: 'Trouveur d\'orbes',   desc: '+15% drop d\'orbes par rang',           maxRank: 4, perRank: { orbDropMult: 0.15 },     category: 'utility' },
  { id: 'recycler',       emoji: '♻',  name: 'Recycleur',           desc: '+1 cristal par recyclage par rang',     maxRank: 3, perRank: { shardBonus: 1 },         category: 'utility' },
  { id: 'pityMaster',     emoji: '✨', name: 'Maître pity',         desc: '-10 au pity timer par rang',            maxRank: 3, perRank: { pityReduction: 10 },     category: 'utility' },
];

// Talent categories — investing 5+ points in one grants a 10% mastery bonus to that category.
export const TALENT_CATEGORIES = {
  combat:  { emoji: '⚔', name: 'Combat',     color: '#ff7a1a', desc: '+10% effets combat (dégâts, PV) si ≥ 5 points' },
  wealth:  { emoji: '💰', name: 'Richesse',   color: '#ffe14a', desc: '+10% effets richesse (or, drops) si ≥ 5 points' },
  utility: { emoji: '🔮', name: 'Utilitaire', color: '#5a8af0', desc: '+10% effets utilitaires (orbes, cristaux, pity) si ≥ 5 points' },
};
export const TALENT_MASTERY_THRESHOLD = 5;
export const TALENT_MASTERY_BONUS = 0.10;

export const TALENT_BY_ID = Object.fromEntries(TALENTS.map(t => [t.id, t]));

export const CHEST_OPEN_COOLDOWN_MS = 800;

// Pity timer: every N non-legendary+ drops, force a legendary on the next chest open.
export const PITY_THRESHOLD = 50;

// Biomes for the dungeon. Each biome covers a floor range and has its own monsters + boss.
export const BIOMES = [
  {
    id: 'forest', name: 'Forêt', emoji: '🌲', floors: [1, 10],
    bgGradient: 'linear-gradient(135deg, #1a3a1a, #2a4a2a)',
    monsters: [
      { name: 'Gobelin',        emoji: '👺', hpBase: 30, dmgBase: 4, armorBase: 1, goldBase: 8 },
      { name: 'Loup',           emoji: '🐺', hpBase: 35, dmgBase: 6, armorBase: 1, goldBase: 9 },
      { name: 'Araignée',       emoji: '🕷', hpBase: 28, dmgBase: 7, armorBase: 0, goldBase: 11 },
      { name: 'Ours',           emoji: '🐻', hpBase: 55, dmgBase: 5, armorBase: 2, goldBase: 12 },
      { name: 'Plante carnivore', emoji: '🌵', hpBase: 40, dmgBase: 4, armorBase: 1, goldBase: 10 },
    ],
    boss: { name: 'Roi Sylvain',  emoji: '🌳', hpBase: 140, dmgBase: 11, armorBase: 4, goldBase: 100,
            mechanic: { type: 'regen', percentPerTurn: 0.05, desc: 'Régénère 5% PV par tour' } },
  },
  {
    id: 'cave', name: 'Cavernes', emoji: '🪨', floors: [11, 20],
    bgGradient: 'linear-gradient(135deg, #2a2418, #3a3424)',
    monsters: [
      { name: 'Chauve-souris',  emoji: '🦇', hpBase: 25, dmgBase: 6, armorBase: 0, goldBase: 10 },
      { name: 'Squelette',      emoji: '💀', hpBase: 30, dmgBase: 5, armorBase: 1, goldBase: 11 },
      { name: 'Slime',          emoji: '🟢', hpBase: 60, dmgBase: 3, armorBase: 4, goldBase: 13 },
      { name: 'Troll',          emoji: '👹', hpBase: 55, dmgBase: 8, armorBase: 3, goldBase: 14 },
      { name: 'Golem de pierre',emoji: '🗿', hpBase: 70, dmgBase: 6, armorBase: 5, goldBase: 15 },
    ],
    boss: { name: 'Hydre des Profondeurs', emoji: '🐲', hpBase: 160, dmgBase: 13, armorBase: 5, goldBase: 130,
            mechanic: { type: 'enrage', triggerHpPct: 0.30, dmgMult: 2.0, desc: 'En rage sous 30% PV : ×2 dégâts' } },
  },
  {
    id: 'castle', name: 'Château', emoji: '🏰', floors: [21, 30],
    bgGradient: 'linear-gradient(135deg, #2a1a3a, #3a2a4a)',
    monsters: [
      { name: 'Zombie',         emoji: '🧟', hpBase: 50, dmgBase: 6, armorBase: 1, goldBase: 13 },
      { name: 'Bandit',         emoji: '🥷', hpBase: 35, dmgBase: 9, armorBase: 1, goldBase: 15 },
      { name: 'Spectre',        emoji: '👻', hpBase: 30, dmgBase: 10, armorBase: 0, goldBase: 14 },
      { name: 'Garde Maudit',   emoji: '⚔',  hpBase: 45, dmgBase: 8, armorBase: 3, goldBase: 16 },
      { name: 'Sorcier',        emoji: '🧙', hpBase: 32, dmgBase: 11, armorBase: 0, goldBase: 18 },
    ],
    boss: { name: 'Roi Mort',   emoji: '☠', hpBase: 130, dmgBase: 16, armorBase: 4, goldBase: 160,
            mechanic: { type: 'shieldCycle', everyTurns: 3, desc: 'Immunise 1 tour sur 3' } },
  },
  {
    id: 'hell', name: 'Enfer', emoji: '🔥', floors: [31, 40],
    bgGradient: 'linear-gradient(135deg, #3a1408, #5a2814)',
    monsters: [
      { name: 'Diablotin',      emoji: '😈', hpBase: 32, dmgBase: 12, armorBase: 0, goldBase: 18 },
      { name: 'Démonette',      emoji: '👹', hpBase: 40, dmgBase: 11, armorBase: 2, goldBase: 17 },
      { name: 'Cerbère',        emoji: '🐶', hpBase: 55, dmgBase: 10, armorBase: 3, goldBase: 19 },
      { name: 'Incube',         emoji: '😺', hpBase: 30, dmgBase: 14, armorBase: 0, goldBase: 20 },
      { name: 'Démon de Lave',  emoji: '🌋', hpBase: 70, dmgBase: 10, armorBase: 4, goldBase: 22 },
    ],
    boss: { name: 'Seigneur Démon', emoji: '😈', hpBase: 150, dmgBase: 20, armorBase: 4, goldBase: 220,
            mechanic: { type: 'burn', dmgPerTurn: 8, desc: 'Brûlure : 8 dmg/tour passifs' } },
  },
  {
    id: 'void', name: 'Néant', emoji: '🌌', floors: [41, 9999],
    bgGradient: 'linear-gradient(135deg, #1a0838, #2a1448)',
    monsters: [
      { name: 'Ombre',          emoji: '🌑', hpBase: 50, dmgBase: 14, armorBase: 3, goldBase: 24 },
      { name: 'Horreur',        emoji: '👁', hpBase: 65, dmgBase: 13, armorBase: 4, goldBase: 26 },
      { name: 'Wraith',         emoji: '👤', hpBase: 45, dmgBase: 16, armorBase: 2, goldBase: 25 },
      { name: 'Tentacule',      emoji: '🐙', hpBase: 75, dmgBase: 12, armorBase: 5, goldBase: 27 },
      { name: 'Vide-marcheur',  emoji: '👽', hpBase: 60, dmgBase: 15, armorBase: 3, goldBase: 28 },
    ],
    boss: { name: 'Maître du Néant', emoji: '🌀', hpBase: 200, dmgBase: 22, armorBase: 6, goldBase: 320,
            mechanic: { type: 'phaseShift', everyTurns: 4, dmgMult: 1.5, desc: 'Phase 1/4 tours : ×1.5 dmg' } },
  },
];

export function biomeForFloor(floor) {
  for (const b of BIOMES) {
    if (floor >= b.floors[0] && floor <= b.floors[1]) return b;
  }
  return BIOMES[BIOMES.length - 1];
}

// === Monster affixes ===
// Combat modifiers rolled on elites (always) and on deeper normal monsters
// (chance scales with floor). They reuse the boss `mechanic` engine in combat.js
// plus three monster-only behaviours (thorns / lifesteal / swift).
// `build(ctx)` receives { dmg } (the monster's scaled damage) and returns a
// mechanic object consumed by resolveFight. Each carries icon/name/desc for UI.
export const MONSTER_AFFIXES = [
  { id: 'regenerant', icon: '🔄', name: 'Régénérant',
    build: () => ({ type: 'regen', percentPerTurn: 0.04, icon: '🔄', name: 'Régénérant', desc: 'Régénère 4% PV/tour' }) },
  { id: 'enrage', icon: '💢', name: 'Enragé',
    build: () => ({ type: 'enrage', triggerHpPct: 0.35, dmgMult: 1.6, icon: '💢', name: 'Enragé', desc: '×1.6 dégâts sous 35% PV' }) },
  { id: 'blinde', icon: '🛡', name: 'Blindé',
    build: () => ({ type: 'shieldCycle', everyTurns: 4, icon: '🛡', name: 'Blindé', desc: 'Immunise 1 tour sur 4' }) },
  { id: 'brulant', icon: '🔥', name: 'Brûlant',
    build: ({ dmg }) => ({ type: 'burn', dmgPerTurn: Math.max(2, Math.round(dmg * 0.25)), icon: '🔥', name: 'Brûlant', desc: `Brûlure ${Math.max(2, Math.round(dmg * 0.25))} dmg/tour` }) },
  { id: 'instable', icon: '🌀', name: 'Instable',
    build: () => ({ type: 'phaseShift', everyTurns: 4, dmgMult: 1.4, icon: '🌀', name: 'Instable', desc: '×1.4 dégâts tous les 4 tours' }) },
  { id: 'epineux', icon: '🌵', name: 'Épineux',
    build: () => ({ type: 'thorns', reflectPct: 0.25, icon: '🌵', name: 'Épineux', desc: 'Renvoie 25% de tes coups' }) },
  { id: 'vampirique', icon: '🩸', name: 'Vampirique',
    build: () => ({ type: 'lifesteal', pct: 0.4, icon: '🩸', name: 'Vampirique', desc: 'Se soigne de 40% de ses dégâts' }) },
  { id: 'veloce', icon: '⚡', name: 'Véloce',
    build: () => ({ type: 'swift', chance: 0.30, icon: '⚡', name: 'Véloce', desc: '30% de frapper deux fois' }) },
];

// Player base stats (without equipment)
export const PLAYER_BASE = {
  hp: 100,
  damage: 5,
  armor: 0,
};

// === Achievements ===
// Each: { id, name, desc, emoji, check(state) => bool, reward: { gold } }
export const ACHIEVEMENTS = [
  { id: 'first_chest',    emoji: '📦', name: 'Premier coffre',     desc: 'Ouvre 1 coffre',           check: s => s.opened >= 1,                 reward: { gold: 50 } },
  { id: 'open_100',       emoji: '📦', name: 'Collectionneur',     desc: 'Ouvre 100 coffres',        check: s => s.opened >= 100,               reward: { gold: 500 } },
  { id: 'open_1000',      emoji: '📦', name: 'Trésorier',          desc: 'Ouvre 1000 coffres',       check: s => s.opened >= 1000,              reward: { gold: 5000 } },
  { id: 'tier_2',         emoji: '🗃', name: 'Coffre de fer',      desc: 'Atteins le tier 2',        check: s => s.chestTier >= 2,              reward: { gold: 200 } },
  { id: 'tier_3',         emoji: '🏆', name: 'Coffre d\'or',       desc: 'Atteins le tier 3',        check: s => s.chestTier >= 3,              reward: { gold: 1000 } },
  { id: 'tier_4',         emoji: '🎁', name: 'Coffre mythique',    desc: 'Atteins le tier 4',        check: s => s.chestTier >= 4,              reward: { gold: 5000 } },
  { id: 'tier_5',         emoji: '⚱',  name: 'Coffre ancestral',   desc: 'Atteins le tier 5',        check: s => s.chestTier >= 5,              reward: { gold: 25000 } },
  { id: 'tier_7',         emoji: '🌠', name: 'Coffre cosmique',     desc: 'Atteins le tier 7',        check: s => s.chestTier >= 7,              reward: { gold: 250000 } },
  { id: 'tier_10',        emoji: '☀',  name: 'Coffre divin',        desc: 'Atteins le tier 10 (max)', check: s => s.chestTier >= 10,             reward: { gold: 5000000 } },
  { id: 'first_legendary',emoji: '🔥', name: 'Légende vivante',    desc: 'Loote un objet légendaire',check: s => (s.stats?.legendaryDropped||0) >= 1, reward: { gold: 1000 } },
  { id: 'first_ancestral',emoji: '💀', name: 'Sang ancestral',     desc: 'Loote un ancestral',       check: s => (s.stats?.ancestralDropped||0) >= 1, reward: { gold: 10000 } },
  { id: 'sell_100',       emoji: '💰', name: 'Marchand',           desc: 'Vends 100 objets',         check: s => (s.stats?.itemsSold||0) >= 100, reward: { gold: 500 } },
  { id: 'sell_1000',      emoji: '💰', name: 'Magnat',             desc: 'Vends 1000 objets',        check: s => (s.stats?.itemsSold||0) >= 1000,reward: { gold: 5000 } },
  { id: 'first_kill',     emoji: '🗡', name: 'Premier sang',       desc: 'Tue 1 monstre',            check: s => (s.combat?.kills||0) >= 1,     reward: { gold: 50 } },
  { id: 'kill_100',       emoji: '🗡', name: 'Boucher',            desc: 'Tue 100 monstres',         check: s => (s.combat?.kills||0) >= 100,   reward: { gold: 1000 } },
  { id: 'kill_1000',      emoji: '🗡', name: 'Génocidaire',        desc: 'Tue 1000 monstres',        check: s => (s.combat?.kills||0) >= 1000,  reward: { gold: 10000 } },
  { id: 'first_boss',     emoji: '👑', name: 'Tueur de boss',      desc: 'Tue 1 boss',               check: s => (s.combat?.bossKills||0) >= 1, reward: { gold: 500 } },
  { id: 'boss_10',        emoji: '👑', name: 'Briseur de boss',    desc: 'Tue 10 boss',              check: s => (s.combat?.bossKills||0) >= 10,reward: { gold: 5000 } },
  { id: 'floor_10',       emoji: '🗺', name: 'Explorateur',        desc: 'Atteins l\'étage 10',      check: s => (s.combat?.highestUnlocked||1) >= 10, reward: { gold: 500 } },
  { id: 'floor_25',       emoji: '🗺', name: 'Aventurier',         desc: 'Atteins l\'étage 25',      check: s => (s.combat?.highestUnlocked||1) >= 25, reward: { gold: 2500 } },
  { id: 'floor_50',       emoji: '🗺', name: 'Héros',              desc: 'Atteins l\'étage 50',      check: s => (s.combat?.highestUnlocked||1) >= 50, reward: { gold: 10000 } },
  { id: 'fully_equipped', emoji: '🛡', name: 'Tout équipé',        desc: 'Équipe les 6 emplacements',check: s => Object.values(s.equipment).filter(Boolean).length >= 6, reward: { gold: 300 } },
  { id: 'rich_10k',       emoji: '🤑', name: 'Riche',              desc: 'Accumule 10 000 or',       check: s => s.gold >= 10000,               reward: { gold: 500 } },
  { id: 'rich_100k',      emoji: '🤑', name: 'Magnat de l\'or',    desc: 'Accumule 100 000 or',      check: s => s.gold >= 100000,              reward: { gold: 5000 } },
  { id: 'first_forge',    emoji: '⚒', name: 'Forgeron',           desc: 'Utilise la forge 1 fois',  check: s => (s.stats?.forgesPerformed||0) >= 1, reward: { gold: 200 } },
  { id: 'forge_50',       emoji: '⚒', name: 'Maître forgeron',    desc: 'Utilise la forge 50 fois', check: s => (s.stats?.forgesPerformed||0) >= 50,reward: { gold: 3000 } },
  { id: 'first_unique',   emoji: '✨', name: 'Trouvaille rare',     desc: 'Loote un objet unique',   check: s => (s.stats?.uniquesDropped||0) >= 1, reward: { gold: 2000 } },
  { id: 'first_set',      emoji: '🎭', name: 'Set partiel',         desc: 'Équipe 2 pièces du même set',check: s => (s.stats?.maxSetEquipped||0) >= 2, reward: { gold: 500 } },
  { id: 'full_set',       emoji: '🎭', name: 'Set complet',         desc: 'Équipe 4 pièces du même set',check: s => (s.stats?.maxSetEquipped||0) >= 4, reward: { gold: 5000 } },
  { id: 'first_ascend',   emoji: '🌟', name: 'Ascension',           desc: 'Effectue ta 1ère ascension',check: s => (s.prestige?.totalAscensions||0) >= 1, reward: { gold: 10000 } },
  { id: 'ascend_5',       emoji: '🌟', name: 'Ascensionné',         desc: 'Effectue 5 ascensions',   check: s => (s.prestige?.totalAscensions||0) >= 5, reward: { gold: 100000 } },
  { id: 'first_salvage',  emoji: '💎', name: 'Recycleur',           desc: 'Accumule 10 cristaux',    check: s => totalShards(s) >= 10,        reward: { gold: 200 } },
  { id: 'shard_100',      emoji: '💎', name: 'Collecte de cristaux',desc: 'Accumule 100 cristaux',    check: s => totalShards(s) >= 100,       reward: { gold: 1000 } },
  { id: 'shard_1000',     emoji: '💎', name: 'Maître alchimiste',   desc: 'Accumule 1 000 cristaux',  check: s => totalShards(s) >= 1000,      reward: { gold: 10000 } },
  { id: 'biome_cave',     emoji: '🪨', name: 'Spéléologue',         desc: 'Atteins les Cavernes (étage 11)',check: s => (s.combat?.highestUnlocked||1) >= 11, reward: { gold: 300 } },
  { id: 'biome_castle',   emoji: '🏰', name: 'Conquérant',          desc: 'Atteins le Château (étage 21)',  check: s => (s.combat?.highestUnlocked||1) >= 21, reward: { gold: 1500 } },
  { id: 'biome_hell',     emoji: '🔥', name: 'Damné',               desc: 'Atteins l\'Enfer (étage 31)',    check: s => (s.combat?.highestUnlocked||1) >= 31, reward: { gold: 5000 } },
  { id: 'biome_void',     emoji: '🌌', name: 'Au-delà',             desc: 'Atteins le Néant (étage 41)',    check: s => (s.combat?.highestUnlocked||1) >= 41, reward: { gold: 15000 } },
  { id: 'first_orb',      emoji: '🟢', name: 'Premier orbe',         desc: 'Trouve un orbe',                  check: s => totalOrbs(s) >= 1,            reward: { gold: 200 } },
  { id: 'orb_50',         emoji: '⚗', name: 'Alchimiste',           desc: 'Accumule 50 orbes',                check: s => totalOrbs(s) >= 50,           reward: { gold: 2000 } },
  { id: 'chaos_orb',      emoji: '🟠', name: 'Touche du Chaos',     desc: 'Trouve un Orbe du Chaos',          check: s => (s.orbs?.chaos||0) >= 1,      reward: { gold: 3000 } },
  { id: 'exil_orb',       emoji: '🔴', name: 'Touche de l\'Exilé',  desc: 'Trouve un Orbe d\'Exil',           check: s => (s.orbs?.exil||0) >= 1,       reward: { gold: 10000 } },
  { id: 'maitre_orb',     emoji: '🟪', name: 'Maître Forgeron',     desc: 'Trouve un Orbe Maître',            check: s => (s.orbs?.maitre||0) >= 1,     reward: { gold: 15000 } },
  { id: 'floor_100',      emoji: '🎯', name: 'Centenaire',          desc: 'Atteins l\'étage 100',             check: s => (s.combat?.highestUnlocked||1) >= 100, reward: { gold: 50000 } },
  { id: 'floor_250',      emoji: '🏆', name: 'Légende du Donjon',   desc: 'Atteins l\'étage 250',             check: s => (s.combat?.highestUnlocked||1) >= 250, reward: { gold: 250000 } },
  { id: 'codex_uniques',  emoji: '📖', name: 'Bibliothécaire',       desc: 'Découvre tous les uniques',        check: s => Object.keys(s.codex?.uniques || {}).length >= 10, reward: { gold: 50000 } },
  { id: 'codex_sets',     emoji: '📖', name: 'Collectionneur de sets', desc: 'Découvre tous les sets',         check: s => Object.keys(s.codex?.sets || {}).length >= 6,    reward: { gold: 30000 } },
  { id: 'codex_bosses',   emoji: '👑', name: 'Tueur de boss légendaire', desc: 'Tue tous les boss de biome',   check: s => Object.keys(s.codex?.bosses || {}).length >= 5,  reward: { gold: 100000 } },
  { id: 'skills_4',       emoji: '📜', name: 'Tacticien',           desc: 'Débloque 4 compétences de combat', check: s => skillsUnlocked(s) >= 4, reward: { gold: 10000 } },
  { id: 'skills_all',     emoji: '🥇', name: 'Maître tacticien',     desc: 'Débloque toutes les compétences',  check: s => skillsUnlocked(s) >= 8, reward: { gold: 100000 } },
  { id: 'bounty_10',      emoji: '📋', name: 'Contractuel',          desc: 'Complète 10 contrats',             check: s => (s.bounties?.completed || 0) >= 10,  reward: { gold: 5000 } },
  { id: 'bounty_100',     emoji: '📜', name: 'Mercenaire d\'élite',   desc: 'Complète 100 contrats',            check: s => (s.bounties?.completed || 0) >= 100, reward: { gold: 50000 } },
];

// Helper for skills achievements (avoids circular import; reimplements unlock checks).
function skillsUnlocked(s) {
  const eq = s.equipment || {};
  let vitality = 0, damage = 0, armor = 0, crit = 0, fireDmg = 0, speed = 0, goldFind = 0;
  for (const it of Object.values(eq)) {
    if (!it) continue;
    for (const [k, v] of Object.entries(it.baseStats || {})) {
      if (k === 'vitality') vitality += v;
      else if (k === 'damage') damage += v;
      else if (k === 'armor') armor += v;
      else if (k === 'crit') crit += v;
      else if (k === 'fireDmg') fireDmg += v;
      else if (k === 'speed') speed += v;
      else if (k === 'goldFind') goldFind += v;
    }
    for (const a of it.affixes || []) {
      if (a.stat === 'vitality') vitality += a.value;
      else if (a.stat === 'damage') damage += a.value;
      else if (a.stat === 'armor') armor += a.value;
      else if (a.stat === 'crit') crit += a.value;
      else if (a.stat === 'fireDmg') fireDmg += a.value;
      else if (a.stat === 'speed') speed += a.value;
      else if (a.stat === 'goldFind') goldFind += a.value;
    }
  }
  const t = s.talents || {};
  let n = 0;
  if (vitality >= 60) n++;
  if ((t.berserker || 0) >= 3) n++;
  if (fireDmg >= 30) n++;
  if (speed >= 25) n++;
  if (crit >= 30) n++;
  if (damage >= 80 || (t.berserker || 0) >= 5) n++;
  if (armor >= 40) n++;
  if (goldFind >= 30) n++;
  return n;
}

function totalOrbs(s) {
  if (!s.orbs) return 0;
  return Object.values(s.orbs).reduce((sum, n) => sum + (n || 0), 0);
}

function totalShards(s) {
  if (!s.shards) return 0;
  return Object.values(s.shards).reduce((sum, n) => sum + (n || 0), 0);
}

// === Forge costs ===
// Cost multipliers based on item.goldValue
export const FORGE_COSTS = {
  rerollMult: 1.5,      // reroll affixes
  upgradeTierMult: 4,   // upgrade chestTier
  transmuteMult: 6,     // upgrade rarity
};

// === Currencies (PoE-style orbs) ===
// Drop independently from item drops when opening chests.
export const CURRENCY_TYPES = [
  { id: 'transmu', name: 'Orbe de Transmutation', emoji: '🟢', color: '#6acc6a', desc: 'Transforme un objet commun en magique (+1 affixe)',  baseDropChance: 0.06 },
  { id: 'augm',    name: 'Orbe d\'Augmentation',  emoji: '🔵', color: '#4a9ef5', desc: 'Ajoute un affixe à un objet magique (max 2)',         baseDropChance: 0.045 },
  { id: 'alte',    name: 'Orbe d\'Altération',    emoji: '🟣', color: '#b35bd6', desc: 'Reroll complet d\'un objet magique',                  baseDropChance: 0.03 },
  { id: 'regal',   name: 'Orbe Régal',            emoji: '🟡', color: '#f5c842', desc: 'Transforme un magique en rare (+1 affixe)',           baseDropChance: 0.02 },
  { id: 'chaos',   name: 'Orbe du Chaos',         emoji: '🟠', color: '#ff7a1a', desc: 'Reroll complet d\'un objet rare ou plus',             baseDropChance: 0.012 },
  { id: 'divin',   name: 'Orbe Divin',            emoji: '⚪', color: '#e0e0ff', desc: 'Reroll les VALEURS des affixes (mêmes stats)',        baseDropChance: 0.006 },
  { id: 'exil',    name: 'Orbe d\'Exil',          emoji: '🔴', color: '#ff3050', desc: 'Ajoute un affixe à un rare+ (max +1)',                baseDropChance: 0.004 },
  { id: 'pierre',  name: 'Pierre de Forge',       emoji: '🪨', color: '#a07840', desc: 'Augmente le tier de l\'objet de +1 (max T5)',         baseDropChance: 0.01 },
  { id: 'maitre',  name: 'Orbe Maître',           emoji: '🟪', color: '#ff5fd0', desc: 'Ajoute un affixe AU CHOIX (respecte les limites prefix/suffix)', baseDropChance: 0.004 },
];

export const CURRENCY_BY_ID = Object.fromEntries(CURRENCY_TYPES.map(c => [c.id, c]));

// Number of additional affixes craftable beyond the rarity's default count.
export const MAX_BONUS_AFFIXES = 1;

// === Unique legendaries (hand-crafted, occasionally replace a random legendary) ===
export const UNIQUE_DROP_CHANCE = 0.3;

export const UNIQUE_LEGENDARIES = [
  {
    id: 'dragon_fang', slot: 'weapon', baseTypeId: 'sword', emoji: '🗡',
    name: 'Croc du Dragon Endormi',
    flavor: 'Forgé dans le souffle d\'un dragon millénaire.',
    baseStatBonus: { damage: 20 },
    fixedAffixes: [
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts',     value: 25, percent: false },
      { id: 'fire', stat: 'fireDmg',  label: 'Dégâts feu', value: 30, percent: true },
      { id: 'crit', stat: 'crit',     label: 'Crit',       value: 15, percent: true },
      { id: 'spd',  stat: 'speed',    label: 'Vitesse',    value: 8,  percent: true },
    ],
  },
  {
    id: 'merchant_ring', slot: 'ring', baseTypeId: 'signet', emoji: '💎',
    name: 'Anneau du Marchand Éternel',
    flavor: 'L\'or appelle l\'or.',
    fixedAffixes: [
      { id: 'gold', stat: 'goldFind', label: 'Or trouvé', value: 50, percent: true },
      { id: 'vit',  stat: 'vitality', label: 'Vie',       value: 20, percent: false },
      { id: 'crit', stat: 'crit',     label: 'Crit',      value: 10, percent: true },
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts',    value: 8,  percent: false },
    ],
  },
  {
    id: 'dead_king_crown', slot: 'helmet', baseTypeId: 'crown', emoji: '👑',
    name: 'Couronne du Roi Mort',
    flavor: 'Les morts gouvernent les vivants.',
    baseStatBonus: { armor: 15, vitality: 20 },
    fixedAffixes: [
      { id: 'vit',  stat: 'vitality', label: 'Vie',       value: 40, percent: false },
      { id: 'arm',  stat: 'armor',    label: 'Armure',    value: 12, percent: false },
      { id: 'gold', stat: 'goldFind', label: 'Or trouvé', value: 25, percent: true },
      { id: 'crit', stat: 'crit',     label: 'Crit',      value: 10, percent: true },
    ],
  },
  {
    id: 'eternal_aegis', slot: 'shield', baseTypeId: 'tower', emoji: '🛡',
    name: 'Pavois Éternel',
    flavor: 'Aucun coup ne le traversa jamais.',
    baseStatBonus: { armor: 25, vitality: 30 },
    fixedAffixes: [
      { id: 'arm',  stat: 'armor',    label: 'Armure',     value: 25, percent: false },
      { id: 'vit',  stat: 'vitality', label: 'Vie',        value: 50, percent: false },
      { id: 'fire', stat: 'fireDmg',  label: 'Dégâts feu', value: 15, percent: true },
    ],
  },
  {
    id: 'luck_charm', slot: 'amulet', baseTypeId: 'talisman', emoji: '🍀',
    name: 'Talisman de Chance Insolente',
    flavor: 'Certains naissent chanceux.',
    fixedAffixes: [
      { id: 'crit', stat: 'crit',     label: 'Crit',       value: 30, percent: true },
      { id: 'gold', stat: 'goldFind', label: 'Or trouvé',  value: 30, percent: true },
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts',     value: 10, percent: false },
      { id: 'spd',  stat: 'speed',    label: 'Vitesse',    value: 10, percent: true },
    ],
  },
  {
    id: 'shadow_garb', slot: 'armor', baseTypeId: 'robe', emoji: '🥷',
    name: 'Robe de l\'Assassin de l\'Ombre',
    flavor: 'Frappe vite, frappe fort, disparais.',
    baseStatBonus: { armor: 10, vitality: 15 },
    fixedAffixes: [
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts',  value: 15, percent: false },
      { id: 'crit', stat: 'crit',     label: 'Crit',    value: 25, percent: true },
      { id: 'spd',  stat: 'speed',    label: 'Vitesse', value: 20, percent: true },
      { id: 'vit',  stat: 'vitality', label: 'Vie',     value: 25, percent: false },
    ],
  },
  {
    id: 'berserker_axe', slot: 'weapon', baseTypeId: 'axe', emoji: '🪓',
    name: 'Hache du Berserker',
    flavor: 'Plus tu cognes, plus tu veux cogner.',
    baseStatBonus: { damage: 30 },
    fixedAffixes: [
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts',     value: 40, percent: false },
      { id: 'fire', stat: 'fireDmg',  label: 'Dégâts feu', value: 20, percent: true },
      { id: 'crit', stat: 'crit',     label: 'Crit',       value: 15, percent: true },
      { id: 'spd',  stat: 'speed',    label: 'Vitesse',    value: 10, percent: true },
    ],
  },
  {
    id: 'thief_band', slot: 'ring', baseTypeId: 'band', emoji: '💍',
    name: 'Anneau du Voleur de Lune',
    flavor: 'Les serrures lui obéissent.',
    fixedAffixes: [
      { id: 'spd',  stat: 'speed',    label: 'Vitesse',    value: 25, percent: true },
      { id: 'crit', stat: 'crit',     label: 'Crit',       value: 20, percent: true },
      { id: 'gold', stat: 'goldFind', label: 'Or trouvé',  value: 35, percent: true },
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts',     value: 10, percent: false },
    ],
  },
  {
    id: 'paladin_helm', slot: 'helmet', baseTypeId: 'helm', emoji: '⛑',
    name: 'Heaume du Paladin Juste',
    flavor: 'La lumière ne tremble jamais.',
    baseStatBonus: { armor: 20, vitality: 25 },
    fixedAffixes: [
      { id: 'arm',  stat: 'armor',    label: 'Armure',    value: 20, percent: false },
      { id: 'vit',  stat: 'vitality', label: 'Vie',       value: 35, percent: false },
      { id: 'gold', stat: 'goldFind', label: 'Or trouvé', value: 15, percent: true },
      { id: 'crit', stat: 'crit',     label: 'Crit',      value: 15, percent: true },
    ],
  },
  {
    id: 'phoenix_amulet', slot: 'amulet', baseTypeId: 'pendant', emoji: '🔥',
    name: 'Larme du Phénix',
    flavor: 'Cendre, flamme, renaissance.',
    fixedAffixes: [
      { id: 'fire', stat: 'fireDmg',  label: 'Dégâts feu', value: 40, percent: true },
      { id: 'vit',  stat: 'vitality', label: 'Vie',        value: 30, percent: false },
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts',     value: 12, percent: false },
      { id: 'crit', stat: 'crit',     label: 'Crit',       value: 18, percent: true },
    ],
  },
  // === Wave 2 (uniques élargis) ===
  {
    id: 'glacial_edge', slot: 'weapon', baseTypeId: 'sword', emoji: '🥶',
    name: 'Tranche-Glacier',
    flavor: 'L\'air gèle là où elle passe.',
    baseStatBonus: { damage: 18 },
    fixedAffixes: [
      { id: 'dmg',  stat: 'damage', label: 'Dégâts',  value: 22, percent: false },
      { id: 'spd',  stat: 'speed',  label: 'Vitesse', value: 18, percent: true  },
      { id: 'crit', stat: 'crit',   label: 'Crit',    value: 22, percent: true  },
    ],
  },
  {
    id: 'star_staff', slot: 'weapon', baseTypeId: 'wand', emoji: '✨',
    name: 'Bâton des Étoiles Mortes',
    flavor: 'Chaque incantation aspire un peu plus la nuit.',
    baseStatBonus: { damage: 15 },
    fixedAffixes: [
      { id: 'fire', stat: 'fireDmg', label: 'Dégâts feu', value: 50, percent: true  },
      { id: 'crit', stat: 'crit',    label: 'Crit',       value: 30, percent: true  },
      { id: 'dmg',  stat: 'damage',  label: 'Dégâts',     value: 12, percent: false },
    ],
  },
  {
    id: 'rampart_helm', slot: 'helmet', baseTypeId: 'helm', emoji: '🛡',
    name: 'Heaume du Rempart',
    flavor: 'Forgé pour les sièges qui ne finissent jamais.',
    baseStatBonus: { armor: 30, vitality: 35 },
    fixedAffixes: [
      { id: 'arm',  stat: 'armor',    label: 'Armure', value: 30, percent: false },
      { id: 'vit',  stat: 'vitality', label: 'Vie',    value: 60, percent: false },
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts', value: 10, percent: false },
    ],
  },
  {
    id: 'mad_diadem', slot: 'helmet', baseTypeId: 'crown', emoji: '😈',
    name: 'Diadème du Magicien Fou',
    flavor: 'La folie aiguise l\'esprit.',
    baseStatBonus: { armor: 8 },
    fixedAffixes: [
      { id: 'crit', stat: 'crit',     label: 'Crit',       value: 45, percent: true  },
      { id: 'fire', stat: 'fireDmg',  label: 'Dégâts feu', value: 25, percent: true  },
      { id: 'spd',  stat: 'speed',    label: 'Vitesse',    value: 12, percent: true  },
    ],
  },
  {
    id: 'wanderer_cloak', slot: 'armor', baseTypeId: 'robe', emoji: '🧥',
    name: 'Manteau du Vagabond Sans Nom',
    flavor: 'Ses poches débordent toujours, on ne sait jamais de quoi.',
    baseStatBonus: { armor: 12, vitality: 18 },
    fixedAffixes: [
      { id: 'gold', stat: 'goldFind', label: 'Or trouvé', value: 45, percent: true  },
      { id: 'spd',  stat: 'speed',    label: 'Vitesse',   value: 22, percent: true  },
      { id: 'vit',  stat: 'vitality', label: 'Vie',       value: 25, percent: false },
    ],
  },
  {
    id: 'gladiator_plate', slot: 'armor', baseTypeId: 'plate', emoji: '⚔',
    name: 'Plastron du Gladiateur',
    flavor: 'Marqué par mille combats, jamais brisé.',
    baseStatBonus: { armor: 28, vitality: 25 },
    fixedAffixes: [
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts', value: 22, percent: false },
      { id: 'arm',  stat: 'armor',    label: 'Armure', value: 22, percent: false },
      { id: 'crit', stat: 'crit',     label: 'Crit',   value: 18, percent: true  },
    ],
  },
  {
    id: 'demon_seal', slot: 'ring', baseTypeId: 'signet', emoji: '👹',
    name: 'Sceau du Démon Lié',
    flavor: 'Le pacte n\'est jamais à sens unique.',
    fixedAffixes: [
      { id: 'fire', stat: 'fireDmg', label: 'Dégâts feu', value: 35, percent: true  },
      { id: 'dmg',  stat: 'damage',  label: 'Dégâts',     value: 15, percent: false },
      { id: 'crit', stat: 'crit',    label: 'Crit',       value: 20, percent: true  },
    ],
  },
  {
    id: 'dawn_ring', slot: 'ring', baseTypeId: 'band', emoji: '🌅',
    name: 'Bague de l\'Aube',
    flavor: 'Quand elle scintille, la nuit recule.',
    fixedAffixes: [
      { id: 'vit',  stat: 'vitality', label: 'Vie',     value: 50, percent: false },
      { id: 'arm',  stat: 'armor',    label: 'Armure',  value: 10, percent: false },
      { id: 'gold', stat: 'goldFind', label: 'Or',      value: 20, percent: true  },
    ],
  },
  {
    id: 'sage_talisman', slot: 'amulet', baseTypeId: 'talisman', emoji: '🧿',
    name: 'Talisman du Sage Éveillé',
    flavor: 'Vide ton esprit ; remplis ta lame.',
    fixedAffixes: [
      { id: 'crit', stat: 'crit',    label: 'Crit',       value: 40, percent: true  },
      { id: 'dmg',  stat: 'damage',  label: 'Dégâts',     value: 18, percent: false },
      { id: 'spd',  stat: 'speed',   label: 'Vitesse',    value: 15, percent: true  },
    ],
  },
  {
    id: 'marauder_targe', slot: 'shield', baseTypeId: 'tower', emoji: '🗡',
    name: 'Targe du Maraudeur',
    flavor: 'Une armure qui frappe, c\'est aussi une arme.',
    baseStatBonus: { armor: 18, vitality: 20 },
    fixedAffixes: [
      { id: 'arm',  stat: 'armor',    label: 'Armure',  value: 20, percent: false },
      { id: 'dmg',  stat: 'damage',   label: 'Dégâts',  value: 25, percent: false },
      { id: 'crit', stat: 'crit',     label: 'Crit',    value: 15, percent: true  },
    ],
  },
];

// === Sets (themed item collections with bonuses at 2/3/4 pieces + 4-piece unique effects) ===
// Stat bonuses are boosted vs v1 (×1.5-2) so sets are competitive with affixes.
// Each set also gets a unique 4-piece `effect` activated in combat (see combat.js).
export const SETS = [
  {
    id: 'dragon', name: 'Dragon', color: '#ff5500',
    pieces: {
      helmet: { baseTypeId: 'helm',  emoji: '🪖', name: 'Heaume Dragonien' },
      armor:  { baseTypeId: 'plate', emoji: '🦺', name: 'Plastron Dragonien' },
      weapon: { baseTypeId: 'sword', emoji: '🗡', name: 'Épée Dragonienne' },
      shield: { baseTypeId: 'tower', emoji: '🛡', name: 'Bouclier Dragonien' },
    },
    bonuses: {
      2: [{ stat: 'fireDmg', value: 40, percent: true,  label: 'Dégâts feu' }],
      3: [{ stat: 'damage',  value: 35, percent: false, label: 'Dégâts' }],
      4: [{ stat: 'crit',    value: 40, percent: true,  label: 'Crit' }],
    },
    effect: { id: 'dragon_breath', name: 'Souffle dragon',
              desc: '15% : ton attaque inflige le double de dégâts (feu)' },
  },
  {
    id: 'shadow', name: 'Ombre', color: '#8855ff',
    pieces: {
      armor:  { baseTypeId: 'robe',    emoji: '🥋', name: 'Robe de l\'Ombre' },
      weapon: { baseTypeId: 'dagger',  emoji: '🗡', name: 'Dague de l\'Ombre' },
      ring:   { baseTypeId: 'band',    emoji: '💍', name: 'Anneau de l\'Ombre' },
      amulet: { baseTypeId: 'pendant', emoji: '📿', name: 'Pendentif de l\'Ombre' },
    },
    bonuses: {
      2: [{ stat: 'speed',  value: 30, percent: true,  label: 'Vitesse' }],
      3: [{ stat: 'crit',   value: 40, percent: true,  label: 'Crit' }],
      4: [{ stat: 'damage', value: 50, percent: false, label: 'Dégâts' }],
    },
    effect: { id: 'shadow_strike', name: 'Frappe d\'ombre',
              desc: 'Après une esquive, la prochaine attaque est garantie crit' },
  },
  {
    id: 'titan', name: 'Titan', color: '#ffaa00',
    pieces: {
      helmet: { baseTypeId: 'helm',   emoji: '🪖', name: 'Heaume Titan' },
      armor:  { baseTypeId: 'plate',  emoji: '🦺', name: 'Plastron Titan' },
      shield: { baseTypeId: 'tower',  emoji: '🛡', name: 'Bouclier Titan' },
      ring:   { baseTypeId: 'signet', emoji: '💎', name: 'Anneau Titan' },
    },
    bonuses: {
      2: [{ stat: 'armor',    value: 50, percent: false, label: 'Armure' }],
      3: [{ stat: 'vitality', value: 80, percent: false, label: 'Vie' }],
      4: [{ stat: 'damage',   value: 40, percent: false, label: 'Dégâts' }],
    },
    effect: { id: 'titan_wall', name: 'Mur immuable',
              desc: '15% : esquive complète de l\'attaque ennemie' },
  },
  {
    id: 'phoenix', name: 'Phénix', color: '#ff3000',
    pieces: {
      helmet: { baseTypeId: 'crown', emoji: '👑', name: 'Couronne du Phénix' },
      armor:  { baseTypeId: 'robe',  emoji: '🥋', name: 'Robe du Phénix' },
      weapon: { baseTypeId: 'wand',  emoji: '🪄', name: 'Baguette du Phénix' },
      amulet: { baseTypeId: 'pendant', emoji: '📿', name: 'Pendentif du Phénix' },
    },
    bonuses: {
      2: [{ stat: 'fireDmg', value: 50, percent: true,  label: 'Dégâts feu' }],
      3: [{ stat: 'vitality', value: 70, percent: false, label: 'Vie' }],
      4: [{ stat: 'damage',  value: 40, percent: false, label: 'Dégâts' }],
    },
    effect: { id: 'phoenix_rebirth', name: 'Renaissance',
              desc: 'Une fois par combat, revis avec 30% de tes PV max' },
  },
  {
    id: 'frost', name: 'Givre', color: '#5ad8e8',
    pieces: {
      helmet: { baseTypeId: 'helm', emoji: '🪖', name: 'Heaume Glacial' },
      weapon: { baseTypeId: 'bow',  emoji: '🏹', name: 'Arc Glacial' },
      ring:   { baseTypeId: 'band', emoji: '💍', name: 'Anneau Glacial' },
      amulet: { baseTypeId: 'talisman', emoji: '🧿', name: 'Talisman Glacial' },
    },
    bonuses: {
      2: [{ stat: 'speed', value: 40, percent: true,  label: 'Vitesse' }],
      3: [{ stat: 'crit',  value: 35, percent: true,  label: 'Crit' }],
      4: [{ stat: 'damage', value: 50, percent: false, label: 'Dégâts' }],
    },
    effect: { id: 'frost_freeze', name: 'Gel',
              desc: '20% par hit : le monstre est gelé et saute son tour' },
  },
  {
    id: 'lich', name: 'Liche', color: '#3aaa50',
    pieces: {
      helmet: { baseTypeId: 'crown',  emoji: '👑', name: 'Couronne de la Liche' },
      armor:  { baseTypeId: 'robe',   emoji: '🥋', name: 'Robe de la Liche' },
      weapon: { baseTypeId: 'wand',   emoji: '🪄', name: 'Sceptre de la Liche' },
      ring:   { baseTypeId: 'signet', emoji: '💎', name: 'Sceau de la Liche' },
    },
    bonuses: {
      2: [{ stat: 'vitality', value: 60, percent: false, label: 'Vie' }],
      3: [{ stat: 'fireDmg',  value: 40, percent: true,  label: 'Dégâts feu' }],
      4: [{ stat: 'crit',     value: 50, percent: true,  label: 'Crit' }],
    },
    effect: { id: 'lich_drain', name: 'Drain de vie',
              desc: '10% des dégâts infligés te soignent' },
  },
  {
    id: 'druid', name: 'Druide', color: '#4caa3a',
    pieces: {
      helmet: { baseTypeId: 'crown',   emoji: '🌿', name: 'Couronne de Lierre' },
      armor:  { baseTypeId: 'robe',    emoji: '🥋', name: 'Robe Sylvestre' },
      weapon: { baseTypeId: 'wand',    emoji: '🪄', name: 'Bâton du Bosquet' },
      amulet: { baseTypeId: 'pendant', emoji: '🍀', name: 'Pendentif Sauvage' },
    },
    bonuses: {
      2: [{ stat: 'vitality', value: 70, percent: false, label: 'Vie' }],
      3: [{ stat: 'speed',    value: 30, percent: true,  label: 'Vitesse' }],
      4: [{ stat: 'goldFind', value: 40, percent: true,  label: 'Or trouvé' }],
    },
    effect: { id: 'druid_growth', name: 'Croissance',
              desc: 'Tous les 4 tours, soigne 20% de tes PV max' },
  },
  {
    id: 'demon', name: 'Démoniaque', color: '#d0203a',
    pieces: {
      helmet: { baseTypeId: 'helm',   emoji: '😈', name: 'Heaume Démoniaque' },
      armor:  { baseTypeId: 'plate',  emoji: '🩸', name: 'Plastron Démoniaque' },
      weapon: { baseTypeId: 'sword',  emoji: '🔥', name: 'Lame Démoniaque' },
      ring:   { baseTypeId: 'signet', emoji: '👹', name: 'Anneau Démoniaque' },
    },
    bonuses: {
      2: [{ stat: 'damage',  value: 30, percent: false, label: 'Dégâts' }],
      3: [{ stat: 'fireDmg', value: 50, percent: true,  label: 'Dégâts feu' }],
      4: [{ stat: 'crit',    value: 45, percent: true,  label: 'Crit' }],
    },
    effect: { id: 'demon_pact', name: 'Pacte démoniaque',
              desc: 'Le premier coup d\'un combat inflige le triple des dégâts' },
  },
  {
    id: 'wanderer', name: 'Voyageur', color: '#5aa8e8',
    pieces: {
      armor:  { baseTypeId: 'robe',    emoji: '🧥', name: 'Cape du Voyageur' },
      shield: { baseTypeId: 'tower',   emoji: '🧭', name: 'Pavois du Voyageur' },
      ring:   { baseTypeId: 'band',    emoji: '💍', name: 'Anneau du Voyageur' },
      amulet: { baseTypeId: 'talisman', emoji: '🗺', name: 'Talisman du Voyageur' },
    },
    bonuses: {
      2: [{ stat: 'speed',    value: 35, percent: true,  label: 'Vitesse' }],
      3: [{ stat: 'goldFind', value: 50, percent: true,  label: 'Or trouvé' }],
      4: [{ stat: 'vitality', value: 60, percent: false, label: 'Vie' }],
    },
    effect: { id: 'wanderer_haste', name: 'Pas du Voyageur',
              desc: '25% de chance d\'esquiver chaque attaque ennemie' },
  },
];

export const SETS_BY_ID = Object.fromEntries(SETS.map(s => [s.id, s]));

// Set piece drop chance per rarity (only rare+ can be set pieces)
export const SET_DROP_CHANCE = { rare: 0.10, epic: 0.18, legendary: 0.20, ancestral: 0.25 };

// === Prestige ===
export const PRESTIGE_REQUIREMENTS = {
  minChestTier: 5,
  minFloor: 50,
};

// Bonus per prestige level. Switched from exponential (1.25^L) to linear (1 + 0.15*L)
// to keep endgame challenging — exponential made prestige 5 trivialize content.
export const PRESTIGE_BONUS_PER_LEVEL = {
  rareDropWeightMult: 0.15, // additive per level
  goldMult: 0.15,           // additive per level
};

export function prestigeGoldMult(level) { return 1 + PRESTIGE_BONUS_PER_LEVEL.goldMult * (level || 0); }
export function prestigeRareMult(level) { return 1 + PRESTIGE_BONUS_PER_LEVEL.rareDropWeightMult * (level || 0); }

// Item stat scaling per chest tier. Previously stats scaled linearly (× tier),
// which — compounded with rarity statMult and 8 equipment slots — made player
// damage explode (~×20 over T1→T5) and one-shot all content. This sublinear
// curve flattens the power growth so matched-tier combat stays tense.
// Tunable: lower TIER_SCALE_K = flatter curve = harder/slower fights.
export const TIER_SCALE_K = 0.5;
export function tierScale(chestTier) {
  return 1 + ((chestTier || 1) - 1) * TIER_SCALE_K;
}

// === Reliques d'Ascension ===
// À chaque ascension, le joueur choisit 1 relique parmi 3. Permanentes et
// cumulables (un même id peut être pris plusieurs fois → effets additifs),
// elles survivent au reset d'ascension : c'est le levier de build long terme.
// `mods` : damagePct / hpPct / dmgTakenPct / goldPct / dropPct (fractions),
//          critFlat / armorFlat (valeurs plates), elemPct, lifesteal (fraction).
export const RELICS = [
  { id: 'berserker',    emoji: '⚔️', name: 'Pacte du Berserker', desc: '+40% dégâts · −15% PV max',          mods: { damagePct: 0.40, hpPct: -0.15 } },
  { id: 'midas',        emoji: '💰', name: 'Main de Midas',       desc: '+50% or',                            mods: { goldPct: 0.50 } },
  { id: 'deadeye',      emoji: '🎯', name: 'Œil de Lynx',         desc: '+12% chance de critique',            mods: { critFlat: 12 } },
  { id: 'elementalist', emoji: '✨',  name: 'Élémentaliste',       desc: '+30% dégâts élémentaires',           mods: { elemPct: 0.30 } },
  { id: 'bulwark',      emoji: '🛡', name: 'Rempart',             desc: '+25% PV max · +20 armure',           mods: { hpPct: 0.25, armorFlat: 20 } },
  { id: 'fortune',      emoji: '🍀', name: 'Fortune',             desc: '+30% drops rares',                   mods: { dropPct: 0.30 } },
  { id: 'vampire',      emoji: '🩸', name: 'Soif de Sang',        desc: 'Vol de vie 5% des dégâts',           mods: { lifesteal: 0.05 } },
  { id: 'glasscannon',  emoji: '💥', name: 'Canon de Verre',      desc: '+80% dégâts · +40% dégâts subis',     mods: { damagePct: 0.80, dmgTakenPct: 0.40 } },
];

export const RELIC_BY_ID = Object.fromEntries(RELICS.map(r => [r.id, r]));


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
  // All elemental damages share the same weight (they stack identically in combat)
  fireDmg: 1.5,
  frostDmg: 1.5,
  voidDmg: 1.5,
  poisonDmg: 1.5,
  lightningDmg: 1.5,
  goldFind: 0.5,
  speed: 1.2,
};
