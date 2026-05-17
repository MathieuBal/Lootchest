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
    boss: { name: 'Roi Sylvain',  emoji: '🌳', hpBase: 140, dmgBase: 11, armorBase: 4, goldBase: 100 },
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
    boss: { name: 'Hydre des Profondeurs', emoji: '🐲', hpBase: 160, dmgBase: 13, armorBase: 5, goldBase: 130 },
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
    boss: { name: 'Roi Mort',   emoji: '☠', hpBase: 130, dmgBase: 16, armorBase: 4, goldBase: 160 },
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
    boss: { name: 'Seigneur Démon', emoji: '😈', hpBase: 150, dmgBase: 20, armorBase: 4, goldBase: 220 },
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
    boss: { name: 'Maître du Néant', emoji: '🌀', hpBase: 200, dmgBase: 22, armorBase: 6, goldBase: 320 },
  },
];

export function biomeForFloor(floor) {
  for (const b of BIOMES) {
    if (floor >= b.floors[0] && floor <= b.floors[1]) return b;
  }
  return BIOMES[BIOMES.length - 1];
}

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
];

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
];

// === Sets (themed item collections with bonuses at 2/3/4 pieces) ===
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
      2: [{ stat: 'fireDmg', value: 25, percent: true,  label: 'Dégâts feu' }],
      3: [{ stat: 'damage',  value: 20, percent: false, label: 'Dégâts' }],
      4: [{ stat: 'crit',    value: 25, percent: true,  label: 'Crit' }],
    },
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
      2: [{ stat: 'speed',  value: 20, percent: true,  label: 'Vitesse' }],
      3: [{ stat: 'crit',   value: 25, percent: true,  label: 'Crit' }],
      4: [{ stat: 'damage', value: 30, percent: false, label: 'Dégâts' }],
    },
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
      2: [{ stat: 'armor',    value: 25, percent: false, label: 'Armure' }],
      3: [{ stat: 'vitality', value: 40, percent: false, label: 'Vie' }],
      4: [{ stat: 'damage',   value: 25, percent: false, label: 'Dégâts' }],
    },
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
      2: [{ stat: 'fireDmg', value: 30, percent: true,  label: 'Dégâts feu' }],
      3: [{ stat: 'vitality', value: 35, percent: false, label: 'Vie' }],
      4: [{ stat: 'damage',  value: 25, percent: false, label: 'Dégâts' }],
    },
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
      2: [{ stat: 'speed', value: 25, percent: true,  label: 'Vitesse' }],
      3: [{ stat: 'crit',  value: 20, percent: true,  label: 'Crit' }],
      4: [{ stat: 'damage', value: 30, percent: false, label: 'Dégâts' }],
    },
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
      2: [{ stat: 'vitality', value: 30, percent: false, label: 'Vie' }],
      3: [{ stat: 'fireDmg',  value: 25, percent: true,  label: 'Dégâts feu' }],
      4: [{ stat: 'crit',     value: 30, percent: true,  label: 'Crit' }],
    },
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

export const PRESTIGE_BONUS_PER_LEVEL = {
  rareDropWeightMult: 1.25,
  goldMult: 1.25,
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
