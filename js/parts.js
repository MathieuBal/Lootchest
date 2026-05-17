// Procedural weapon parts: each weapon is composed of multiple parts.
// Each part has visual variants (16x16 pixel layouts) and stat biases.
// MVP: swords only. Other weapon types still use classic generation.

// Format:
//   variant: { id, name, weight, layout: string[16], palette: {char: color}, statBias: {stat: [min, max]} }
// Layout is a 16-row array of 16-char strings. '.' = transparent.

// === SWORD PARTS ===

const SWORD_BLADES = [
  {
    id: 'simple', name: 'Lame Simple', weight: 30,
    layout: [
      '.......##.......',
      '......#XX#......',
      '......#XX#......',
      '......#XX#......',
      '......#XX#......',
      '......#XX#......',
      '......#XX#......',
      '......#XX#......',
      '......#XX#......',
      '......#XX#......',
      '......#XX#......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { '#': '#2a2a3a', 'X': '#c0c0d0' },
    statBias: { damage: [6, 14] },
  },
  {
    id: 'broad', name: 'Lame Large', weight: 22,
    layout: [
      '.......##.......',
      '......#XX#......',
      '.....#XXXX#.....',
      '.....#XXXX#.....',
      '.....#XXXX#.....',
      '.....#XXXX#.....',
      '.....#XXXX#.....',
      '.....#XXXX#.....',
      '.....#XXXX#.....',
      '.....#XXXX#.....',
      '.....#XXXX#.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { '#': '#2a2a3a', 'X': '#d0d0e0' },
    statBias: { damage: [9, 18] },
  },
  {
    id: 'serrated', name: 'Lame Dentelée', weight: 18,
    layout: [
      '.......##.......',
      '......#XX#......',
      '.....#XXXX#.....',
      '....#XXXXX#.....',
      '.....#XXXX#.....',
      '....#XXXXX#.....',
      '.....#XXXX#.....',
      '....#XXXXX#.....',
      '.....#XXXX#.....',
      '....#XXXXX#.....',
      '.....#XXXX#.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { '#': '#2a2a3a', 'X': '#c8c8d8' },
    statBias: { damage: [10, 20] },
  },
  {
    id: 'flaming', name: 'Lame Flamboyante', weight: 8,
    layout: [
      '.......##.......',
      '......#YY#......',
      '.....#YOYY#.....',
      '.....#OOYY#.....',
      '.....#YOOY#.....',
      '.....#OYYO#.....',
      '.....#YOYO#.....',
      '.....#OYYO#.....',
      '.....#YOOY#.....',
      '.....#OYYO#.....',
      '.....#YOYY#.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { '#': '#4a1a08', 'Y': '#ffc040', 'O': '#ff7020' },
    statBias: { damage: [14, 24], fireDmg: [3, 8] },
  },
  {
    id: 'cursed', name: 'Lame Maudite', weight: 4,
    layout: [
      '.......##.......',
      '......#PP#......',
      '.....#PVVP#.....',
      '.....#PRPR#.....',
      '.....#PVVP#.....',
      '.....#PRPR#.....',
      '.....#PVVP#.....',
      '.....#PRPR#.....',
      '.....#PVVP#.....',
      '.....#PRPR#.....',
      '.....#PVVP#.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { '#': '#1a0420', 'P': '#7028a0', 'V': '#b048e0', 'R': '#ff2050' },
    statBias: { damage: [16, 28], crit: [3, 8] },
  },
];

const SWORD_GUARDS = [
  {
    id: 'straight', name: 'Garde Droite', weight: 32,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.HHHHHHHHHHHHHH.',
      '..HHHHHHHHHHHH..',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { 'H': '#a06820' },
    statBias: { armor: [2, 5] },
  },
  {
    id: 'curved', name: 'Garde Courbe', weight: 24,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.H............H.',
      '.HHHHHHHHHHHHHH.',
      '..HHHHHHHHHHHH..',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { 'H': '#c08428' },
    statBias: { crit: [3, 7] },
  },
  {
    id: 'spiked', name: 'Garde Cloutée', weight: 14,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.S............S.',
      '.HSHHHHHHHHHHSH.',
      '..HHHHHHHHHHHH..',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { 'H': '#a06820', 'S': '#5a3010' },
    statBias: { damage: [3, 7], crit: [2, 5] },
  },
  {
    id: 'horns', name: 'Garde Cornes', weight: 8,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..H..........H..',
      '.HH..........HH.',
      '.HHHHHHHHHHHHHH.',
      '..HHHHHHHHHHHH..',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { 'H': '#2a2a3a' },
    statBias: { vitality: [4, 9], crit: [2, 5] },
  },
  {
    id: 'wings', name: 'Garde Ailée', weight: 4,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      'GG............GG',
      '.GGG........GGG.',
      '..GGGGGGGGGGGG..',
      '.GGGGGGGGGGGGGG.',
      '..GGGGGGGGGGGG..',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { 'G': '#d0a040' },
    statBias: { crit: [5, 12], damage: [3, 8] },
  },
];

const SWORD_POMMELS = [
  {
    id: 'round', name: 'Pommeau Sphère', weight: 30,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......qHHq......',
      '.....qHHHHq.....',
      '.....qHHHHq.....',
      '.....qHHHHq.....',
      '......qHHq......',
    ],
    palette: { 'H': '#a06820', 'q': '#6a3818' },
    statBias: { vitality: [2, 5] },
  },
  {
    id: 'cube', name: 'Pommeau Cube', weight: 24,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.....qHHHHq.....',
      '.....qHHHHq.....',
      '.....qHHHHq.....',
      '.....qqqqqq.....',
    ],
    palette: { 'H': '#a06820', 'q': '#6a3818' },
    statBias: { vitality: [3, 7] },
  },
  {
    id: 'gem', name: 'Pommeau Gemme', weight: 18,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......qGGq......',
      '.....qGRRGq.....',
      '.....qRRRRq.....',
      '.....qGRRGq.....',
      '......qGGq......',
    ],
    palette: { 'G': '#4a2a08', 'q': '#1a0a02', 'R': '#ff3050' },
    statBias: { crit: [2, 5], damage: [1, 3] },
  },
  {
    id: 'skull', name: 'Pommeau Crâne', weight: 8,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......qSSq......',
      '.....qSEEsq.....',
      '.....qSSSSq.....',
      '.....qSEESq.....',
      '......qssq......',
    ],
    palette: { 'S': '#e0d8c0', 's': '#a09880', 'q': '#3a3428', 'E': '#1a1010' },
    statBias: { vitality: [5, 10], damage: [2, 5] },
  },
  {
    id: 'crystal', name: 'Pommeau Cristal', weight: 4,
    layout: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......qCCq......',
      '.....qCWWCq.....',
      '.....qWWWWq.....',
      '.....qCWWCq.....',
      '......qCCq......',
    ],
    palette: { 'C': '#5a8af0', 'W': '#c0e0ff', 'q': '#1a3a8a' },
    statBias: { fireDmg: [4, 10], crit: [2, 5] },
  },
];

// Grip is a fixed sprite layered between guard and pommel (no variants).
const SWORD_GRIP = {
  layout: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......hh.......',
    '.......hh.......',
    '.......hh.......',
    '................',
  ],
  palette: { 'h': '#3a2010' },
};

export const WEAPON_PARTS = {
  sword: {
    parts: [
      { type: 'blade',  variants: SWORD_BLADES },
      { type: 'guard',  variants: SWORD_GUARDS },
      { type: 'pommel', variants: SWORD_POMMELS },
    ],
    grip: SWORD_GRIP,
  },
};

// === Public rolling ===

function pickWeighted(variants) {
  const total = variants.reduce((s, v) => s + (v.weight || 1), 0);
  let r = Math.random() * total;
  for (const v of variants) {
    r -= (v.weight || 1);
    if (r <= 0) return v;
  }
  return variants[variants.length - 1];
}

// Roll a part: pick variant via d100 weighted draw, then roll d20 to lerp the stat range.
function rollPart(partDef, chestTier, statMult) {
  const variant = pickWeighted(partDef.variants);
  const d20 = Math.floor(Math.random() * 20) + 1;
  const t = (d20 - 1) / 19;
  const stats = {};
  for (const [stat, [min, max]] of Object.entries(variant.statBias || {})) {
    stats[stat] = Math.max(1, Math.round((min + t * (max - min)) * chestTier * statMult));
  }
  return { partType: partDef.type, variantId: variant.id, name: variant.name, d20, stats };
}

// Returns { parts: [...], baseStats: {...} } for the given weapon type.
export function rollWeaponParts(weaponBaseTypeId, chestTier, statMult) {
  const def = WEAPON_PARTS[weaponBaseTypeId];
  if (!def) return null;
  const parts = def.parts.map(p => rollPart(p, chestTier, statMult));
  const baseStats = {};
  for (const p of parts) {
    for (const [s, v] of Object.entries(p.stats)) {
      baseStats[s] = (baseStats[s] || 0) + v;
    }
  }
  return { parts, baseStats };
}

// Return all part layouts/palettes to compose the sprite, in draw order:
// blade (back) → guard → grip → pommel (front).
export function getCompositionLayers(weaponBaseTypeId, parts) {
  const def = WEAPON_PARTS[weaponBaseTypeId];
  if (!def || !Array.isArray(parts)) return [];
  const variantById = {};
  for (const partDef of def.parts) {
    variantById[partDef.type] = Object.fromEntries(partDef.variants.map(v => [v.id, v]));
  }
  const layers = [];
  // Specific draw order: blade → guard → grip → pommel
  const order = ['blade', 'guard', 'grip', 'pommel'];
  for (const t of order) {
    if (t === 'grip') {
      if (def.grip) layers.push({ layout: def.grip.layout, palette: def.grip.palette });
      continue;
    }
    const p = parts.find(pp => pp.partType === t);
    if (!p) continue;
    const v = variantById[t]?.[p.variantId];
    if (v) layers.push({ layout: v.layout, palette: v.palette });
  }
  return layers;
}

export function hasCompositionFor(weaponBaseTypeId) {
  return !!WEAPON_PARTS[weaponBaseTypeId];
}
