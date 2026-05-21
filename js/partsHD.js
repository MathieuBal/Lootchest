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

import { makeCanvas, px, rect, ellipse, ellipseOutline, hline, vline, outline, canvasToLayout, line } from './builder.js';

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

// === AXE HEADS (64×64) ===
// Head occupies rows 0-22, the eye (where the handle passes through) is around
// row 8-14 on the right side. Different head shapes give very different
// silhouettes — the part of an axe a player notices first.

// --- Single-bit broad axe: half-moon blade on the left, hub on the right ---
function buildAxeHeadSingle() {
  const c = makeCanvas(64, 64);
  // Blade body (half-disc shape, edge on the left)
  ellipse(c, 31, 13, 13, 10, 'm');
  // Clear the right half so we have a clean cutting edge profile
  rect(c, 34, 0, 30, 30, '.');
  // Hub block on the right for the haft passage
  rect(c, 32, 9, 6, 10, 'm');
  // Sharp edge highlight on the far left
  for (let y = 7; y <= 19; y++) {
    px(c, 17, y, 'h');
    px(c, 18, y, 'l');
  }
  // Subtle bevel mid-blade
  for (let x = 21; x <= 31; x++) {
    px(c, x, 9, 'l');
    px(c, x, 17, 's');
  }
  // Inner shadow near the haft
  vline(c, 33, 10, 18, 's');
  // Top rim shadow
  hline(c, 19, 32, 6, 's');
  // Bottom shadow
  hline(c, 19, 32, 20, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}

// --- Double-bit axe: two opposing crescent blades ---
function buildAxeHeadDouble() {
  const c = makeCanvas(64, 64);
  // Two ellipses on each side
  ellipse(c, 21, 13, 9, 8, 'm');
  ellipse(c, 43, 13, 9, 8, 'm');
  // Cut the inner halves so each becomes a crescent
  rect(c, 22, 0, 6, 28, '.');
  rect(c, 36, 0, 6, 28, '.');
  // Central hub joining them
  rect(c, 28, 9, 8, 10, 'm');
  // Sharp edge highlights on outer extremes
  for (let y = 8; y <= 18; y++) {
    px(c, 13, y, 'h'); px(c, 14, y, 'l');
    px(c, 50, y, 'h'); px(c, 49, y, 'l');
  }
  // Top + bottom mid shading
  hline(c, 28, 35, 8, 'l');
  hline(c, 28, 35, 18, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}

// --- Crescent (moon) axe: curved, dramatic asymmetric blade ---
function buildAxeHeadCrescent() {
  const c = makeCanvas(64, 64);
  // Large outer ellipse forms the crescent body
  ellipse(c, 28, 13, 14, 10, 'm');
  // Inner ellipse subtracted → crescent shape
  ellipse(c, 30, 14, 9, 7, '.');
  // Right side cut to leave a curved profile
  rect(c, 38, 0, 26, 30, '.');
  // Hub block for haft
  rect(c, 32, 10, 5, 10, 'm');
  // Connect crescent tip to hub on top
  for (let x = 18; x <= 38; x++) px(c, x, 5, 'm');
  for (let x = 22; x <= 38; x++) px(c, x, 6, 'm');
  // Connect on bottom
  for (let x = 22; x <= 38; x++) px(c, x, 20, 'm');
  // Sharp inner curve highlight
  for (let y = 9; y <= 17; y++) px(c, 32, y, 'h');
  // Outer arc edge highlight
  px(c, 17, 9, 'l'); px(c, 16, 11, 'l'); px(c, 16, 13, 'l'); px(c, 16, 15, 'l'); px(c, 17, 17, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}

const PALETTE_AXE_HEAD_STEEL = {
  o: '#0a0d12',
  s: '#3a4655',
  m: '#6f7e91',
  l: '#aebcd0',
  h: '#e2eaf6',
};
const ROLES_AXE_HEAD = {
  o: 'outline',
  s: 'shadow',
  m: 'mid',
  l: 'light',
  h: 'highlight',
};

// === AXE HANDLES (64×64) ===
// Vertical shaft cols 30-33, rows 18-58. Wood grain, bone, or reinforced metal.

function buildAxeHandleWood() {
  const c = makeCanvas(64, 64);
  // Vertical wooden shaft
  rect(c, 30, 19, 4, 40, 'm');
  // Wood grain: long highlights on left, shadows on right
  vline(c, 30, 20, 57, 'l');
  vline(c, 33, 20, 57, 's');
  // Knots / striations every 8 rows
  px(c, 31, 26, 's'); px(c, 32, 27, 's');
  px(c, 31, 35, 's'); px(c, 32, 36, 's');
  px(c, 31, 44, 's'); px(c, 32, 45, 's');
  px(c, 31, 53, 's'); px(c, 32, 54, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildAxeHandleBone() {
  const c = makeCanvas(64, 64);
  rect(c, 30, 19, 4, 40, 'm');
  vline(c, 30, 20, 57, 'l');
  vline(c, 33, 20, 57, 's');
  // Bone ridges
  for (let y = 22; y <= 56; y += 4) {
    px(c, 30, y, 'h');
    px(c, 33, y, 's');
  }
  outline(c, 'o');
  return canvasToLayout(c);
}

const PALETTE_HANDLE_WOOD = {
  o: '#1a0a04', s: '#3a1d0c', m: '#5a3018', l: '#8a5028', h: '#a06820',
};
const PALETTE_HANDLE_BONE = {
  o: '#30281d', s: '#6d6048', m: '#a99876', l: '#d7c7a4', h: '#f1e8cf',
};
// Handles are intentionally NOT retinted (they're not the weapon's "material"
// — the head's material is what defines the axe).

// === AXE WRAPS (64×64) ===
// Decorative binding at the grip area, rows 45-55, cols 28-35.

function buildAxeWrapLeather() {
  const c = makeCanvas(64, 64);
  // Wider grip area
  rect(c, 28, 45, 8, 10, 'm');
  // Diagonal leather bands alternating dark/light
  for (let row = 45; row <= 54; row += 2) {
    hline(c, 28, 35, row, 's');
    hline(c, 28, 35, row + 1, 'm');
  }
  // Edge highlights
  vline(c, 28, 46, 54, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildAxeWrapCord() {
  const c = makeCanvas(64, 64);
  rect(c, 28, 45, 8, 10, 'm');
  // Cord wraps: tighter pattern (rope coils)
  for (let row = 45; row <= 54; row++) {
    if (row % 2 === 0) {
      hline(c, 28, 35, row, 's');
      px(c, 29, row, 'l');
      px(c, 34, row, 'l');
    } else {
      hline(c, 28, 35, row, 'm');
    }
  }
  outline(c, 'o');
  return canvasToLayout(c);
}

const PALETTE_WRAP_LEATHER = { o: '#0e0805', s: '#2a1810', m: '#5a3818', l: '#8a5828' };
const PALETTE_WRAP_CORD    = { o: '#1a1408', s: '#3a2818', m: '#6a4828', l: '#9a7848' };

export const HD_AXE_HEADS = [
  {
    id: 'single',   name: 'Tête Simple HD',   weight: 18,
    layout: buildAxeHeadSingle(),   palette: PALETTE_AXE_HEAD_STEEL, roles: ROLES_AXE_HEAD,
    statBias: { damage: [15, 28], armor: [2, 5] },
    tags: ['balanced', 'heavy'],
  },
  {
    id: 'double',   name: 'Tête Double HD',   weight: 12,
    layout: buildAxeHeadDouble(),   palette: PALETTE_AXE_HEAD_STEEL, roles: ROLES_AXE_HEAD,
    statBias: { damage: [18, 32], crit: [3, 7] },
    tags: ['heavy', 'aggressive'],
  },
  {
    id: 'crescent', name: 'Tête Croissant HD', weight: 8,
    layout: buildAxeHeadCrescent(), palette: PALETTE_AXE_HEAD_STEEL, roles: ROLES_AXE_HEAD,
    statBias: { damage: [12, 24], crit: [5, 10], speed: [1, 3] },
    tags: ['curved', 'precision'],
  },
];

export const HD_AXE_HANDLES = [
  {
    id: 'wood', name: 'Manche Bois HD', weight: 24,
    layout: buildAxeHandleWood(), palette: PALETTE_HANDLE_WOOD,
    statBias: { armor: [1, 3] },
    tags: ['wood'],
  },
  {
    id: 'bone', name: 'Manche Os HD',  weight: 8,
    layout: buildAxeHandleBone(), palette: PALETTE_HANDLE_BONE,
    statBias: { vitality: [3, 6] },
    tags: ['organic', 'pale'],
  },
];

export const HD_AXE_WRAPS = [
  {
    id: 'leather', name: 'Sangle Cuir HD', weight: 20,
    layout: buildAxeWrapLeather(), palette: PALETTE_WRAP_LEATHER,
    tags: ['leather'],
  },
  {
    id: 'cord',    name: 'Sangle Corde HD', weight: 12,
    layout: buildAxeWrapCord(),    palette: PALETTE_WRAP_CORD,
    tags: ['cord'],
  },
];

// === WAND HEADS (64×64) ===
// Heads sit at the top of the staff (rows 0-16, centered cols 26-37).
// Distinct ornamental shapes — orbs, crystals, claws.

function buildWandHeadOrb() {
  const c = makeCanvas(64, 64);
  // Large glowing orb at the very top
  ellipse(c, 31, 8, 7, 6, 'm');
  ellipse(c, 30, 7, 4, 3, 'l');
  px(c, 29, 6, 'h'); px(c, 30, 5, 'h');
  // Mounting prongs (4 small spikes around the orb)
  px(c, 24, 13, 'm'); px(c, 38, 13, 'm');
  px(c, 25, 14, 's'); px(c, 37, 14, 's');
  // Decorative collar below orb
  rect(c, 28, 16, 6, 2, 'm');
  hline(c, 28, 33, 16, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildWandHeadCrystal() {
  const c = makeCanvas(64, 64);
  // Crystal cluster at top — angular shape
  // Main central crystal (vertical lozenge)
  px(c, 31, 2, 'h');
  px(c, 30, 3, 'l'); px(c, 31, 3, 'h'); px(c, 32, 3, 'l');
  px(c, 29, 4, 'm'); px(c, 30, 4, 'l'); px(c, 31, 4, 'h'); px(c, 32, 4, 'l'); px(c, 33, 4, 'm');
  rect(c, 28, 5, 8, 5, 'm');
  px(c, 29, 5, 'l'); px(c, 30, 5, 'h'); px(c, 31, 5, 'h'); px(c, 32, 5, 'l');
  px(c, 30, 6, 'l');
  px(c, 30, 7, 'l');
  // Side crystals (smaller)
  px(c, 25, 8, 'm'); px(c, 24, 9, 's');
  px(c, 37, 8, 'm'); px(c, 38, 9, 's');
  // Tapered point at bottom
  rect(c, 29, 10, 6, 3, 'm');
  rect(c, 30, 13, 4, 2, 'm');
  // Bindings to shaft
  rect(c, 29, 15, 6, 2, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildWandHeadClaw() {
  const c = makeCanvas(64, 64);
  // 3 claws holding a small gem
  // Left claw
  px(c, 26, 4, 'm'); px(c, 26, 5, 'm'); px(c, 27, 6, 'm'); px(c, 28, 7, 'm');
  // Right claw
  px(c, 36, 4, 'm'); px(c, 36, 5, 'm'); px(c, 35, 6, 'm'); px(c, 34, 7, 'm');
  // Center claw
  px(c, 31, 2, 'm'); px(c, 31, 3, 'm'); px(c, 31, 4, 'm');
  // Held gem (kept out of roles → keeps red color through retint)
  rect(c, 30, 8, 4, 4, 'A');
  px(c, 30, 8, 'B'); px(c, 31, 8, 'B');
  // Base socket
  rect(c, 29, 13, 6, 3, 'm');
  hline(c, 29, 34, 13, 'l');
  // Bottom binding
  rect(c, 29, 16, 6, 1, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}

const PALETTE_WAND_HEAD_GOLD = {
  o: '#1a0e04',
  s: '#5a3818',
  m: '#c89020',
  l: '#ffe14a',
  h: '#fff8c8',
  A: '#7028a0',   // gem dark (out of roles → preserved through retint)
  B: '#c080ff',   // gem light
};
const ROLES_WAND_HEAD = {
  o: 'outline', s: 'shadow', m: 'mid', l: 'light', h: 'highlight',
};

// === WAND SHAFTS (64×64) ===
// Long vertical staff from rows 16-58 (about 42 px tall, dominant).

function buildWandShaftWood() {
  const c = makeCanvas(64, 64);
  rect(c, 30, 17, 4, 42, 'm');
  vline(c, 30, 18, 57, 'l');
  vline(c, 33, 18, 57, 's');
  // Wood knots
  px(c, 31, 24, 's'); px(c, 32, 25, 's');
  px(c, 31, 33, 's');
  px(c, 32, 42, 's');
  px(c, 31, 51, 's');
  // Decorative binding mid-shaft
  rect(c, 29, 36, 6, 2, 'd');
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildWandShaftRunic() {
  const c = makeCanvas(64, 64);
  rect(c, 30, 17, 4, 42, 'm');
  vline(c, 30, 18, 57, 'l');
  vline(c, 33, 18, 57, 's');
  // Glowing runes along the shaft (small accent pixels)
  px(c, 31, 25, 'a'); px(c, 32, 25, 'a');
  px(c, 31, 35, 'a');
  px(c, 32, 45, 'a');
  px(c, 31, 55, 'a'); px(c, 32, 55, 'a');
  outline(c, 'o');
  return canvasToLayout(c);
}

const PALETTE_WAND_SHAFT_WOOD  = { o: '#1a0a04', s: '#3a1d0c', m: '#5a3018', l: '#8a5028', d: '#3a2010' };
const PALETTE_WAND_SHAFT_RUNIC = { o: '#1a0a04', s: '#3a1d0c', m: '#5a3018', l: '#8a5028', a: '#a058ff' };

export const HD_WAND_HEADS = [
  {
    id: 'orb',     name: 'Tête Orbe HD',    weight: 22,
    layout: buildWandHeadOrb(),     palette: PALETTE_WAND_HEAD_GOLD, roles: ROLES_WAND_HEAD,
    statBias: { fireDmg: [6, 14], damage: [4, 9] },
    tags: ['magic', 'orb'],
  },
  {
    id: 'crystal', name: 'Tête Cristal HD', weight: 14,
    layout: buildWandHeadCrystal(), palette: PALETTE_WAND_HEAD_GOLD, roles: ROLES_WAND_HEAD,
    statBias: { fireDmg: [8, 18], crit: [2, 5] },
    tags: ['magic', 'crystal'],
  },
  {
    id: 'claw',    name: 'Tête Griffe HD',  weight: 8,
    layout: buildWandHeadClaw(),    palette: PALETTE_WAND_HEAD_GOLD, roles: ROLES_WAND_HEAD,
    statBias: { fireDmg: [5, 12], crit: [4, 9], damage: [3, 7] },
    tags: ['magic', 'gem', 'flashy'],
  },
];

export const HD_WAND_SHAFTS = [
  {
    id: 'wood',  name: 'Bâton Bois HD',   weight: 24,
    layout: buildWandShaftWood(),  palette: PALETTE_WAND_SHAFT_WOOD,
    statBias: { vitality: [3, 6] },
    tags: ['wood'],
  },
  {
    id: 'runic', name: 'Bâton Runique HD', weight: 10,
    layout: buildWandShaftRunic(), palette: PALETTE_WAND_SHAFT_RUNIC,
    statBias: { fireDmg: [3, 8] },
    tags: ['runic', 'magic'],
  },
];

// === DAGGER PARTS (64×64) — short blade, blade rows 10-30 ===
function buildDaggerBladeStraight() {
  const c = makeCanvas(64, 64);
  px(c, 31, 10, 'h'); px(c, 32, 10, 'h');
  rect(c, 30, 11, 4, 1, 'm');
  rect(c, 29, 12, 6, 18, 'm');
  vline(c, 30, 12, 28, 'l');
  vline(c, 29, 13, 28, 'h');
  vline(c, 34, 12, 29, 's');
  vline(c, 32, 14, 26, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildDaggerBladeCurved() {
  const c = makeCanvas(64, 64);
  for (let y = 10; y <= 29; y++) {
    const t = (y - 10) / 19;
    const baseX = Math.round(31 + 3 * Math.sin(t * Math.PI * 2));
    rect(c, baseX - 2, y, 5, 1, 'm');
    px(c, baseX - 2, y, 'h');
    px(c, baseX, y, 'l');
    px(c, baseX + 2, y, 's');
  }
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildDaggerBladeJagged() {
  const c = makeCanvas(64, 64);
  px(c, 31, 10, 'h'); px(c, 32, 10, 'h');
  rect(c, 29, 11, 6, 19, 'm');
  vline(c, 30, 12, 28, 'l');
  vline(c, 29, 12, 28, 'h');
  vline(c, 34, 12, 29, 's');
  for (let y = 13; y <= 28; y += 3) { px(c, 35, y, 'm'); px(c, 36, y, 's'); }
  vline(c, 32, 14, 27, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_DAGGER_STEEL = { o: '#0a0d12', s: '#3a4655', m: '#6f7e91', l: '#aebcd0', h: '#e2eaf6' };
const ROLES_DAGGER = { o: 'outline', s: 'shadow', m: 'mid', l: 'light', h: 'highlight' };

function buildDaggerGuardStraight() {
  const c = makeCanvas(64, 64);
  rect(c, 26, 30, 12, 3, 'm');
  hline(c, 26, 37, 30, 'l');
  hline(c, 26, 37, 32, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildDaggerGuardSwept() {
  const c = makeCanvas(64, 64);
  rect(c, 27, 30, 10, 2, 'm');
  hline(c, 27, 36, 30, 'l');
  px(c, 26, 29, 'm'); px(c, 25, 28, 'l');
  px(c, 37, 29, 'm'); px(c, 38, 28, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_DAGGER_GUARD = { o: '#1a0e04', s: '#5a3818', m: '#9a7838', l: '#d0a848', h: '#ffe14a' };

function buildDaggerGrip() {
  const c = makeCanvas(64, 64);
  rect(c, 30, 33, 4, 12, 'm');
  for (let row = 33; row <= 44; row += 2) { hline(c, 30, 33, row, 's'); hline(c, 30, 33, row + 1, 'm'); }
  vline(c, 30, 34, 43, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_DAGGER_GRIP = { o: '#0e0805', s: '#2a1810', m: '#5a3818', l: '#8a5828' };

function buildDaggerPommelRound() {
  const c = makeCanvas(64, 64);
  ellipse(c, 31, 47, 3, 2, 'm');
  px(c, 30, 45, 'l'); px(c, 31, 45, 'h');
  hline(c, 29, 33, 49, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildDaggerPommelGem() {
  const c = makeCanvas(64, 64);
  ellipse(c, 31, 47, 3, 3, 'm');
  rect(c, 30, 46, 3, 2, 'A');
  px(c, 31, 46, 'B');
  px(c, 30, 44, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_DAGGER_POMMEL = { o: '#1a0e04', s: '#5a3818', m: '#9a7838', l: '#d0a848', h: '#ffe14a', A: '#1850a8', B: '#5aacff' };

const HD_DAGGER_BLADES = [
  { id: 'straight', name: 'Lame Droite HD', weight: 20, layout: buildDaggerBladeStraight(), palette: PALETTE_DAGGER_STEEL, roles: ROLES_DAGGER, statBias: { damage: [6, 14], crit: [5, 11], speed: [2, 5] }, tags: ['fast', 'precision'] },
  { id: 'curved', name: 'Lame Ondulée HD', weight: 12, layout: buildDaggerBladeCurved(), palette: PALETTE_DAGGER_STEEL, roles: ROLES_DAGGER, statBias: { damage: [7, 15], crit: [6, 13] }, tags: ['curved', 'aggressive'] },
  { id: 'jagged', name: 'Lame Dentelée HD', weight: 9, layout: buildDaggerBladeJagged(), palette: PALETTE_DAGGER_STEEL, roles: ROLES_DAGGER, statBias: { damage: [9, 18], poisonDmg: [3, 7] }, tags: ['serrated', 'brutal'] },
];
const HD_DAGGER_GUARDS = [
  { id: 'straight', name: 'Garde Courte HD', weight: 22, layout: buildDaggerGuardStraight(), palette: PALETTE_DAGGER_GUARD, roles: ROLES_DAGGER, statBias: { armor: [1, 3] }, tags: ['simple'] },
  { id: 'swept', name: 'Garde Recourbée HD', weight: 10, layout: buildDaggerGuardSwept(), palette: PALETTE_DAGGER_GUARD, roles: ROLES_DAGGER, statBias: { crit: [2, 5], speed: [1, 3] }, tags: ['swept'] },
];
const HD_DAGGER_GRIP = { id: 'wrapped', name: 'Poignée Cuir HD', layout: buildDaggerGrip(), palette: PALETTE_DAGGER_GRIP };
const HD_DAGGER_POMMELS = [
  { id: 'round', name: 'Pommeau Rond HD', weight: 20, layout: buildDaggerPommelRound(), palette: PALETTE_DAGGER_POMMEL, roles: ROLES_DAGGER, statBias: { armor: [1, 3] }, tags: ['simple'] },
  { id: 'gemmed', name: 'Pommeau Gemme HD', weight: 10, layout: buildDaggerPommelGem(), palette: PALETTE_DAGGER_POMMEL, roles: ROLES_DAGGER, statBias: { crit: [3, 6] }, tags: ['gem'] },
];

// === BOW PARTS (64×64) — sideways arc spanning rows 4-58, grip in middle ===
function buildBowLimbRecurve() {
  const c = makeCanvas(64, 64);
  for (let y = 6; y <= 58; y++) {
    const t = (y - 32) / 26;
    let x = 34 - Math.round(10 * (1 - t * t));
    if (y < 12) x += (12 - y);
    if (y > 52) x += (y - 52);
    rect(c, x, y, 3, 1, 'm');
    px(c, x, y, 'l');
    px(c, x + 2, y, 's');
  }
  for (let y = 8; y <= 56; y++) px(c, 40, y, 'd');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildBowLimbLong() {
  const c = makeCanvas(64, 64);
  for (let y = 4; y <= 59; y++) {
    const t = (y - 32) / 28;
    const x = 36 - Math.round(8 * (1 - t * t));
    rect(c, x, y, 3, 1, 'm');
    px(c, x, y, 'l');
    px(c, x + 2, y, 's');
  }
  for (let y = 6; y <= 57; y++) px(c, 41, y, 'd');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_BOW_WOOD = { o: '#1a0a04', s: '#3a1d0c', m: '#5a3018', l: '#8a5028', d: '#2a1808' };
const ROLES_BOW = { o: 'outline', s: 'shadow', m: 'mid', l: 'light' };

function buildBowGrip() {
  const c = makeCanvas(64, 64);
  rect(c, 22, 28, 5, 8, 'm');
  for (let row = 28; row <= 35; row += 2) { hline(c, 22, 26, row, 's'); hline(c, 22, 26, row + 1, 'm'); }
  vline(c, 22, 29, 34, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_BOW_GRIP = { o: '#0e0805', s: '#2a1810', m: '#5a3818', l: '#8a5828' };

function buildBowTips() {
  const c = makeCanvas(64, 64);
  px(c, 44, 5, 'l'); px(c, 45, 6, 'm'); px(c, 44, 7, 'l');
  px(c, 44, 57, 'l'); px(c, 45, 56, 'm'); px(c, 44, 55, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_BOW_TIPS = { o: '#1a0e04', m: '#c89020', l: '#ffe14a' };

const HD_BOW_LIMBS = [
  { id: 'recurve', name: 'Arc Recourbé HD', weight: 16, layout: buildBowLimbRecurve(), palette: PALETTE_BOW_WOOD, roles: ROLES_BOW, statBias: { damage: [8, 16], crit: [4, 9], speed: [2, 5] }, tags: ['recurve', 'fast'] },
  { id: 'long', name: 'Arc Long HD', weight: 14, layout: buildBowLimbLong(), palette: PALETTE_BOW_WOOD, roles: ROLES_BOW, statBias: { damage: [12, 22], crit: [3, 6] }, tags: ['longbow', 'power'] },
];
const HD_BOW_GRIPS = [
  { id: 'wrapped', name: 'Poignée Arc HD', weight: 24, layout: buildBowGrip(), palette: PALETTE_BOW_GRIP, statBias: { speed: [1, 3] }, tags: ['leather'] },
];
const HD_BOW_TIPS = [
  { id: 'gold', name: 'Embouts Dorés HD', weight: 18, layout: buildBowTips(), palette: PALETTE_BOW_TIPS, roles: { o: 'outline', m: 'mid', l: 'highlight' }, statBias: { goldFind: [3, 8] }, tags: ['flashy'] },
];

// =====================================================================
// === HD ARMOR PARTS (64×64) — helm, plate, tower shield ==============
// =====================================================================

const PALETTE_ARMOR_STEEL = { o: '#0a0d12', s: '#3a4655', m: '#6f7e91', l: '#aebcd0', h: '#e2eaf6' };
const ROLES_ARMOR = { o: 'outline', s: 'shadow', m: 'mid', l: 'light', h: 'highlight' };

// --- HELM crowns (dome top, rows 4-20) ---
function buildHelmCrownRounded() {
  const c = makeCanvas(64, 64);
  ellipse(c, 32, 18, 14, 14, 'm');
  rect(c, 0, 19, 64, 20, '.');        // keep top dome only
  ellipse(c, 30, 15, 10, 9, 'l');     // front-lit
  ellipse(c, 28, 12, 5, 4, 'h');      // highlight
  // Comb ridge along the top
  vline(c, 32, 5, 16, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildHelmCrownPointed() {
  const c = makeCanvas(64, 64);
  // Barbute-style pointed dome
  for (let y = 4; y <= 19; y++) {
    const w = Math.round((y - 4) * 0.95) + 2;
    rect(c, 32 - w, y, w * 2, 1, 'm');
  }
  // Front light
  for (let y = 7; y <= 18; y++) {
    const w = Math.round((y - 4) * 0.6);
    rect(c, 30 - w, y, w + 2, 1, 'l');
  }
  px(c, 28, 9, 'h'); px(c, 29, 10, 'h');
  outline(c, 'o');
  return canvasToLayout(c);
}

// --- HELM visors (eye band, rows 19-27) ---
function buildHelmVisorSlit() {
  const c = makeCanvas(64, 64);
  rect(c, 19, 19, 26, 8, 'm');
  hline(c, 19, 44, 19, 'l');
  hline(c, 19, 44, 26, 's');
  // Horizontal eye slit (dark)
  rect(c, 22, 22, 20, 2, 'o');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildHelmVisorT() {
  const c = makeCanvas(64, 64);
  rect(c, 19, 19, 26, 8, 'm');
  hline(c, 19, 44, 19, 'l');
  // T-shaped slit (cross): horizontal eye + vertical breathing slit
  rect(c, 22, 21, 20, 2, 'o');
  rect(c, 31, 21, 2, 6, 'o');
  outline(c, 'o');
  return canvasToLayout(c);
}

// --- HELM jaws (lower guard, rows 27-36) ---
function buildHelmJawFull() {
  const c = makeCanvas(64, 64);
  // Rounded chin guard
  ellipse(c, 32, 28, 12, 8, 'm');
  rect(c, 0, 0, 64, 28, '.');         // keep lower half
  ellipse(c, 31, 27, 9, 6, 'l');
  // Breathing holes
  px(c, 28, 31, 'o'); px(c, 32, 32, 'o'); px(c, 36, 31, 'o');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildHelmJawOpen() {
  const c = makeCanvas(64, 64);
  // Open-face cheek guards (two side pieces)
  rect(c, 20, 27, 6, 9, 'm');
  rect(c, 38, 27, 6, 9, 'm');
  vline(c, 20, 28, 35, 'l');
  vline(c, 38, 28, 35, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}

const HD_HELM_CROWNS = [
  { id: 'rounded', name: 'Dôme Arrondi HD', weight: 20, layout: buildHelmCrownRounded(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [4, 9], vitality: [2, 5] }, tags: ['knight'] },
  { id: 'pointed', name: 'Dôme Pointu HD', weight: 14, layout: buildHelmCrownPointed(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [5, 11] }, tags: ['barbute'] },
];
const HD_HELM_VISORS = [
  { id: 'slit', name: 'Visière Fente HD', weight: 20, layout: buildHelmVisorSlit(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [2, 5] }, tags: ['slit'] },
  { id: 'tee', name: 'Visière en T HD', weight: 12, layout: buildHelmVisorT(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [3, 6], crit: [1, 3] }, tags: ['tslit'] },
];
const HD_HELM_JAWS = [
  { id: 'full', name: 'Mentonnière HD', weight: 18, layout: buildHelmJawFull(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [3, 7], vitality: [2, 4] }, tags: ['closed'] },
  { id: 'open', name: 'Joues Ouvertes HD', weight: 12, layout: buildHelmJawOpen(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [1, 4], speed: [1, 2] }, tags: ['open'] },
];

// --- PLATE chest (breastplate, rows 14-36) ---
function buildPlateChestSmooth() {
  const c = makeCanvas(64, 64);
  rect(c, 20, 14, 24, 22, 'm');
  // Rounded top + bottom edges
  ellipse(c, 32, 14, 12, 4, 'm');
  ellipse(c, 32, 36, 12, 4, 'm');
  // Central highlight ridge
  rect(c, 30, 16, 4, 18, 'l');
  vline(c, 31, 16, 33, 'h');
  // Side shadows
  vline(c, 21, 16, 34, 's'); vline(c, 42, 16, 34, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildPlateChestMuscled() {
  const c = makeCanvas(64, 64);
  rect(c, 20, 14, 24, 22, 'm');
  ellipse(c, 32, 14, 12, 4, 'm');
  // Pectoral bulges
  ellipse(c, 26, 20, 5, 4, 'l'); ellipse(c, 38, 20, 5, 4, 'l');
  px(c, 24, 18, 'h'); px(c, 36, 18, 'h');
  // Ab lines
  hline(c, 28, 36, 28, 's'); hline(c, 28, 36, 32, 's');
  vline(c, 32, 26, 34, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}

// --- PLATE shoulders (pauldrons, rows 10-22) ---
function buildPlateShouldersRound() {
  const c = makeCanvas(64, 64);
  ellipse(c, 18, 16, 6, 5, 'm'); ellipse(c, 46, 16, 6, 5, 'm');
  ellipse(c, 17, 14, 4, 3, 'l'); ellipse(c, 45, 14, 4, 3, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildPlateShouldersSpiked() {
  const c = makeCanvas(64, 64);
  ellipse(c, 18, 16, 6, 5, 'm'); ellipse(c, 46, 16, 6, 5, 'm');
  ellipse(c, 17, 14, 4, 3, 'l'); ellipse(c, 45, 14, 4, 3, 'l');
  // Spikes
  px(c, 16, 9, 'm'); px(c, 16, 10, 'l'); px(c, 17, 11, 'm');
  px(c, 48, 9, 'm'); px(c, 48, 10, 'l'); px(c, 47, 11, 'm');
  outline(c, 'o');
  return canvasToLayout(c);
}

// --- PLATE lower (faulds, rows 36-46) ---
function buildPlateLowerFaulds() {
  const c = makeCanvas(64, 64);
  rect(c, 22, 36, 20, 8, 'm');
  // Segmented bands
  hline(c, 22, 41, 38, 's'); hline(c, 22, 41, 41, 's');
  hline(c, 22, 41, 36, 'l');
  // Vertical division
  vline(c, 32, 37, 43, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildPlateLowerTassets() {
  const c = makeCanvas(64, 64);
  // Two hanging plates
  rect(c, 23, 36, 7, 9, 'm'); rect(c, 34, 36, 7, 9, 'm');
  hline(c, 23, 29, 36, 'l'); hline(c, 34, 40, 36, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}

const HD_PLATE_CHESTS = [
  { id: 'smooth', name: 'Plastron Lisse HD', weight: 20, layout: buildPlateChestSmooth(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [8, 16], vitality: [3, 7] }, tags: ['knight'] },
  { id: 'muscled', name: 'Plastron Musclé HD', weight: 12, layout: buildPlateChestMuscled(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [6, 13], damage: [2, 5] }, tags: ['heroic'] },
];
const HD_PLATE_SHOULDERS = [
  { id: 'round', name: 'Spallières Rondes HD', weight: 20, layout: buildPlateShouldersRound(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [3, 7] }, tags: ['round'] },
  { id: 'spiked', name: 'Spallières Cloutées HD', weight: 10, layout: buildPlateShouldersSpiked(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [2, 5], damage: [2, 4] }, tags: ['spiked'] },
];
const HD_PLATE_LOWERS = [
  { id: 'faulds', name: 'Tassettes HD', weight: 20, layout: buildPlateLowerFaulds(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [3, 7], vitality: [2, 4] }, tags: ['faulds'] },
  { id: 'tassets', name: 'Cuissots HD', weight: 12, layout: buildPlateLowerTassets(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [2, 6], speed: [1, 2] }, tags: ['tassets'] },
];

// --- TOWER shield (tall, rows 4-54) ---
function buildShieldBodyRound() {
  const c = makeCanvas(64, 64);
  // Rounded-top tall shield
  ellipse(c, 32, 16, 16, 14, 'm');
  rect(c, 16, 16, 32, 30, 'm');
  // Tapered bottom point
  for (let y = 46; y <= 56; y++) {
    const w = Math.round((56 - y) * 1.5);
    rect(c, 32 - w, y, w * 2, 1, 'm');
  }
  // Surface highlight
  rect(c, 22, 12, 8, 36, 'l');
  vline(c, 24, 10, 48, 'h');
  // Side shadows
  vline(c, 17, 18, 44, 's'); vline(c, 46, 18, 44, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildShieldBodyHeater() {
  const c = makeCanvas(64, 64);
  // Flat top, pointed bottom (heater shield)
  rect(c, 16, 8, 32, 32, 'm');
  for (let y = 40; y <= 56; y++) {
    const w = Math.round((56 - y) * 1.0);
    rect(c, 32 - w, y, w * 2, 1, 'm');
  }
  rect(c, 22, 10, 8, 30, 'l');
  vline(c, 24, 10, 42, 'h');
  vline(c, 17, 10, 38, 's'); vline(c, 46, 10, 38, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}

function buildShieldRimPlain() {
  const c = makeCanvas(64, 64);
  // Border outline around the shield silhouette (approx)
  for (let y = 6; y <= 44; y++) { px(c, 15, y, 'l'); px(c, 48, y, 'l'); }
  hline(c, 16, 47, 7, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildShieldRimStudded() {
  const c = makeCanvas(64, 64);
  for (let y = 8; y <= 42; y += 6) { px(c, 16, y, 'h'); px(c, 47, y, 'h'); }
  for (let x = 18; x <= 46; x += 6) px(c, x, 9, 'h');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_SHIELD_RIM = { o: '#1a0e04', m: '#c89020', l: '#ffe14a', h: '#fff8c8' };

function buildShieldBossRound() {
  const c = makeCanvas(64, 64);
  ellipse(c, 32, 26, 6, 6, 'm');
  ellipse(c, 31, 25, 4, 4, 'l');
  px(c, 30, 23, 'h');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildShieldBossCross() {
  const c = makeCanvas(64, 64);
  // Heraldic cross emblem
  rect(c, 30, 16, 4, 24, 'A');
  rect(c, 22, 24, 20, 4, 'A');
  px(c, 31, 17, 'B'); px(c, 23, 25, 'B');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_SHIELD_BOSS = { o: '#1a0e04', s: '#5a3818', m: '#c89020', l: '#ffe14a', h: '#fff8c8', A: '#a02030', B: '#ff5060' };

const HD_SHIELD_BODIES = [
  { id: 'round', name: 'Pavois Arrondi HD', weight: 18, layout: buildShieldBodyRound(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [10, 20], vitality: [4, 9] }, tags: ['tower'] },
  { id: 'heater', name: 'Écu Heater HD', weight: 14, layout: buildShieldBodyHeater(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [8, 16], crit: [2, 4] }, tags: ['heater'] },
];
const HD_SHIELD_RIMS = [
  { id: 'plain', name: 'Bordure Lisse HD', weight: 20, layout: buildShieldRimPlain(), palette: PALETTE_SHIELD_RIM, roles: { o: 'outline', m: 'mid', l: 'light', h: 'highlight' }, statBias: { armor: [2, 5] }, tags: ['plain'] },
  { id: 'studded', name: 'Bordure Cloutée HD', weight: 12, layout: buildShieldRimStudded(), palette: PALETTE_SHIELD_RIM, roles: { o: 'outline', m: 'mid', l: 'light', h: 'highlight' }, statBias: { armor: [3, 6], goldFind: [2, 5] }, tags: ['studded'] },
];
const HD_SHIELD_BOSSES = [
  { id: 'round', name: 'Umbo Rond HD', weight: 18, layout: buildShieldBossRound(), palette: PALETTE_SHIELD_BOSS, roles: { o: 'outline', s: 'shadow', m: 'mid', l: 'light', h: 'highlight' }, statBias: { armor: [2, 5] }, tags: ['round'] },
  { id: 'cross', name: 'Croix Héraldique HD', weight: 10, layout: buildShieldBossCross(), palette: PALETTE_SHIELD_BOSS, statBias: { armor: [2, 4], vitality: [3, 6] }, tags: ['heraldic'] },
];

// =====================================================================
// === HD CLOTH/LIGHT ARMOR + ACCESSORIES (cap, crown, tunic, robe,
//     buckler) — paper-doll alternatives to helm/plate/tower ==========
// =====================================================================

const ROLES_GENERIC = { o: 'outline', s: 'shadow', m: 'mid', l: 'light', h: 'highlight' };

// --- CAP (light cloth/leather hat) ---
function buildCapDomeSoft() {
  const c = makeCanvas(64, 64);
  ellipse(c, 32, 20, 13, 11, 'm');
  rect(c, 0, 21, 64, 18, '.');
  ellipse(c, 30, 17, 9, 7, 'l');
  ellipse(c, 28, 14, 4, 3, 'h');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildCapDomePointed() {
  const c = makeCanvas(64, 64);
  for (let y = 6; y <= 21; y++) {
    const w = Math.round((y - 4) * 0.8) + 1;
    rect(c, 32 - w, y, w * 2, 1, 'm');
  }
  for (let y = 9; y <= 20; y++) { const w = Math.round((y - 4) * 0.5); rect(c, 30 - w, y, w + 2, 1, 'l'); }
  // floppy tip
  px(c, 36, 5, 'm'); px(c, 38, 4, 'm');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildCapBrim() {
  const c = makeCanvas(64, 64);
  rect(c, 17, 21, 30, 3, 'm');
  hline(c, 17, 46, 21, 'l');
  hline(c, 17, 46, 23, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildCapAccentFeather() {
  const c = makeCanvas(64, 64);
  // Feather sticking up on the right
  for (let y = 4; y <= 16; y++) { px(c, 44 + Math.floor((16 - y) / 3), y, 'A'); }
  px(c, 45, 6, 'B'); px(c, 44, 10, 'B');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildCapAccentBand() {
  const c = makeCanvas(64, 64);
  rect(c, 19, 19, 26, 2, 'A');
  px(c, 31, 19, 'B'); px(c, 32, 19, 'B');
  return canvasToLayout(c);
}
const PALETTE_CAP_CLOTH = { o: '#1a1420', s: '#3a2a44', m: '#5a4068', l: '#8a68a0', h: '#b894c8' };
const PALETTE_CAP_ACCENT = { o: '#1a0e04', A: '#c0392b', B: '#ff7060' };

const HD_CAP_DOMES = [
  { id: 'soft', name: 'Coiffe Souple HD', weight: 20, layout: buildCapDomeSoft(), palette: PALETTE_CAP_CLOTH, roles: ROLES_GENERIC, statBias: { vitality: [3, 7], speed: [1, 3] }, tags: ['cloth'] },
  { id: 'pointed', name: 'Chapeau Pointu HD', weight: 12, layout: buildCapDomePointed(), palette: PALETTE_CAP_CLOTH, roles: ROLES_GENERIC, statBias: { fireDmg: [2, 6], vitality: [2, 4] }, tags: ['mage'] },
];
const HD_CAP_BRIMS = [
  { id: 'flat', name: 'Bord Plat HD', weight: 22, layout: buildCapBrim(), palette: PALETTE_CAP_CLOTH, roles: ROLES_GENERIC, statBias: { armor: [1, 3] }, tags: ['brim'] },
];
const HD_CAP_ACCENTS = [
  { id: 'feather', name: 'Plume HD', weight: 14, layout: buildCapAccentFeather(), palette: PALETTE_CAP_ACCENT, statBias: { goldFind: [3, 7] }, tags: ['feather'] },
  { id: 'band', name: 'Bandeau HD', weight: 16, layout: buildCapAccentBand(), palette: PALETTE_CAP_ACCENT, statBias: { crit: [1, 4] }, tags: ['band'] },
];

// --- CROWN (royal headpiece) ---
function buildCrownBand() {
  const c = makeCanvas(64, 64);
  rect(c, 20, 16, 24, 6, 'm');
  hline(c, 20, 43, 16, 'h');
  hline(c, 20, 43, 21, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildCrownSpikesTall() {
  const c = makeCanvas(64, 64);
  // 5 tall spikes
  for (const x of [22, 27, 32, 37, 42]) {
    const h = (x === 32) ? 10 : 6;
    for (let dy = 0; dy < h; dy++) {
      const w = Math.max(0, Math.floor((h - dy) / 3));
      rect(c, x - w, 16 - dy, w * 2 + 1, 1, 'm');
    }
    px(c, x, 16 - h + 1, 'h');
  }
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildCrownSpikesShort() {
  const c = makeCanvas(64, 64);
  for (const x of [23, 29, 35, 41]) {
    px(c, x, 11, 'm'); px(c, x, 12, 'm'); px(c, x, 13, 'l'); px(c, x, 14, 'm'); px(c, x, 15, 'm');
    px(c, x, 11, 'h');
  }
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildCrownGem() {
  const c = makeCanvas(64, 64);
  rect(c, 30, 17, 4, 4, 'A');
  px(c, 30, 17, 'B'); px(c, 31, 17, 'B');
  // side gems
  px(c, 24, 18, 'A'); px(c, 40, 18, 'A');
  return canvasToLayout(c);
}
const PALETTE_CROWN_GOLD = { o: '#1a0e04', s: '#7a4818', m: '#c89020', l: '#ffe14a', h: '#fff8c8' };
const PALETTE_CROWN_GEM = { o: '#0a0418', A: '#1850a8', B: '#5aacff' };

const HD_CROWN_BANDS = [
  { id: 'band', name: 'Cercle d\'Or HD', weight: 24, layout: buildCrownBand(), palette: PALETTE_CROWN_GOLD, roles: ROLES_GENERIC, statBias: { armor: [2, 5], goldFind: [5, 12] }, tags: ['royal'] },
];
const HD_CROWN_SPIKES = [
  { id: 'tall', name: 'Pointes Hautes HD', weight: 16, layout: buildCrownSpikesTall(), palette: PALETTE_CROWN_GOLD, roles: ROLES_GENERIC, statBias: { vitality: [4, 9] }, tags: ['tall'] },
  { id: 'short', name: 'Pointes Basses HD', weight: 14, layout: buildCrownSpikesShort(), palette: PALETTE_CROWN_GOLD, roles: ROLES_GENERIC, statBias: { crit: [2, 5] }, tags: ['short'] },
];
const HD_CROWN_GEMS = [
  { id: 'sapphire', name: 'Saphir HD', weight: 18, layout: buildCrownGem(), palette: PALETTE_CROWN_GEM, statBias: { fireDmg: [3, 8], crit: [2, 4] }, tags: ['gem'] },
];

// --- TUNIC (cloth shirt) ---
function buildTunicTorso() {
  const c = makeCanvas(64, 64);
  rect(c, 22, 14, 20, 22, 'm');
  ellipse(c, 32, 14, 10, 3, 'm');
  rect(c, 28, 14, 8, 6, 's');     // collar V
  rect(c, 24, 16, 4, 18, 'l');    // left highlight
  vline(c, 25, 17, 33, 'h');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildTunicSleeves() {
  const c = makeCanvas(64, 64);
  rect(c, 16, 16, 6, 14, 'm'); rect(c, 42, 16, 6, 14, 'm');
  vline(c, 16, 17, 29, 'l'); vline(c, 42, 17, 29, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildTunicBelt() {
  const c = makeCanvas(64, 64);
  rect(c, 22, 34, 20, 3, 'A');
  rect(c, 30, 34, 4, 3, 'B');     // buckle
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_TUNIC_CLOTH = { o: '#1a140a', s: '#3a2c18', m: '#6a5028', l: '#9a7840', h: '#c0a060' };
const PALETTE_TUNIC_BELT = { o: '#0e0805', A: '#3a2410', B: '#c89020' };

const HD_TUNIC_TORSOS = [
  { id: 'plain', name: 'Tunique HD', weight: 22, layout: buildTunicTorso(), palette: PALETTE_TUNIC_CLOTH, roles: ROLES_GENERIC, statBias: { armor: [3, 7], vitality: [3, 6] }, tags: ['cloth'] },
];
const HD_TUNIC_SLEEVES = [
  { id: 'plain', name: 'Manches HD', weight: 22, layout: buildTunicSleeves(), palette: PALETTE_TUNIC_CLOTH, roles: ROLES_GENERIC, statBias: { speed: [1, 3] }, tags: ['cloth'] },
];
const HD_TUNIC_BELTS = [
  { id: 'leather', name: 'Ceinture HD', weight: 22, layout: buildTunicBelt(), palette: PALETTE_TUNIC_BELT, statBias: { armor: [1, 3] }, tags: ['leather'] },
];

// --- ROBE (mage) ---
function buildRobeTop() {
  const c = makeCanvas(64, 64);
  // Shoulder yoke + collar
  rect(c, 20, 14, 24, 8, 'm');
  ellipse(c, 32, 14, 12, 3, 'm');
  rect(c, 29, 14, 6, 6, 's');     // collar
  rect(c, 22, 15, 4, 6, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildRobeBody() {
  const c = makeCanvas(64, 64);
  // Flowing robe widening downward
  for (let y = 20; y <= 44; y++) {
    const w = 9 + Math.floor((y - 20) * 0.35);
    rect(c, 32 - w, y, w * 2, 1, 'm');
  }
  // Fold highlights
  vline(c, 28, 22, 43, 'l'); vline(c, 36, 22, 43, 's');
  vline(c, 32, 22, 43, 'l');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildRobeTrim() {
  const c = makeCanvas(64, 64);
  // Glowing rune trim down the front + hem
  vline(c, 32, 22, 43, 'A');
  hline(c, 16, 47, 44, 'A');
  px(c, 32, 28, 'B'); px(c, 32, 36, 'B');
  return canvasToLayout(c);
}
const PALETTE_ROBE_CLOTH = { o: '#0a0a18', s: '#1a1a38', m: '#2a2a58', l: '#4848a0', h: '#7878d0' };
const PALETTE_ROBE_TRIM = { o: '#1a0e04', A: '#c89020', B: '#fff8c8' };

const HD_ROBE_TOPS = [
  { id: 'yoke', name: 'Épaules de Robe HD', weight: 22, layout: buildRobeTop(), palette: PALETTE_ROBE_CLOTH, roles: ROLES_GENERIC, statBias: { vitality: [4, 9], fireDmg: [2, 5] }, tags: ['mage'] },
];
const HD_ROBE_BODIES = [
  { id: 'flowing', name: 'Robe Flottante HD', weight: 22, layout: buildRobeBody(), palette: PALETTE_ROBE_CLOTH, roles: ROLES_GENERIC, statBias: { vitality: [5, 11], fireDmg: [3, 7] }, tags: ['mage'] },
];
const HD_ROBE_TRIMS = [
  { id: 'runic', name: 'Liseré Runique HD', weight: 18, layout: buildRobeTrim(), palette: PALETTE_ROBE_TRIM, statBias: { fireDmg: [4, 9], crit: [1, 3] }, tags: ['runic'] },
];

// --- BUCKLER (small round shield) ---
function buildBucklerBody() {
  const c = makeCanvas(64, 64);
  ellipse(c, 32, 30, 16, 16, 'm');
  ellipse(c, 29, 26, 10, 10, 'l');
  ellipse(c, 26, 22, 4, 4, 'h');
  vline(c, 17, 24, 36, 's'); vline(c, 47, 24, 36, 's');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildBucklerRim() {
  const c = makeCanvas(64, 64);
  ellipseOutline(c, 32, 30, 16, 16, 'h');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildBucklerBoss() {
  const c = makeCanvas(64, 64);
  ellipse(c, 32, 30, 5, 5, 'A');
  ellipse(c, 31, 29, 3, 3, 'B');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_BUCKLER_RIM = { o: '#1a0e04', m: '#9a7838', l: '#d0a848', h: '#ffe14a' };
const PALETTE_BUCKLER_BOSS = { o: '#0a0d12', s: '#3a4655', A: '#6f7e91', B: '#e2eaf6' };

const HD_BUCKLER_BODIES = [
  { id: 'round', name: 'Targe Ronde HD', weight: 20, layout: buildBucklerBody(), palette: PALETTE_ARMOR_STEEL, roles: ROLES_ARMOR, statBias: { armor: [5, 11], speed: [1, 3] }, tags: ['buckler'] },
];
const HD_BUCKLER_RIMS = [
  { id: 'gold', name: 'Bordure Dorée HD', weight: 18, layout: buildBucklerRim(), palette: PALETTE_BUCKLER_RIM, roles: { o: 'outline', m: 'mid', l: 'light', h: 'highlight' }, statBias: { armor: [2, 4], goldFind: [3, 6] }, tags: ['gold'] },
];
const HD_BUCKLER_BOSSES = [
  { id: 'round', name: 'Umbo HD', weight: 18, layout: buildBucklerBoss(), palette: PALETTE_BUCKLER_BOSS, roles: { o: 'outline', s: 'shadow', A: 'mid', B: 'highlight' }, statBias: { armor: [2, 5] }, tags: ['round'] },
];

// =====================================================================
// === HD ACCESSORIES (band, signet, pendant, talisman) ===============
// =====================================================================

// --- RING band (oval ring, centered rows 26-52) ---
function buildRingBand() {
  const c = makeCanvas(64, 64);
  // Outer band ring (slightly tilted oval)
  ellipseOutline(c, 32, 40, 11, 13, 'm');
  ellipseOutline(c, 32, 40, 10, 12, 'l');
  // Thickness shading on the lower-right
  px(c, 40, 46, 's'); px(c, 41, 44, 's'); px(c, 39, 48, 's');
  // Highlight on upper-left
  px(c, 24, 34, 'h'); px(c, 23, 37, 'h');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildRingBandThick() {
  const c = makeCanvas(64, 64);
  ellipseOutline(c, 32, 40, 12, 13, 'm');
  ellipseOutline(c, 32, 40, 10, 11, 's');  // inner shadow ring (thick band)
  ellipseOutline(c, 32, 40, 11, 12, 'l');
  px(c, 24, 34, 'h');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_RING_GOLD = { o: '#1a0e04', s: '#7a4818', m: '#c89020', l: '#ffe14a', h: '#fff8c8' };
const ROLES_RING = { o: 'outline', s: 'shadow', m: 'mid', l: 'light', h: 'highlight' };

// --- RING gem (mounted on top, rows 22-32) ---
function buildRingGemRound() {
  const c = makeCanvas(64, 64);
  ellipse(c, 32, 26, 5, 5, 'A');
  ellipse(c, 30, 24, 3, 3, 'B');
  px(c, 29, 23, 'C');
  // Prongs holding it
  px(c, 27, 30, 'm'); px(c, 37, 30, 'm');
  return canvasToLayout(c);
}
function buildSignetSeal() {
  const c = makeCanvas(64, 64);
  // Flat engraved seal face
  ellipse(c, 32, 26, 7, 5, 'm');
  ellipse(c, 32, 26, 5, 3, 's');
  // Engraved emblem (cross/star)
  px(c, 32, 24, 'l'); px(c, 32, 28, 'l'); px(c, 30, 26, 'l'); px(c, 34, 26, 'l');
  px(c, 28, 22, 'h');
  return canvasToLayout(c);
}
const PALETTE_GEM_RED = { o: '#1a0408', A: '#a02030', B: '#ff5060', C: '#ffd0d0' };
const PALETTE_SIGNET = { o: '#1a0e04', s: '#5a3818', m: '#c89020', l: '#ffe14a', h: '#fff8c8' };

const HD_BAND_RINGS = [
  { id: 'thin', name: 'Anneau Fin HD', weight: 22, layout: buildRingBand(), palette: PALETTE_RING_GOLD, roles: ROLES_RING, statBias: { crit: [2, 5], goldFind: [3, 7] }, tags: ['ring'] },
  { id: 'thick', name: 'Anneau Épais HD', weight: 14, layout: buildRingBandThick(), palette: PALETTE_RING_GOLD, roles: ROLES_RING, statBias: { armor: [2, 5], vitality: [2, 5] }, tags: ['ring'] },
];
const HD_BAND_GEMS = [
  { id: 'ruby', name: 'Rubis HD', weight: 18, layout: buildRingGemRound(), palette: PALETTE_GEM_RED, statBias: { fireDmg: [3, 8], damage: [2, 5] }, tags: ['gem'] },
];
const HD_SIGNET_RINGS = HD_BAND_RINGS;  // signets reuse band shapes
const HD_SIGNET_SEALS = [
  { id: 'seal', name: 'Sceau Gravé HD', weight: 18, layout: buildSignetSeal(), palette: PALETTE_SIGNET, roles: ROLES_RING, statBias: { goldFind: [5, 12], crit: [1, 3] }, tags: ['seal'] },
];

// --- PENDANT chain (links going up, rows 2-30) ---
function buildPendantChain() {
  const c = makeCanvas(64, 64);
  // Chain forming an inverted V from top
  for (let i = 0; i < 14; i++) {
    const y = 4 + i * 2;
    const spread = Math.round(i * 0.9);
    px(c, 32 - spread, y, 'm'); px(c, 33 - spread, y, 'l');
    px(c, 31 + spread, y, 'm'); px(c, 32 + spread, y, 'l');
  }
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildPendantBodyTeardrop() {
  const c = makeCanvas(64, 64);
  // Teardrop pendant hanging at the bottom
  ellipse(c, 32, 42, 8, 9, 'm');
  ellipse(c, 30, 40, 5, 6, 'l');
  px(c, 28, 37, 'h');
  // Pointed bottom
  px(c, 32, 52, 'm'); px(c, 32, 53, 's');
  // Bail (loop connecting to chain)
  ellipseOutline(c, 32, 32, 2, 2, 'm');
  // Inset gem
  ellipse(c, 32, 42, 3, 4, 'A');
  px(c, 31, 41, 'B');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_PENDANT_CHAIN = { o: '#1a0e04', m: '#9a7838', l: '#d0a848' };
const PALETTE_PENDANT_BODY = { o: '#1a0e04', s: '#7a4818', m: '#c89020', l: '#ffe14a', h: '#fff8c8', A: '#7028a0', B: '#c080ff' };

const HD_PENDANT_CHAINS = [
  { id: 'chain', name: 'Chaîne HD', weight: 24, layout: buildPendantChain(), palette: PALETTE_PENDANT_CHAIN, roles: { o: 'outline', m: 'mid', l: 'light' }, statBias: { vitality: [2, 5] }, tags: ['chain'] },
];
const HD_PENDANT_BODIES = [
  { id: 'teardrop', name: 'Larme HD', weight: 18, layout: buildPendantBodyTeardrop(), palette: PALETTE_PENDANT_BODY, roles: ROLES_RING, statBias: { fireDmg: [3, 8], vitality: [3, 6] }, tags: ['amulet'] },
];

// --- TALISMAN figure (symbolic charm) ---
function buildTalismanFigureEye() {
  const c = makeCanvas(64, 64);
  // All-seeing eye charm
  ellipse(c, 32, 40, 10, 7, 'm');
  ellipse(c, 32, 40, 8, 5, 'l');
  ellipse(c, 32, 40, 3, 3, 'A');     // iris
  px(c, 32, 40, 'B');                 // pupil
  // Bail
  ellipseOutline(c, 32, 31, 2, 2, 'm');
  outline(c, 'o');
  return canvasToLayout(c);
}
function buildTalismanFigureMoon() {
  const c = makeCanvas(64, 64);
  // Crescent moon charm
  ellipse(c, 32, 40, 9, 9, 'm');
  ellipse(c, 35, 38, 7, 7, '.');     // subtract → crescent
  ellipse(c, 30, 40, 4, 5, 'l');
  ellipseOutline(c, 32, 30, 2, 2, 'm');
  outline(c, 'o');
  return canvasToLayout(c);
}
const PALETTE_TALISMAN = { o: '#0a0a18', s: '#1a1a38', m: '#4848a0', l: '#7878d0', h: '#b0b0f0', A: '#ffe14a', B: '#1a0a04' };

const HD_TALISMAN_CHAINS = HD_PENDANT_CHAINS;  // share
const HD_TALISMAN_FIGURES = [
  { id: 'eye', name: 'Œil HD', weight: 16, layout: buildTalismanFigureEye(), palette: PALETTE_TALISMAN, roles: ROLES_RING, statBias: { crit: [3, 7], fireDmg: [2, 5] }, tags: ['eye'] },
  { id: 'moon', name: 'Lune HD', weight: 14, layout: buildTalismanFigureMoon(), palette: PALETTE_TALISMAN, roles: ROLES_RING, statBias: { vitality: [4, 9], speed: [1, 3] }, tags: ['moon'] },
];

// Weapon-parts definition (mirrors the WEAPON_PARTS shape from parts.js)
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
  axe: {
    parts: [
      { type: 'head',   variants: HD_AXE_HEADS },
      { type: 'handle', variants: HD_AXE_HANDLES },
      { type: 'wrap',   variants: HD_AXE_WRAPS },
    ],
    drawOrder: ['handle', 'head', 'wrap'],
  },
  wand: {
    parts: [
      { type: 'head',  variants: HD_WAND_HEADS },
      { type: 'shaft', variants: HD_WAND_SHAFTS },
    ],
    drawOrder: ['shaft', 'head'],
  },
  dagger: {
    parts: [
      { type: 'blade',  variants: HD_DAGGER_BLADES },
      { type: 'guard',  variants: HD_DAGGER_GUARDS },
      { type: 'pommel', variants: HD_DAGGER_POMMELS },
    ],
    fixedLayers: { grip: HD_DAGGER_GRIP },
    drawOrder: ['blade', 'guard', '@grip', 'pommel'],
  },
  bow: {
    parts: [
      { type: 'limbs', variants: HD_BOW_LIMBS },
      { type: 'grip',  variants: HD_BOW_GRIPS },
      { type: 'tips',  variants: HD_BOW_TIPS },
    ],
    drawOrder: ['limbs', 'grip', 'tips'],
  },
  helm: {
    parts: [
      { type: 'crown', variants: HD_HELM_CROWNS },
      { type: 'visor', variants: HD_HELM_VISORS },
      { type: 'jaw',   variants: HD_HELM_JAWS },
    ],
    drawOrder: ['jaw', 'crown', 'visor'],
  },
  plate: {
    parts: [
      { type: 'chest',     variants: HD_PLATE_CHESTS },
      { type: 'shoulders', variants: HD_PLATE_SHOULDERS },
      { type: 'lower',     variants: HD_PLATE_LOWERS },
    ],
    drawOrder: ['lower', 'chest', 'shoulders'],
  },
  tower: {
    parts: [
      { type: 'body', variants: HD_SHIELD_BODIES },
      { type: 'rim',  variants: HD_SHIELD_RIMS },
      { type: 'boss', variants: HD_SHIELD_BOSSES },
    ],
    drawOrder: ['body', 'rim', 'boss'],
  },
  cap: {
    parts: [
      { type: 'dome',   variants: HD_CAP_DOMES },
      { type: 'brim',   variants: HD_CAP_BRIMS },
      { type: 'accent', variants: HD_CAP_ACCENTS },
    ],
    drawOrder: ['dome', 'brim', 'accent'],
  },
  crown: {
    parts: [
      { type: 'band',   variants: HD_CROWN_BANDS },
      { type: 'spikes', variants: HD_CROWN_SPIKES },
      { type: 'gem',    variants: HD_CROWN_GEMS },
    ],
    drawOrder: ['spikes', 'band', 'gem'],
  },
  tunic: {
    parts: [
      { type: 'torso',   variants: HD_TUNIC_TORSOS },
      { type: 'sleeves', variants: HD_TUNIC_SLEEVES },
      { type: 'belt',    variants: HD_TUNIC_BELTS },
    ],
    drawOrder: ['sleeves', 'torso', 'belt'],
  },
  robe: {
    parts: [
      { type: 'top',  variants: HD_ROBE_TOPS },
      { type: 'body', variants: HD_ROBE_BODIES },
      { type: 'trim', variants: HD_ROBE_TRIMS },
    ],
    drawOrder: ['body', 'top', 'trim'],
  },
  buckler: {
    parts: [
      { type: 'body', variants: HD_BUCKLER_BODIES },
      { type: 'rim',  variants: HD_BUCKLER_RIMS },
      { type: 'boss', variants: HD_BUCKLER_BOSSES },
    ],
    drawOrder: ['body', 'rim', 'boss'],
  },
  band: {
    parts: [
      { type: 'ring', variants: HD_BAND_RINGS },
      { type: 'gem',  variants: HD_BAND_GEMS },
    ],
    drawOrder: ['ring', 'gem'],
  },
  signet: {
    parts: [
      { type: 'ring', variants: HD_SIGNET_RINGS },
      { type: 'seal', variants: HD_SIGNET_SEALS },
    ],
    drawOrder: ['ring', 'seal'],
  },
  pendant: {
    parts: [
      { type: 'chain', variants: HD_PENDANT_CHAINS },
      { type: 'body',  variants: HD_PENDANT_BODIES },
    ],
    drawOrder: ['chain', 'body'],
  },
  talisman: {
    parts: [
      { type: 'chain',  variants: HD_TALISMAN_CHAINS },
      { type: 'figure', variants: HD_TALISMAN_FIGURES },
    ],
    drawOrder: ['chain', 'figure'],
  },
};

export function hasHDCompositionFor(weaponBaseTypeId) {
  return !!HD_WEAPON_PARTS[weaponBaseTypeId];
}

// === HD element overlays (phase 4H) ===
// Sparse 64×64 layouts that paint elemental signature pixels ON TOP of the
// composed HD weapon. Centered on the typical blade region (cols 26-37,
// rows 4-38) so they read cleanly regardless of blade variant.

const HD_OVERLAY_PALETTES = {
  fire:      { d: '#7a1a08', m: '#ff6728', l: '#ffb347', g: '#fff0a8' },
  frost:     { d: '#145070', m: '#54cfff', l: '#b8f4ff', g: '#ffffff' },
  poison:    { d: '#174f18', m: '#4bc84a', l: '#a8ff6a', g: '#eaffc8' },
  lightning: { d: '#8a6400', m: '#ffd33d', l: '#fff08a', g: '#ffffff' },
  void:      { d: '#210840', m: '#6d34d7', l: '#a66cff', g: '#f0ddff' },
};

// --- Fire: bright glow at tip + embers along blade edges + floating sparks ---
function buildHDOverlayFire() {
  const c = makeCanvas(64, 64);
  // Tip halo
  px(c, 31, 4, 'g'); px(c, 32, 4, 'g');
  px(c, 30, 5, 'g'); px(c, 31, 5, 'l'); px(c, 32, 5, 'l'); px(c, 33, 5, 'g');
  px(c, 30, 6, 'l'); px(c, 33, 6, 'l');
  // Left edge embers
  px(c, 27, 10, 'm'); px(c, 26, 11, 'd');
  px(c, 28, 14, 'l'); px(c, 27, 15, 'm');
  px(c, 28, 19, 'm'); px(c, 27, 20, 'd');
  px(c, 28, 24, 'l');
  px(c, 27, 29, 'm'); px(c, 28, 30, 'd');
  px(c, 28, 34, 'l'); px(c, 27, 35, 'm');
  // Right edge embers
  px(c, 36, 11, 'l'); px(c, 37, 12, 'm');
  px(c, 35, 16, 'm');
  px(c, 36, 21, 'l'); px(c, 37, 22, 'd');
  px(c, 35, 26, 'm');
  px(c, 36, 31, 'l'); px(c, 37, 32, 'm');
  px(c, 35, 36, 'd');
  // Floating embers (off-blade sparks)
  px(c, 24, 8, 'g'); px(c, 25, 9, 'l');
  px(c, 39, 13, 'g'); px(c, 38, 14, 'l');
  px(c, 23, 18, 'g'); px(c, 40, 23, 'g');
  px(c, 22, 28, 'l'); px(c, 41, 30, 'l');
  return canvasToLayout(c);
}

// --- Frost: ice crystals along the blade + sparkles ---
function buildHDOverlayFrost() {
  const c = makeCanvas(64, 64);
  // Tip crystal cluster
  px(c, 30, 4, 'g'); px(c, 32, 4, 'g'); px(c, 31, 5, 'g');
  px(c, 29, 6, 'l'); px(c, 33, 6, 'l');
  px(c, 30, 7, 'm'); px(c, 32, 7, 'm');
  // Crystals on left edge (4-pixel snowflake shapes)
  px(c, 27, 12, 'l'); px(c, 26, 13, 'g'); px(c, 27, 14, 'l');
  px(c, 26, 19, 'l'); px(c, 27, 20, 'g');
  px(c, 28, 25, 'l'); px(c, 27, 26, 'g'); px(c, 28, 27, 'l');
  px(c, 27, 32, 'm'); px(c, 26, 33, 'l');
  // Crystals on right edge
  px(c, 36, 11, 'g'); px(c, 37, 12, 'l');
  px(c, 36, 17, 'l'); px(c, 37, 18, 'g'); px(c, 36, 19, 'l');
  px(c, 35, 23, 'm');
  px(c, 36, 29, 'l'); px(c, 37, 30, 'g');
  px(c, 36, 34, 'm'); px(c, 35, 35, 'l');
  // Floating snowflakes
  px(c, 22, 14, 'g'); px(c, 41, 19, 'g');
  px(c, 23, 27, 'g'); px(c, 40, 31, 'g');
  px(c, 21, 8, 'l'); px(c, 42, 12, 'l');
  return canvasToLayout(c);
}

// --- Poison: green droplets dripping along the blade ---
function buildHDOverlayPoison() {
  const c = makeCanvas(64, 64);
  // Tip drip
  px(c, 31, 6, 'l'); px(c, 32, 6, 'l');
  px(c, 31, 7, 'm'); px(c, 32, 7, 'g');
  // Left edge droplets
  px(c, 28, 12, 'm'); px(c, 27, 13, 'l'); px(c, 28, 14, 'g');
  px(c, 27, 19, 'm'); px(c, 28, 20, 'l');
  px(c, 28, 25, 'l'); px(c, 27, 26, 'm'); px(c, 28, 27, 'g');
  px(c, 27, 32, 'l');
  // Right edge droplets
  px(c, 35, 11, 'l'); px(c, 36, 12, 'm');
  px(c, 36, 17, 'l'); px(c, 35, 18, 'g'); px(c, 36, 19, 'm');
  px(c, 35, 24, 'm');
  px(c, 36, 29, 'l'); px(c, 35, 30, 'g'); px(c, 36, 31, 'm');
  px(c, 35, 35, 'l');
  // Center oozing
  px(c, 31, 16, 'm'); px(c, 32, 24, 'm');
  // Falling droplets below the blade
  px(c, 30, 40, 'g'); px(c, 33, 42, 'g');
  return canvasToLayout(c);
}

// --- Lightning: yellow zigzag arcing through the blade ---
function buildHDOverlayLightning() {
  const c = makeCanvas(64, 64);
  // Top glow
  px(c, 31, 4, 'g'); px(c, 32, 4, 'g');
  // Zigzag path from tip down to bottom (alternating left-right)
  const path = [
    [31, 6], [30, 7], [31, 8], [32, 9], [33, 10],
    [32, 12], [31, 13], [30, 14], [31, 16],
    [32, 17], [33, 18], [34, 19], [33, 21], [32, 22],
    [31, 23], [30, 25], [31, 26], [32, 27], [33, 28],
    [32, 30], [31, 31], [30, 33], [31, 34], [32, 35],
  ];
  for (const [x, y] of path) px(c, x, y, 'l');
  // Bright core pixels at corners (where the zigzag changes direction)
  px(c, 30, 7, 'g'); px(c, 33, 10, 'g'); px(c, 34, 19, 'g');
  px(c, 30, 25, 'g'); px(c, 30, 33, 'g');
  // Mid color glow around the path
  for (const [x, y] of path) {
    if (x > 26) px(c, x - 1, y, 'm');
    if (x < 37) px(c, x + 1, y, 'm');
  }
  // Floating sparks
  px(c, 24, 14, 'g'); px(c, 39, 20, 'g');
  px(c, 22, 27, 'l'); px(c, 41, 32, 'l');
  return canvasToLayout(c);
}

// --- Void: dark purple sparkles + tendrils + central glow ---
function buildHDOverlayVoid() {
  const c = makeCanvas(64, 64);
  // Tip dark halo
  px(c, 31, 5, 'g'); px(c, 32, 5, 'g');
  px(c, 30, 6, 'l'); px(c, 31, 6, 'd'); px(c, 32, 6, 'd'); px(c, 33, 6, 'l');
  px(c, 31, 7, 'm'); px(c, 32, 7, 'm');
  // Central void core (mid-blade)
  px(c, 31, 20, 'd'); px(c, 32, 20, 'd');
  px(c, 30, 21, 'l'); px(c, 31, 21, 'd'); px(c, 32, 21, 'd'); px(c, 33, 21, 'l');
  px(c, 30, 22, 'l'); px(c, 31, 22, 'g'); px(c, 32, 22, 'g'); px(c, 33, 22, 'l');
  px(c, 31, 23, 'd'); px(c, 32, 23, 'd');
  // Tendrils along edges
  px(c, 27, 12, 'm'); px(c, 28, 13, 'l');
  px(c, 36, 14, 'm'); px(c, 35, 15, 'l');
  px(c, 28, 28, 'l'); px(c, 27, 29, 'm');
  px(c, 35, 30, 'l'); px(c, 36, 31, 'm');
  // Sparkles in air
  px(c, 23, 10, 'g'); px(c, 41, 14, 'g');
  px(c, 22, 22, 'l'); px(c, 42, 26, 'l');
  px(c, 24, 32, 'g'); px(c, 40, 34, 'g');
  return canvasToLayout(c);
}

// --- HD AXE OVERLAYS (head zone rows 0-22, cols 14-38) ---

function buildHDOverlayFireAxe() {
  const c = makeCanvas(64, 64);
  // Cluster of embers on the blade edge (left side of head)
  px(c, 17, 9, 'g'); px(c, 16, 10, 'l'); px(c, 17, 11, 'g');
  px(c, 18, 13, 'l'); px(c, 17, 14, 'm'); px(c, 18, 15, 'l');
  px(c, 17, 17, 'g'); px(c, 16, 18, 'l');
  // Embers along the cutting edge
  px(c, 20, 8, 'm'); px(c, 21, 7, 'd');
  px(c, 22, 19, 'm'); px(c, 21, 20, 'd');
  // Floating embers
  px(c, 12, 12, 'g'); px(c, 13, 11, 'l');
  px(c, 11, 16, 'g'); px(c, 14, 18, 'l');
  px(c, 25, 4, 'g');
  return canvasToLayout(c);
}

function buildHDOverlayFrostAxe() {
  const c = makeCanvas(64, 64);
  // Crystals on the cutting edge
  px(c, 17, 9, 'g'); px(c, 18, 10, 'l');
  px(c, 16, 13, 'l'); px(c, 17, 14, 'g'); px(c, 18, 15, 'l');
  px(c, 17, 17, 'l'); px(c, 16, 18, 'm');
  // Frost rime on body
  px(c, 22, 9, 'g'); px(c, 26, 10, 'l');
  px(c, 24, 18, 'g'); px(c, 28, 19, 'l');
  // Floating snowflakes
  px(c, 12, 8, 'g'); px(c, 13, 15, 'g'); px(c, 11, 20, 'l');
  return canvasToLayout(c);
}

function buildHDOverlayPoisonAxe() {
  const c = makeCanvas(64, 64);
  px(c, 17, 12, 'l'); px(c, 18, 13, 'm'); px(c, 17, 14, 'g');
  px(c, 16, 16, 'l');
  px(c, 22, 10, 'm'); px(c, 26, 13, 'l');
  px(c, 24, 19, 'm'); px(c, 28, 20, 'l');
  // Falling droplets
  px(c, 18, 24, 'g'); px(c, 22, 26, 'l');
  return canvasToLayout(c);
}

function buildHDOverlayLightningAxe() {
  const c = makeCanvas(64, 64);
  // Arc traversing the head from top to bottom
  const path = [[24, 4], [22, 6], [20, 8], [18, 10], [17, 12], [19, 14], [20, 16], [18, 18], [17, 20], [19, 22]];
  for (const [x, y] of path) { px(c, x, y, 'l'); }
  // Bright cores at corners
  px(c, 22, 6, 'g'); px(c, 17, 12, 'g'); px(c, 19, 22, 'g');
  // Sparks around
  px(c, 26, 9, 'g'); px(c, 14, 14, 'g');
  return canvasToLayout(c);
}

function buildHDOverlayVoidAxe() {
  const c = makeCanvas(64, 64);
  // Void core mid-blade
  px(c, 18, 13, 'd'); px(c, 19, 13, 'd');
  px(c, 17, 14, 'l'); px(c, 18, 14, 'g'); px(c, 19, 14, 'g'); px(c, 20, 14, 'l');
  px(c, 18, 15, 'd'); px(c, 19, 15, 'd');
  // Tendrils
  px(c, 22, 9, 'm'); px(c, 26, 10, 'l');
  px(c, 24, 19, 'm'); px(c, 27, 21, 'l');
  // Sparkles
  px(c, 13, 7, 'g'); px(c, 12, 17, 'g'); px(c, 28, 5, 'l'); px(c, 29, 23, 'l');
  return canvasToLayout(c);
}

// --- HD WAND OVERLAYS (head zone rows 0-16, centered cols 28-34) ---

function buildHDOverlayFireWand() {
  const c = makeCanvas(64, 64);
  // Tip aura: bright glow above the head
  px(c, 30, 1, 'g'); px(c, 31, 0, 'g'); px(c, 32, 1, 'g');
  px(c, 29, 2, 'l'); px(c, 30, 2, 'l'); px(c, 31, 2, 'l'); px(c, 32, 2, 'l'); px(c, 33, 2, 'l');
  // Halo around the orb
  px(c, 27, 6, 'l'); px(c, 36, 6, 'l');
  px(c, 26, 9, 'm'); px(c, 37, 9, 'm');
  // Falling embers down the shaft
  px(c, 31, 20, 'g'); px(c, 32, 28, 'm'); px(c, 31, 38, 'g'); px(c, 32, 50, 'm');
  return canvasToLayout(c);
}

function buildHDOverlayFrostWand() {
  const c = makeCanvas(64, 64);
  // Frost halo around the head
  px(c, 31, 0, 'g');
  px(c, 28, 4, 'l'); px(c, 34, 4, 'l');
  px(c, 26, 8, 'g'); px(c, 37, 8, 'g');
  // Frost crystals on the head
  px(c, 30, 11, 'l'); px(c, 32, 11, 'l');
  // Tiny snowflakes near shaft
  px(c, 28, 25, 'g'); px(c, 35, 35, 'g'); px(c, 29, 45, 'l');
  return canvasToLayout(c);
}

function buildHDOverlayPoisonWand() {
  const c = makeCanvas(64, 64);
  // Bubbling drips dripping from the head
  px(c, 30, 14, 'l'); px(c, 32, 14, 'm');
  px(c, 31, 17, 'g'); px(c, 33, 19, 'l');
  px(c, 30, 22, 'm'); px(c, 32, 25, 'g');
  px(c, 31, 30, 'l');
  return canvasToLayout(c);
}

function buildHDOverlayLightningWand() {
  const c = makeCanvas(64, 64);
  // Lightning arcs jumping from the head
  px(c, 31, 0, 'g'); px(c, 30, 1, 'l'); px(c, 32, 1, 'l');
  // Arc 1 — to upper left
  px(c, 27, 3, 'l'); px(c, 25, 5, 'l'); px(c, 23, 7, 'g');
  // Arc 2 — to upper right
  px(c, 35, 3, 'l'); px(c, 37, 5, 'l'); px(c, 39, 7, 'g');
  // Sparks down the shaft
  px(c, 32, 25, 'l'); px(c, 30, 40, 'l');
  return canvasToLayout(c);
}

function buildHDOverlayVoidWand() {
  const c = makeCanvas(64, 64);
  // Dark void halo around the head
  px(c, 31, 1, 'd'); px(c, 30, 2, 'd'); px(c, 32, 2, 'd');
  px(c, 28, 5, 'l'); px(c, 34, 5, 'l');
  // Core void sphere overlay on the orb
  px(c, 31, 8, 'g'); px(c, 30, 9, 'd'); px(c, 32, 9, 'd');
  // Tendrils
  px(c, 26, 11, 'm'); px(c, 36, 11, 'm');
  // Sparkles down shaft
  px(c, 30, 25, 'g'); px(c, 33, 40, 'l'); px(c, 29, 50, 'g');
  return canvasToLayout(c);
}

// --- HD DAGGER OVERLAYS (blade rows 10-30, cols 29-34) ---
function buildHDOverlayFireDagger() {
  const c = makeCanvas(64, 64);
  px(c, 31, 9, 'g'); px(c, 32, 9, 'g');
  px(c, 30, 11, 'l'); px(c, 33, 12, 'm');
  px(c, 29, 15, 'm'); px(c, 34, 17, 'l');
  px(c, 30, 20, 'g'); px(c, 33, 23, 'm');
  px(c, 29, 26, 'l'); px(c, 27, 13, 'g'); px(c, 36, 19, 'g');
  return canvasToLayout(c);
}
function buildHDOverlayFrostDagger() {
  const c = makeCanvas(64, 64);
  px(c, 31, 9, 'g'); px(c, 30, 12, 'l'); px(c, 33, 13, 'g');
  px(c, 29, 17, 'l'); px(c, 34, 19, 'l'); px(c, 30, 23, 'g');
  px(c, 27, 14, 'g'); px(c, 36, 21, 'g'); px(c, 28, 25, 'l');
  return canvasToLayout(c);
}
function buildHDOverlayPoisonDagger() {
  const c = makeCanvas(64, 64);
  px(c, 30, 13, 'l'); px(c, 33, 15, 'm'); px(c, 29, 19, 'g');
  px(c, 34, 22, 'l'); px(c, 31, 26, 'm');
  px(c, 31, 32, 'g'); px(c, 32, 35, 'l');
  return canvasToLayout(c);
}
function buildHDOverlayLightningDagger() {
  const c = makeCanvas(64, 64);
  const path = [[31, 9], [30, 12], [32, 15], [33, 18], [31, 21], [30, 24], [32, 27]];
  for (const [x, y] of path) px(c, x, y, 'l');
  px(c, 30, 12, 'g'); px(c, 33, 18, 'g'); px(c, 32, 27, 'g');
  px(c, 27, 16, 'g'); px(c, 36, 22, 'l');
  return canvasToLayout(c);
}
function buildHDOverlayVoidDagger() {
  const c = makeCanvas(64, 64);
  px(c, 30, 17, 'd'); px(c, 31, 17, 'd');
  px(c, 29, 18, 'l'); px(c, 30, 18, 'g'); px(c, 31, 18, 'g'); px(c, 32, 18, 'l');
  px(c, 30, 19, 'd'); px(c, 31, 19, 'd');
  px(c, 27, 12, 'g'); px(c, 36, 15, 'g'); px(c, 28, 26, 'l'); px(c, 35, 24, 'l');
  return canvasToLayout(c);
}

// --- HD BOW OVERLAYS (along the limb arc, cols 22-40) ---
function buildHDOverlayFireBow() {
  const c = makeCanvas(64, 64);
  px(c, 38, 6, 'g'); px(c, 36, 9, 'l'); px(c, 33, 13, 'm');
  px(c, 25, 24, 'g'); px(c, 24, 32, 'l'); px(c, 25, 40, 'g');
  px(c, 33, 51, 'm'); px(c, 36, 55, 'l'); px(c, 38, 58, 'g');
  return canvasToLayout(c);
}
function buildHDOverlayFrostBow() {
  const c = makeCanvas(64, 64);
  px(c, 37, 7, 'g'); px(c, 34, 12, 'l'); px(c, 26, 23, 'g');
  px(c, 24, 32, 'l'); px(c, 26, 41, 'g'); px(c, 34, 52, 'l'); px(c, 37, 57, 'g');
  return canvasToLayout(c);
}
function buildHDOverlayPoisonBow() {
  const c = makeCanvas(64, 64);
  px(c, 35, 10, 'l'); px(c, 26, 24, 'm'); px(c, 25, 33, 'g');
  px(c, 26, 42, 'l'); px(c, 35, 53, 'm');
  return canvasToLayout(c);
}
function buildHDOverlayLightningBow() {
  const c = makeCanvas(64, 64);
  // Arc along the string (col 40)
  px(c, 40, 12, 'l'); px(c, 39, 20, 'g'); px(c, 41, 28, 'l');
  px(c, 39, 36, 'g'); px(c, 41, 44, 'l'); px(c, 40, 52, 'g');
  px(c, 24, 32, 'g');
  return canvasToLayout(c);
}
function buildHDOverlayVoidBow() {
  const c = makeCanvas(64, 64);
  px(c, 24, 31, 'd'); px(c, 24, 32, 'g'); px(c, 24, 33, 'd');
  px(c, 23, 32, 'l'); px(c, 25, 32, 'l');
  px(c, 37, 9, 'g'); px(c, 37, 55, 'g'); px(c, 30, 20, 'l'); px(c, 30, 44, 'l');
  return canvasToLayout(c);
}

const HD_ELEMENT_OVERLAYS = {
  sword: {
    fire:      buildHDOverlayFire(),
    frost:     buildHDOverlayFrost(),
    poison:    buildHDOverlayPoison(),
    lightning: buildHDOverlayLightning(),
    void:      buildHDOverlayVoid(),
  },
  dagger: {
    fire:      buildHDOverlayFireDagger(),
    frost:     buildHDOverlayFrostDagger(),
    poison:    buildHDOverlayPoisonDagger(),
    lightning: buildHDOverlayLightningDagger(),
    void:      buildHDOverlayVoidDagger(),
  },
  bow: {
    fire:      buildHDOverlayFireBow(),
    frost:     buildHDOverlayFrostBow(),
    poison:    buildHDOverlayPoisonBow(),
    lightning: buildHDOverlayLightningBow(),
    void:      buildHDOverlayVoidBow(),
  },
  axe: {
    fire:      buildHDOverlayFireAxe(),
    frost:     buildHDOverlayFrostAxe(),
    poison:    buildHDOverlayPoisonAxe(),
    lightning: buildHDOverlayLightningAxe(),
    void:      buildHDOverlayVoidAxe(),
  },
  wand: {
    fire:      buildHDOverlayFireWand(),
    frost:     buildHDOverlayFrostWand(),
    poison:    buildHDOverlayPoisonWand(),
    lightning: buildHDOverlayLightningWand(),
    void:      buildHDOverlayVoidWand(),
  },
};

/**
 * Return the HD overlay layer for the given weapon type + element, or null.
 * Mirrors getElementOverlayLayer in elements.js but for 64×64 sources.
 */
export function getHDElementOverlayLayer(weaponBaseTypeId, elementId) {
  if (!elementId || elementId === 'none') return null;
  const overlays = HD_ELEMENT_OVERLAYS[weaponBaseTypeId];
  if (!overlays) return null;
  const layout = overlays[elementId];
  if (!layout) return null;
  const palette = HD_OVERLAY_PALETTES[elementId];
  if (!palette) return null;
  return { layout, palette, kind: 'element-overlay', elementId };
}
