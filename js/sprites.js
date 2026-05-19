// Hand-crafted pixel-art sprites rendered as inline SVG.
// Character and chest are now 64×64 with multi-level shading.
// Weapon parts stay 16×16 (parts.js) — rendered at 2× scale in the paper doll.
import { getCompositionLayers, hasCompositionFor } from './parts.js';

// === SPRITE BUILDER PRIMITIVES ===
// We build the 64×64 layouts procedurally then freeze them into string arrays.

function makeCanvas(w, h) {
  const grid = [];
  for (let y = 0; y < h; y++) grid.push(new Array(w).fill('.'));
  return { w, h, grid };
}

function px(c, x, y, ch) {
  if (x >= 0 && x < c.w && y >= 0 && y < c.h) c.grid[y][x] = ch;
}

function rect(c, x, y, w, h, ch) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) px(c, xx, yy, ch);
}

function ellipse(c, cx, cy, rx, ry, ch) {
  for (let yy = cy - ry; yy <= cy + ry; yy++) {
    for (let xx = cx - rx; xx <= cx + rx; xx++) {
      const dx = (xx - cx + 0.5) / (rx + 0.5);
      const dy = (yy - cy + 0.5) / (ry + 0.5);
      if (dx * dx + dy * dy <= 1) px(c, xx, yy, ch);
    }
  }
}

function ellipseOutline(c, cx, cy, rx, ry, ch) {
  for (let yy = cy - ry; yy <= cy + ry; yy++) {
    for (let xx = cx - rx; xx <= cx + rx; xx++) {
      const dx = (xx - cx + 0.5) / (rx + 0.5);
      const dy = (yy - cy + 0.5) / (ry + 0.5);
      const d = dx * dx + dy * dy;
      if (d <= 1 && d >= 0.62) px(c, xx, yy, ch);
    }
  }
}

function hline(c, x1, x2, y, ch) {
  for (let x = x1; x <= x2; x++) px(c, x, y, ch);
}

function vline(c, x, y1, y2, ch) {
  for (let y = y1; y <= y2; y++) px(c, x, y, ch);
}

// Add a 1-pixel outline around every non-transparent area using char ch.
function outline(c, ch) {
  const w = c.w, h = c.h;
  const orig = c.grid.map(r => r.slice());
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (orig[y][x] !== '.') continue;
      const n = [orig[y - 1]?.[x], orig[y + 1]?.[x], orig[y]?.[x - 1], orig[y]?.[x + 1]];
      if (n.some(v => v && v !== '.')) c.grid[y][x] = ch;
    }
  }
}

function canvasToLayout(c) {
  return c.grid.map(r => r.join(''));
}

// === CHARACTER 64×64 ===
// Palette codes:
//   o = outline (dark)
//   1-4 = hair (dark → highlight)
//   5-8 = skin (shadow → top light)
//   E = eye dark, W = eye white, m = mouth
//   K = armor shadow, A = armor mid, a = armor highlight, r = rivet gold
//   B = belt dark, b = belt mid, g = buckle gold, G = buckle highlight
//   P = pants dark, p = pants mid, q = pants highlight
//   S = boot dark, T = boot mid, U = boot highlight

function buildCharacterLayout() {
  const c = makeCanvas(64, 64);

  // === BODY/ARMOR ===
  // Pauldrons (rounded shoulders)
  ellipse(c, 23, 25, 5, 3, 'A');
  ellipse(c, 40, 25, 5, 3, 'A');
  ellipse(c, 23, 24, 4, 2, 'a');
  ellipse(c, 40, 24, 4, 2, 'a');
  // Chest plate (slightly narrower at top for tapered look)
  rect(c, 25, 25, 14, 16, 'A');
  rect(c, 24, 27, 16, 13, 'A');
  // Chest mid-highlight (vertical band)
  rect(c, 30, 26, 4, 12, 'a');
  // Chest side shadows
  rect(c, 24, 28, 2, 11, 'K');
  rect(c, 38, 28, 2, 11, 'K');
  // Neck V-collar
  px(c, 31, 25, 'K'); px(c, 32, 25, 'K');
  px(c, 30, 26, 'K'); px(c, 33, 26, 'K');
  px(c, 31, 26, '6'); px(c, 32, 26, '6');
  px(c, 31, 27, 'K'); px(c, 32, 27, 'K');
  // Rivets
  px(c, 26, 28, 'r'); px(c, 37, 28, 'r');
  px(c, 26, 38, 'r'); px(c, 37, 38, 'r');
  px(c, 31, 30, 'r'); px(c, 32, 30, 'r');
  px(c, 31, 35, 'r'); px(c, 32, 35, 'r');

  // Upper arms (skin showing below pauldrons)
  rect(c, 19, 28, 3, 11, '6');
  rect(c, 42, 28, 3, 11, '6');
  vline(c, 20, 29, 38, '7');
  vline(c, 43, 29, 38, '7');
  vline(c, 21, 30, 38, '5');
  vline(c, 42, 30, 38, '5');
  // Hands
  ellipse(c, 20, 40, 2, 2, '6');
  ellipse(c, 43, 40, 2, 2, '6');
  px(c, 19, 40, '5'); px(c, 44, 40, '5');
  px(c, 20, 39, '7'); px(c, 43, 39, '7');

  // === BELT ===
  rect(c, 23, 41, 18, 3, 'B');
  hline(c, 23, 40, 41, 'b');
  hline(c, 23, 40, 43, 'B');
  // Belt buckle
  rect(c, 30, 41, 4, 3, 'g');
  px(c, 31, 42, 'G'); px(c, 32, 42, 'G');
  px(c, 30, 41, 'o'); px(c, 33, 41, 'o');
  px(c, 30, 43, 'o'); px(c, 33, 43, 'o');

  // === LEGS (pants) ===
  // Left leg
  rect(c, 24, 44, 7, 14, 'P');
  vline(c, 25, 45, 56, 'p');
  vline(c, 26, 45, 55, 'q');
  vline(c, 30, 45, 56, 'P');
  // Right leg
  rect(c, 33, 44, 7, 14, 'P');
  vline(c, 34, 45, 56, 'p');
  vline(c, 35, 45, 55, 'q');
  vline(c, 39, 45, 56, 'P');
  // Knee highlights
  hline(c, 25, 28, 51, 'q');
  hline(c, 34, 37, 51, 'q');

  // === BOOTS ===
  // Left boot
  rect(c, 22, 58, 9, 4, 'T');
  hline(c, 22, 30, 58, 'U');
  hline(c, 22, 30, 61, 'S');
  px(c, 22, 58, 'o'); px(c, 30, 58, 'o');
  // Right boot
  rect(c, 33, 58, 9, 4, 'T');
  hline(c, 33, 41, 58, 'U');
  hline(c, 33, 41, 61, 'S');
  px(c, 33, 58, 'o'); px(c, 41, 58, 'o');

  // === HEAD (smaller, proportioned) ===
  ellipse(c, 32, 14, 7, 8, '6');
  ellipse(c, 31, 13, 5, 6, '7');
  ellipse(c, 30, 11, 3, 2, '8');
  // Jaw shadow
  hline(c, 28, 35, 21, '5');
  // Neck
  rect(c, 30, 22, 4, 3, '6');
  hline(c, 30, 33, 24, '5');
  px(c, 29, 23, '5'); px(c, 34, 23, '5');

  // === HAIR ===
  // Top cap
  ellipse(c, 32, 8, 9, 4, '2');
  // Mid hair
  ellipse(c, 32, 7, 8, 3, '3');
  // Highlight (top-left lit)
  ellipse(c, 30, 6, 5, 1, '4');
  // Side hair (over ears)
  rect(c, 24, 10, 2, 7, '2');
  rect(c, 38, 10, 2, 7, '2');
  px(c, 25, 11, '3'); px(c, 38, 11, '3');
  // Fringe pixels on forehead
  px(c, 27, 10, '2'); px(c, 36, 10, '2');
  px(c, 28, 9, '2'); px(c, 35, 9, '2');
  // Hair tips at temples
  px(c, 25, 17, '1'); px(c, 38, 17, '1');

  // === FACE FEATURES ===
  // Eyebrows
  hline(c, 27, 29, 12, '1');
  hline(c, 34, 36, 12, '1');
  // Eyes (whites + pupils)
  px(c, 27, 14, 'W'); px(c, 28, 14, 'E');
  px(c, 35, 14, 'E'); px(c, 36, 14, 'W');
  // Eye shadow under
  px(c, 27, 15, '5'); px(c, 28, 15, '5');
  px(c, 35, 15, '5'); px(c, 36, 15, '5');
  // Nose
  px(c, 31, 16, '5'); px(c, 31, 17, '5'); px(c, 32, 17, '5');
  px(c, 32, 16, '7');
  // Mouth
  px(c, 30, 19, 'm'); px(c, 31, 19, 'm'); px(c, 32, 19, 'm'); px(c, 33, 19, 'm');
  px(c, 30, 20, '5'); px(c, 33, 20, '5');

  // === OUTLINE PASS ===
  outline(c, 'o');

  // === CARVE BACK internal gaps the outline pass filled ===
  // Leg gap (between thighs and calves)
  rect(c, 31, 45, 2, 13, '.');
  // Restore inseam shading on the inner sides
  vline(c, 30, 45, 57, 'P');
  vline(c, 33, 45, 57, 'P');
  // Boot gap
  rect(c, 31, 58, 2, 4, '.');

  return canvasToLayout(c);
}

const CHARACTER_LAYOUT = buildCharacterLayout();

const CHARACTER_PALETTE = {
  o: '#0a0608',
  '1': '#1a0d08', '2': '#3a2418', '3': '#6a4628', '4': '#a07040',
  '5': '#a06a48', '6': '#d49872', '7': '#f0b890', '8': '#fdd8b0',
  E: '#1a1a22', W: '#f8f4e8', m: '#7a2a18',
  K: '#1a1828', A: '#48506a', a: '#7080a0', r: '#f5c842',
  B: '#2a1808', b: '#5a3a1a', g: '#d4a020', G: '#fff080',
  P: '#1a1828', p: '#383848', q: '#585870',
  S: '#1a0a04', T: '#3a1f0c', U: '#6a3818',
};

// === CHEST 64×64 ===
// Each tier (1-10) gets a unique decoration overlay on top of a shared
// base chest silhouette. Decoration colors come from per-tier palette keys
// X (bright accent), Y (mid accent), Z (dim accent), so the same overlay
// renders gold for T3, red for T5, white-blue for T6 Stellar, etc.

function buildBaseChestCanvas() {
  const c = makeCanvas(64, 64);

  // Body (lower box)
  rect(c, 10, 28, 44, 28, 'C');
  // Body highlight band (top)
  rect(c, 11, 29, 42, 2, 'H');
  // Body shadow band (bottom)
  rect(c, 11, 52, 42, 3, 'c');
  // Body left/right inner shadows
  vline(c, 10, 28, 55, 'c');
  vline(c, 53, 28, 55, 'c');

  // Wood plank lines on body
  vline(c, 22, 30, 53, 'c');
  vline(c, 32, 30, 53, 'c');
  vline(c, 42, 30, 53, 'c');
  vline(c, 23, 30, 53, 'H');
  vline(c, 33, 30, 53, 'H');
  vline(c, 43, 30, 53, 'H');

  // Lid (top section)
  ellipse(c, 32, 28, 24, 14, 'B');
  rect(c, 0, 28, 64, 4, '.');
  for (let yy = 8; yy <= 28; yy++) {
    for (let xx = 8; xx <= 56; xx++) {
      const dx = (xx - 32 + 0.5) / 24.5;
      const dy = (yy - 28 + 0.5) / 20.5;
      if (dx * dx + dy * dy <= 1 && yy <= 28) px(c, xx, yy, 'B');
    }
  }
  // Lid inner highlight
  for (let yy = 11; yy <= 27; yy++) {
    for (let xx = 11; xx <= 53; xx++) {
      const dx = (xx - 32 + 0.5) / 21.5;
      const dy = (yy - 28 + 0.5) / 17.5;
      if (dx * dx + dy * dy <= 1 && yy <= 27) px(c, xx, yy, 'L');
    }
  }
  // Lid top highlight
  for (let yy = 12; yy <= 22; yy++) {
    for (let xx = 14; xx <= 50; xx++) {
      const dx = (xx - 32 + 0.5) / 18.5;
      const dy = (yy - 22 + 0.5) / 10.5;
      if (dx * dx + dy * dy <= 1 && yy <= 22) px(c, xx, yy, 'H');
    }
  }
  // Lid plank lines (vertical)
  for (let yy = 12; yy <= 27; yy++) {
    const dx1 = (22 - 32 + 0.5) / 21.5;
    const dy1 = (yy - 28 + 0.5) / 17.5;
    if (dx1 * dx1 + dy1 * dy1 <= 1) px(c, 22, yy, 'B');
    px(c, 42, yy, 'B');
    px(c, 32, yy, 'B');
  }

  // Hinges/metal bands across lid base
  rect(c, 10, 28, 44, 2, 'M');
  hline(c, 10, 53, 30, 'h');
  rect(c, 12, 26, 4, 4, 'M');
  rect(c, 48, 26, 4, 4, 'M');
  px(c, 13, 27, 'h'); px(c, 14, 27, 'h');
  px(c, 49, 27, 'h'); px(c, 50, 27, 'h');
  px(c, 13, 28, 'r'); px(c, 50, 28, 'r');

  // Lock plate (centered)
  rect(c, 27, 36, 10, 12, 'M');
  rect(c, 28, 37, 8, 10, 'h');
  px(c, 27, 36, 'o'); px(c, 36, 36, 'o');
  px(c, 27, 47, 'o'); px(c, 36, 47, 'o');
  ellipse(c, 32, 41, 2, 2, 'k');
  rect(c, 31, 42, 3, 4, 'k');
  px(c, 32, 41, 'r');
  px(c, 29, 38, 'r'); px(c, 34, 38, 'r');
  px(c, 29, 46, 'r'); px(c, 34, 46, 'r');

  // Base shadow (under chest)
  hline(c, 10, 53, 56, 'o');
  hline(c, 11, 53, 57, 'c');

  return c;
}

// === DECORATION STAMPS — small reusable pixel shapes ===

// 4-pixel diamond gem with white center
function stampGem(c, cx, cy) {
  px(c, cx,   cy-1, 'X');
  px(c, cx-1, cy,   'Y'); px(c, cx, cy, 'X'); px(c, cx+1, cy, 'Y');
  px(c, cx,   cy+1, 'Y');
}

// 5-pixel star
function stampStar(c, cx, cy) {
  px(c, cx,   cy-1, 'X');
  px(c, cx-1, cy,   'Y'); px(c, cx, cy, 'X'); px(c, cx+1, cy, 'Y');
  px(c, cx,   cy+1, 'Y');
}

// 3×3 rune (cross pattern)
function stampRune(c, cx, cy) {
  px(c, cx,   cy-1, 'X');
  px(c, cx-1, cy,   'X'); px(c, cx, cy, 'Y'); px(c, cx+1, cy, 'X');
  px(c, cx,   cy+1, 'X');
}

// 2×2 sparkle dot
function stampSparkle(c, cx, cy) {
  px(c, cx, cy, 'X'); px(c, cx+1, cy, 'Y');
  px(c, cx, cy+1, 'Y'); px(c, cx+1, cy+1, 'Z');
}

// Crown silhouette (5 pixels wide) above the chest
function stampCrown(c, cx, cy) {
  // 3 spikes
  px(c, cx-2, cy-1, 'X');
  px(c, cx,   cy-2, 'X');
  px(c, cx+2, cy-1, 'X');
  // base
  hline(c, cx-2, cx+2, cy, 'Y');
}

function cloneCanvas(c) {
  return { w: c.w, h: c.h, grid: c.grid.map(r => r.slice()) };
}

// Apply tier-specific decorations to a (cloned) base canvas
function applyTierDecoration(c, tier) {
  switch (tier) {
    case 2: // Fer — extra horizontal metal bands
      hline(c, 12, 51, 36, 'M');
      hline(c, 12, 51, 37, 'h');
      hline(c, 12, 51, 48, 'M');
      hline(c, 12, 51, 49, 'h');
      break;
    case 3: // Or — gem on lid + corner sparkles
      stampGem(c, 32, 18);
      stampSparkle(c, 18, 14);
      stampSparkle(c, 44, 14);
      break;
    case 4: // Mythique — 4 runes on lid (purple)
      stampRune(c, 22, 18);
      stampRune(c, 42, 18);
      stampRune(c, 32, 12);
      break;
    case 5: // Ancestral — large red gem in lock + spikes on lid top
      // Bigger gem (3 wide)
      px(c, 31, 40, 'Y'); px(c, 32, 40, 'X'); px(c, 33, 40, 'Y');
      px(c, 31, 41, 'X'); px(c, 32, 41, 'X'); px(c, 33, 41, 'X');
      px(c, 31, 42, 'Y'); px(c, 32, 42, 'Y'); px(c, 33, 42, 'Y');
      // Lid spikes (top edge)
      px(c, 24, 8, 'X'); px(c, 32, 7, 'X'); px(c, 40, 8, 'X');
      break;
    case 6: // Stellaire — 4 stars on lid + 1 bright on top
      stampStar(c, 18, 18);
      stampStar(c, 46, 18);
      stampStar(c, 26, 14);
      stampStar(c, 38, 14);
      stampSparkle(c, 32, 10);
      break;
    case 7: // Cosmique — swirling rune cluster
      stampRune(c, 32, 16);
      stampSparkle(c, 22, 14);
      stampSparkle(c, 42, 14);
      stampSparkle(c, 18, 20);
      stampSparkle(c, 44, 20);
      break;
    case 8: // Vide — dark void glyph (uses Z dim accent)
      px(c, 32, 14, 'Z'); px(c, 30, 16, 'Z'); px(c, 34, 16, 'Z');
      px(c, 28, 18, 'Z'); px(c, 36, 18, 'Z');
      px(c, 30, 20, 'Z'); px(c, 34, 20, 'Z'); px(c, 32, 22, 'Z');
      // Hollow eye
      px(c, 31, 13, 'X'); px(c, 33, 13, 'X');
      break;
    case 9: // Primordial — leaves on the corners + vine
      // Left leaf
      px(c, 11, 24, 'Y'); px(c, 12, 23, 'X'); px(c, 13, 24, 'Y');
      px(c, 12, 25, 'Z');
      // Right leaf
      px(c, 51, 24, 'Y'); px(c, 52, 23, 'X'); px(c, 53, 24, 'Y');
      px(c, 52, 25, 'Z');
      // Top vine
      px(c, 28, 12, 'X'); px(c, 30, 11, 'Y'); px(c, 32, 10, 'X');
      px(c, 34, 11, 'Y'); px(c, 36, 12, 'X');
      break;
    case 10: // Divin — crown + halo dots
      stampCrown(c, 32, 9);
      // Halo sparkles around the chest
      stampSparkle(c, 8, 14);
      stampSparkle(c, 54, 14);
      stampSparkle(c, 6, 30);
      stampSparkle(c, 56, 30);
      stampSparkle(c, 8, 48);
      stampSparkle(c, 54, 48);
      // Center jewel on lid
      stampGem(c, 32, 18);
      break;
    // T1 (Bois) gets no decoration — keeps the classic look
  }
}

function buildChestLayoutForTier(tier) {
  const c = cloneCanvas(BASE_CHEST_CANVAS);
  applyTierDecoration(c, tier);
  outline(c, 'o');
  return canvasToLayout(c);
}

const BASE_CHEST_CANVAS = buildBaseChestCanvas();
const CHEST_LAYOUTS_BY_TIER = {};
for (let t = 1; t <= 10; t++) {
  CHEST_LAYOUTS_BY_TIER[t] = buildChestLayoutForTier(t);
}
// Keep CHEST_LAYOUT as the T1 default for backwards compatibility / debugging
const CHEST_LAYOUT = CHEST_LAYOUTS_BY_TIER[1];

// Tier palettes — base colors per tier + X/Y/Z accent triplet for decorations.
const CHEST_PALETTES = {
  1:  { o: '#0a0402', B: '#5a3018', L: '#8a5028', H: '#c8804a', C: '#7a4828', c: '#3a1d0c', M: '#3a2010', h: '#c89020', k: '#0a0404', r: '#f5c842',
        X: '#ffe8a0', Y: '#c89020', Z: '#7a4818' }, // Bois
  2:  { o: '#050508', B: '#3a3a4a', L: '#5a5a6a', H: '#9090a8', C: '#4a4a5a', c: '#1a1a24', M: '#1a1a24', h: '#b0b0c8', k: '#080810', r: '#f5c842',
        X: '#e0e0f0', Y: '#9090a8', Z: '#4a4a5a' }, // Fer
  3:  { o: '#2a1808', B: '#a07820', L: '#d8a838', H: '#fff080', C: '#b88828', c: '#5a3818', M: '#3a2008', h: '#fff080', k: '#1a0e04', r: '#fff8c8',
        X: '#fffae0', Y: '#fff080', Z: '#c89020' }, // Or
  4:  { o: '#0a0218', B: '#3818a0', L: '#5828b8', H: '#a058ff', C: '#5028a0', c: '#1a0848', M: '#180838', h: '#c890ff', k: '#080418', r: '#ffe14a',
        X: '#ffaaff', Y: '#c060ff', Z: '#6020a0' }, // Mythique
  5:  { o: '#0a0204', B: '#7a1828', L: '#a82038', H: '#e84858', C: '#982030', c: '#380408', M: '#280408', h: '#ff7888', k: '#0a0204', r: '#ffe14a',
        X: '#ffd8d8', Y: '#ff4858', Z: '#a01828' }, // Ancestral
  6:  { o: '#020418', B: '#0a2068', L: '#1850a8', H: '#4080e8', C: '#103088', c: '#04123a', M: '#04081a', h: '#7abaff', k: '#020414', r: '#ffe14a',
        X: '#ffffff', Y: '#a0d0ff', Z: '#3070d0' }, // Stellaire
  7:  { o: '#040214', B: '#280f80', L: '#5028b8', H: '#a058ff', C: '#3818a0', c: '#10044a', M: '#080418', h: '#e0a0ff', k: '#040214', r: '#ffe14a',
        X: '#ffd8ff', Y: '#c878ff', Z: '#7028b8' }, // Cosmique
  8:  { o: '#000000', B: '#1a1a28', L: '#3a3a4a', H: '#7a7a98', C: '#2a2a3a', c: '#08080f', M: '#000000', h: '#c0c0d8', k: '#000000', r: '#ffe14a',
        X: '#e0e0e8', Y: '#5a5a6a', Z: '#000000' }, // Vide
  9:  { o: '#020a04', B: '#0a4018', L: '#1a6a28', H: '#4abc5a', C: '#1a5a28', c: '#0a2814', M: '#040810', h: '#a0e8aa', k: '#020a04', r: '#ffe14a',
        X: '#d0ffd8', Y: '#6acc6a', Z: '#1a6a28' }, // Primordial
  10: { o: '#1a1208', B: '#8a6818', L: '#c89020', H: '#ffe14a', C: '#a07818', c: '#5a4010', M: '#5a4018', h: '#fff8c8', k: '#1a1208', r: '#fff8c8',
        X: '#ffffff', Y: '#fff8c8', Z: '#f5c842' }, // Divin
};

// === RENDER HELPERS ===

// Convert a layout (string[]) + palette to an SVG <rect> sequence.
// Merges runs of identical-color pixels on the same row into single wide
// rects — typically reduces 1457 rects (character) to ~400, shrinking the
// SVG payload by ~3× and speeding up DOM parse/paint.
function gridToRects(layout, palette, ox = 0, oy = 0) {
  const rows = layout.length;
  const cols = layout[0].length;
  const out = [];
  for (let y = 0; y < rows; y++) {
    const row = layout[y];
    let runColor = null;
    let runStart = 0;
    for (let x = 0; x <= cols; x++) {
      const ch = x < cols ? row[x] : null;
      const color = (ch && ch !== '.') ? palette[ch] : undefined;
      if (color !== runColor) {
        if (runColor) {
          out.push(`<rect x="${runStart + ox}" y="${y + oy}" width="${x - runStart}" height="1" fill="${runColor}"/>`);
        }
        runColor = color || null;
        runStart = x;
      }
    }
  }
  return out.join('');
}

function gridToSVG(layout, palette, sizePx, rectsCache) {
  const rows = layout.length;
  const cols = layout[0].length;
  const rects = rectsCache || gridToRects(layout, palette);
  const width = Math.round(sizePx * cols / rows);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" width="${width}" height="${sizePx}" shape-rendering="crispEdges" style="image-rendering: pixelated;">${rects}</svg>`;
}

// Cached rects strings — both layout and palette are immutable per sprite.
// Each chest tier has its own decorated layout AND palette, cached as a
// single rects string at module load.
const CHARACTER_RECTS = gridToRects(CHARACTER_LAYOUT, CHARACTER_PALETTE);
const CHEST_RECTS_BY_TIER = {};
for (const tier of Object.keys(CHEST_PALETTES)) {
  CHEST_RECTS_BY_TIER[tier] = gridToRects(CHEST_LAYOUTS_BY_TIER[tier], CHEST_PALETTES[tier]);
}

// Compose multiple pixel layers ({layout, palette}) onto a single SVG.
// Used by item icons (16×16 weapon parts).
export function composedSpriteSVG(layers, sizePx = 64) {
  if (!layers || layers.length === 0) return '';
  const cells = layers[0].layout.length;
  const parts = [];
  for (const layer of layers) parts.push(gridToRects(layer.layout, layer.palette));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" style="image-rendering: pixelated;">${parts.join('')}</svg>`;
}

export function chestSpriteSVG(tier, sizePx = 120) {
  const layout = CHEST_LAYOUTS_BY_TIER[tier] || CHEST_LAYOUTS_BY_TIER[1];
  const cachedRects = CHEST_RECTS_BY_TIER[tier] || CHEST_RECTS_BY_TIER[1];
  return gridToSVG(layout, null, sizePx, cachedRects);
}

export function characterSpriteSVG(sizePx = 120) {
  return gridToSVG(CHARACTER_LAYOUT, null, sizePx, CHARACTER_RECTS);
}

// Composite character (64×64) + equipped items (16×16 at 2× scale = 32 logical px)
// into a paper-doll canvas. Canvas is 96×72 logical, character centered.
export function composeCharacterWithGearSVG(equipment, sizePx = 120) {
  const W = 96, H = 72;
  const charX = 16, charY = 4;
  // Item sprites are 16×16, drawn at 2× scale (32 logical px) to match the 64×64 character.
  // Offsets target the new layout: head rows 5-25, torso 26-44, arms 30-43.
  const slotPositions = {
    helmet: { x: 24, y: 0 },   // over head
    armor:  { x: 24, y: 18 },  // over torso
    weapon: { x: 60, y: 14 },  // right of character
    shield: { x: 0,  y: 20 },  // left of character
  };

  const drawSequence = [
    { type: 'item', slot: 'shield' },
    { type: 'char' },
    { type: 'item', slot: 'armor' },
    { type: 'item', slot: 'helmet' },
    { type: 'item', slot: 'weapon' },
  ];

  const parts = [];
  for (const step of drawSequence) {
    if (step.type === 'char') {
      // Reuse cached character rects (palette is constant).
      parts.push(`<g transform="translate(${charX},${charY})">${CHARACTER_RECTS}</g>`);
      continue;
    }
    const item = equipment[step.slot];
    if (!item) continue;
    const pos = slotPositions[step.slot];
    if (!pos) continue;
    if (item.parts && hasCompositionFor(item.baseTypeId)) {
      const layers = getCompositionLayers(item.baseTypeId, item.parts);
      const innerParts = [];
      for (const layer of layers) innerParts.push(gridToRects(layer.layout, layer.palette));
      parts.push(`<g transform="translate(${pos.x},${pos.y}) scale(2)">${innerParts.join('')}</g>`);
    } else if (item.emoji) {
      parts.push(`<text x="${pos.x + 16}" y="${pos.y + 22}" font-size="22" text-anchor="middle" dominant-baseline="middle">${item.emoji}</text>`);
    }
  }

  const width = Math.round(sizePx * W / H);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${width}" height="${sizePx}" shape-rendering="crispEdges" style="image-rendering: pixelated;">${parts.join('')}</svg>`;
}
