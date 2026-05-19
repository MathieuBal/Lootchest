// High-definition (64×64) procedural weapon parts.
// Same composition model as parts.js (parts have layout + palette + roles)
// but built from canvas primitives instead of hand-typed string layouts.
// At this resolution we have room for:
//   - 4-6 shading levels per material role
//   - Smooth curved tips and ornate guards
//   - Hand-placed gems, runes, decorative details
//
// Used by composedSpriteSVG when the item has `hdParts: true` flag, or
// directly by the paper doll / drop popup which always prefer HD.
//
// Each part exposes: { id, name, layout: string[64], palette, roles, statBias, tags }
// — drop-in compatible with the existing rollPart() and getCompositionLayers
// pipelines, just at a bigger canvas.

import { makeCanvas, px, rect, ellipse, hline, vline, outline, canvasToLayout, line } from './builder.js';

// === SWORD BLADES (64×64) ===
// Each blade occupies rows 4-40 (upper 36 rows), centered cols 28-35.
// Guard at row 40-44, grip at row 44-58, pommel at row 58-62.

// --- Slim sword: classic vertical blade with central highlight stripe ---
function buildBladeSlim() {
  const c = makeCanvas(64, 64);
  // Tip (rows 4-6): narrow triangle
  px(c, 31, 4, 'h'); px(c, 32, 4, 'h');
  rect(c, 30, 5, 4, 1, 'm');
  rect(c, 30, 6, 4, 1, 'm');
  // Body (rows 7-38): full width 6 px, tapered slightly at bottom
  rect(c, 28, 7, 8, 32, 'm');
  // Shadow on right edge
  vline(c, 35, 7, 38, 's');
  // Light highlight stripe down center-left
  vline(c, 30, 6, 36, 'l');
  vline(c, 29, 8, 36, 'h'); // brightest stripe
  // Tip refinement: slight highlight
  px(c, 31, 5, 'l');
  // Fuller / blood groove (dark line down the center)
  vline(c, 32, 10, 34, 's');
  // Outline (will hug the silhouette)
  outline(c, 'o');
  return canvasToLayout(c);
}

// --- Broad sword: wider blade with two parallel fullers ---
function buildBladeBroad() {
  const c = makeCanvas(64, 64);
  // Wider tip
  rect(c, 30, 3, 4, 1, 'h');
  rect(c, 29, 4, 6, 2, 'm');
  // Main body cols 26-37 (12 px wide), rows 6-38
  rect(c, 26, 6, 12, 32, 'm');
  // Edge bevels (alternating light/shadow sides)
  vline(c, 26, 6, 38, 's');
  vline(c, 27, 6, 38, 'h');
  vline(c, 37, 6, 38, 'd'); // outline-ish dark
  vline(c, 36, 6, 38, 's');
  // Center highlight strip
  vline(c, 31, 7, 37, 'l');
  vline(c, 32, 7, 37, 'h');
  // Twin fullers (blood grooves)
  vline(c, 29, 8, 35, 's');
  vline(c, 34, 8, 35, 's');
  // Bottom shoulder rounding (where blade meets guard)
  px(c, 26, 38, 's'); px(c, 37, 38, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}

// --- Curved sword: scimitar-like, blade bends slightly to the right ---
function buildBladeCurved() {
  const c = makeCanvas(64, 64);
  // Tip pointing up-right
  px(c, 35, 5, 'h'); px(c, 36, 5, 'h');
  px(c, 35, 6, 'm'); px(c, 36, 6, 'm');
  // Curved spine: parametric arc cols 27→35 over rows 7→38
  for (let y = 7; y <= 38; y++) {
    const t = (y - 7) / 31;
    // Quadratic bias: starts curving right, then straightens
    const baseX = Math.round(35 - 8 * Math.sin(t * Math.PI * 0.45));
    rect(c, baseX, y, 8, 1, 'm');
    px(c, baseX, y, 's');            // left edge shadow
    px(c, baseX + 1, y, 'l');        // light stripe
    px(c, baseX + 2, y, 'h');        // brightest
    px(c, baseX + 7, y, 'd');        // back edge darker
  }
  outline(c, 'o');
  return canvasToLayout(c);
}

const PALETTE_BLADE_STEEL = {
  o: '#0a0d12',
  d: '#1d2530',
  s: '#3a4655',
  m: '#6f7e91',
  l: '#aebcd0',
  h: '#e2eaf6',
};

// roles drive the material retint (phase 4A)
const ROLES_BLADE = {
  o: 'outline',
  d: 'shadow',
  s: 'shadow',
  m: 'mid',
  l: 'light',
  h: 'highlight',
};

// === SWORD GUARDS (64×64) ===
// Cross-guard sits across rows 39-44, centered cols 16-48 (wider than blade).

function buildGuardStraight() {
  const c = makeCanvas(64, 64);
  rect(c, 18, 40, 28, 4, 'm');
  // Top edge highlight
  hline(c, 18, 45, 40, 'l');
  // Bottom shadow
  hline(c, 18, 45, 43, 's');
  // End caps (slight bulges)
  px(c, 17, 41, 's'); px(c, 17, 42, 's');
  px(c, 46, 41, 's'); px(c, 46, 42, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildGuardSwept() {
  const c = makeCanvas(64, 64);
  // Main horizontal bar
  rect(c, 22, 40, 20, 3, 'm');
  hline(c, 22, 41, 40, 'l');
  hline(c, 22, 41, 42, 's');
  // Swept tips curling upward
  for (let i = 0; i < 6; i++) {
    px(c, 21 - i, 40 - Math.floor(i / 2), 'm');
    px(c, 42 + i, 40 - Math.floor(i / 2), 'm');
  }
  // Tip flourishes
  px(c, 15, 37, 'l'); px(c, 48, 37, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildGuardOrnate() {
  const c = makeCanvas(64, 64);
  // Thicker central plate with a gem socket
  rect(c, 20, 39, 24, 5, 'm');
  hline(c, 20, 43, 39, 'l');
  hline(c, 20, 43, 43, 's');
  // Decorative end ornaments (small spheres)
  ellipse(c, 18, 41, 2, 2, 'm');
  ellipse(c, 45, 41, 2, 2, 'm');
  px(c, 17, 40, 'l'); px(c, 44, 40, 'l');
  // Central gem
  px(c, 31, 41, 'A'); px(c, 32, 41, 'A');
  px(c, 31, 40, 'B'); px(c, 32, 40, 'B');
  outline(c, 'o');
  return canvasToLayout(c);
}

const PALETTE_GUARD_GOLD = {
  o: '#1a0e04',
  d: '#3a2008',
  s: '#7a4818',
  m: '#c89020',
  l: '#ffe14a',
  h: '#fff8c8',
  A: '#c81830', // gem dark
  B: '#ff5060', // gem light (kept off-roles → not retinted)
};

const ROLES_GUARD = {
  o: 'outline',
  d: 'shadow',
  s: 'shadow',
  m: 'mid',
  l: 'light',
  h: 'highlight',
  // A, B intentionally OUT of roles → gem stays red when guard is retinted
};

// === SWORD GRIP (64×64) ===
// Single fixed grip — wrapped leather feel.
function buildGrip() {
  const c = makeCanvas(64, 64);
  // Vertical handle, cols 30-33, rows 44-57
  rect(c, 30, 44, 4, 14, 'm');
  // Diagonal wrap stripes (alternating dark/light bands)
  for (let row = 44; row <= 56; row += 2) {
    hline(c, 30, 33, row, 's');
    hline(c, 30, 33, row + 1, 'm');
  }
  // Edge highlight on the left
  vline(c, 30, 45, 56, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}

const PALETTE_GRIP_LEATHER = {
  o: '#0e0805',
  s: '#2a1810',
  m: '#5a3818',
  l: '#8a5828',
};
// Grip is intentionally NOT retinted — leather stays leather regardless of
// the blade's material.

// === SWORD POMMELS (64×64) ===
// Round, gemmed, or spiked. Sits at the bottom (rows 56-62).

function buildPommelRound() {
  const c = makeCanvas(64, 64);
  ellipse(c, 31, 59, 4, 3, 'm');
  // Shadow underside
  hline(c, 28, 34, 61, 's');
  // Highlight on top
  px(c, 30, 57, 'l'); px(c, 31, 57, 'h'); px(c, 32, 57, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildPommelGem() {
  const c = makeCanvas(64, 64);
  ellipse(c, 31, 59, 5, 4, 'm');
  hline(c, 27, 35, 61, 's');
  px(c, 29, 56, 'l'); px(c, 30, 56, 'h');
  px(c, 32, 56, 'h'); px(c, 33, 56, 'l');
  // Centered gem (kept out of roles)
  rect(c, 30, 58, 3, 3, 'A');
  px(c, 31, 58, 'B'); // gem highlight
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildPommelSpiked() {
  const c = makeCanvas(64, 64);
  ellipse(c, 31, 59, 3, 2, 'm');
  // 4 spikes
  px(c, 31, 55, 'm'); px(c, 31, 56, 'l');
  px(c, 31, 63, 'm');
  px(c, 27, 59, 'm'); px(c, 35, 59, 'm');
  // Highlight
  px(c, 30, 58, 'h');
  outline(c, 'o');
  return canvasToLayout(c);
}

const PALETTE_POMMEL_GOLD = { ...PALETTE_GUARD_GOLD };
const ROLES_POMMEL = { ...ROLES_GUARD };

// === Public collections ===

export const HD_SWORD_BLADES = [
  {
    id: 'slim',   name: 'Lame Fine HD',  weight: 18,
    layout: buildBladeSlim(),   palette: PALETTE_BLADE_STEEL, roles: ROLES_BLADE,
    statBias: { damage: [8, 18], crit: [4, 9], speed: [1, 4] },
    tags: ['thin', 'fast', 'precision'],
  },
  {
    id: 'broad',  name: 'Lame Large HD', weight: 14,
    layout: buildBladeBroad(),  palette: PALETTE_BLADE_STEEL, roles: ROLES_BLADE,
    statBias: { damage: [14, 26], armor: [2, 5] },
    tags: ['heavy', 'balanced'],
  },
  {
    id: 'curved', name: 'Lame Courbée HD', weight: 10,
    layout: buildBladeCurved(), palette: PALETTE_BLADE_STEEL, roles: ROLES_BLADE,
    statBias: { damage: [11, 22], crit: [5, 11], speed: [1, 3] },
    tags: ['curved', 'aggressive'],
  },
];

export const HD_SWORD_GUARDS = [
  {
    id: 'straight', name: 'Garde Droite HD', weight: 22,
    layout: buildGuardStraight(), palette: PALETTE_GUARD_GOLD, roles: ROLES_GUARD,
    statBias: { armor: [2, 5] },
    tags: ['balanced'],
  },
  {
    id: 'swept',    name: 'Garde Recourbée HD', weight: 12,
    layout: buildGuardSwept(),    palette: PALETTE_GUARD_GOLD, roles: ROLES_GUARD,
    statBias: { crit: [3, 7], speed: [1, 3] },
    tags: ['swept', 'duelist'],
  },
  {
    id: 'ornate',   name: 'Garde Sertie HD', weight: 6,
    layout: buildGuardOrnate(),   palette: PALETTE_GUARD_GOLD, roles: ROLES_GUARD,
    statBias: { armor: [3, 7], goldFind: [4, 9], crit: [1, 3] },
    tags: ['royal', 'gem', 'flashy'],
  },
];

export const HD_SWORD_GRIP = {
  id: 'wrapped', name: 'Poignée Cuir HD',
  layout: buildGrip(), palette: PALETTE_GRIP_LEATHER,
  // No `roles` → not retinted by material (grip stays leather).
};

export const HD_SWORD_POMMELS = [
  {
    id: 'round',  name: 'Pommeau Rond HD', weight: 20,
    layout: buildPommelRound(),  palette: PALETTE_POMMEL_GOLD, roles: ROLES_POMMEL,
    statBias: { armor: [1, 4] },
    tags: ['simple'],
  },
  {
    id: 'gemmed', name: 'Pommeau Gemme HD', weight: 10,
    layout: buildPommelGem(),    palette: PALETTE_POMMEL_GOLD, roles: ROLES_POMMEL,
    statBias: { crit: [3, 7], goldFind: [3, 7] },
    tags: ['gem', 'flashy'],
  },
  {
    id: 'spiked', name: 'Pommeau Cloué HD', weight: 8,
    layout: buildPommelSpiked(), palette: PALETTE_POMMEL_GOLD, roles: ROLES_POMMEL,
    statBias: { damage: [3, 7] },
    tags: ['spike', 'aggressive'],
  },
];

// Weapon-parts definition (mirrors the WEAPON_PARTS.sword shape from parts.js)
export const HD_WEAPON_PARTS = {
  sword: {
    parts: [
      { type: 'blade',  variants: HD_SWORD_BLADES },
      { type: 'guard',  variants: HD_SWORD_GUARDS },
      { type: 'pommel', variants: HD_SWORD_POMMELS },
    ],
    fixedLayers: { grip: HD_SWORD_GRIP },
    drawOrder: ['blade', 'guard', '@grip', 'pommel'],
  },
};

export function hasHDCompositionFor(weaponBaseTypeId) {
  return !!HD_WEAPON_PARTS[weaponBaseTypeId];
}
