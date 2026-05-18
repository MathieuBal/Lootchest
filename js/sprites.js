// Hand-crafted pixel-art sprites rendered as inline SVG.
// Chest and character are now 32×32 with finer detail; item parts stay 16×16.
import { getCompositionLayers, hasCompositionFor } from './parts.js';

// === CHEST (32×32) ===
// Cleaner design: 22-wide × 22-tall, centered. Visible hinges, small focused lock plate, gold keyhole.

const CHEST_LAYOUT = [
  '................................',  //  0
  '................................',  //  1
  '................................',  //  2
  '........oooooooooooooooo........',  //  3: top curve
  '......oooBBBBBBBBBBBBBBBBooo....',  //  4: lid top
  '......oBHHHHHHHHHHHHHHHHHHBo....',  //  5: lid highlight
  '......oBHLLLLLLLLLLLLLLLLHBo....',  //  6: lid plank
  '......oBHLLLLLLLLLLLLLLLLHBo....',  //  7
  '......oBHLLLLLLLLLLLLLLLLHBo....',  //  8
  '......oBHLLLLLLLLLLLLLLLLHBo....',  //  9
  '......oBHHHHHHHHHHHHHHHHHHBo....',  // 10: lid bottom highlight
  '......oBBBBBBBBBBBBBBBBBBBBo....',  // 11: lid base
  '......oOhOOOOOOOOOOOOOOOOhOo....',  // 12: seam + hinges
  '......oCCCCCCCCCCCCCCCCCCCCo....',  // 13: body
  '......oCCCCCCCCCCCCCCCCCCCCo....',  // 14
  '......oCCCCCCCCCCCCCCCCCCCCo....',  // 15
  '......oCCCCCCCCCKKKKCCCCCCCo....',  // 16: lock plate top
  '......oCCCCCCCCKkkkkKCCCCCCo....',  // 17
  '......oCCCCCCCCKkOOkKCCCCCCo....',  // 18: keyhole
  '......oCCCCCCCCKkOOkKCCCCCCo....',  // 19
  '......oCCCCCCCCKkkkkKCCCCCCo....',  // 20
  '......oCCCCCCCCCKKKKCCCCCCCo....',  // 21: lock plate bottom
  '......oCCCCCCCCCCCCCCCCCCCCo....',  // 22
  '......occccccccccccccccccccCo...',  // 23: body shadow
  '......oOOOOOOOOOOOOOOOOOOOOOo...',  // 24: bottom band
  '.......ooooooooooooooooooooo....',  // 25: base shadow
  '................................',  // 26
  '................................',  // 27
  '................................',  // 28
  '................................',  // 29
  '................................',  // 30
  '................................',  // 31
];

const CHEST_PALETTES = {
  1:  { o: '#1a0a04', B: '#7a4828', L: '#a06038', H: '#c8804a', O: '#3a1a08', h: '#c89020', C: '#8a5028', c: '#5a3018', K: '#3a2010', k: '#f5c842' }, // Bois
  2:  { o: '#0a0a0a', B: '#4a4a5a', L: '#6a6a7a', H: '#a0a0b8', O: '#1a1a24', h: '#c0c0d0', C: '#4a4a5a', c: '#2a2a38', K: '#1a1a24', k: '#f5c842' }, // Fer
  3:  { o: '#3a2008', B: '#b88828', L: '#d8a838', H: '#fff080', O: '#5a3818', h: '#fff080', C: '#b88828', c: '#7a5818', K: '#3a2008', k: '#fff8c8' }, // Or
  4:  { o: '#100420', B: '#5828a8', L: '#7a4ab8', H: '#b078d8', O: '#280858', h: '#c890ff', C: '#5828a8', c: '#28107a', K: '#1a0838', k: '#ffe14a' }, // Mythique
  5:  { o: '#100204', B: '#a82038', L: '#c82838', H: '#e84858', O: '#3a0810', h: '#ff7888', C: '#a82038', c: '#480410', K: '#280408', k: '#ffe14a' }, // Ancestral
  6:  { o: '#04081a', B: '#103088', L: '#1850a8', H: '#4080e8', O: '#082058', h: '#7abaff', C: '#103088', c: '#04123a', K: '#04081a', k: '#ffe14a' }, // Stellaire
  7:  { o: '#080418', B: '#3018a0', L: '#5028b8', H: '#a058ff', O: '#180858', h: '#e0a0ff', C: '#3018a0', c: '#14064a', K: '#080418', k: '#ffe14a' }, // Cosmique
  8:  { o: '#000000', B: '#2a2a3a', L: '#4a4a5a', H: '#7a7a98', O: '#0a0a14', h: '#c0c0d8', C: '#2a2a3a', c: '#10101a', K: '#000000', k: '#ffe14a' }, // Vide
  9:  { o: '#041008', B: '#1a5a28', L: '#2a8a3a', H: '#5acc6a', O: '#082818', h: '#a0e8aa', C: '#1a5a28', c: '#0a2814', K: '#040810', k: '#ffe14a' }, // Primordial
  10: { o: '#3a2818', B: '#c89020', L: '#ffe14a', H: '#fff8c8', O: '#7a6020', h: '#fff8c8', C: '#c89020', c: '#7a5810', K: '#5a4818', k: '#fff8c8' }, // Divin
};

// === CHARACTER (32×32) ===
// Clean proportions: head ~7 rows, torso ~7 rows, legs ~6 rows, boots 3 rows.
// Visible arms (skin) hanging at the sides of the torso.

const CHARACTER_LAYOUT = [
  '................................',  //  0
  '................................',  //  1
  '................................',  //  2
  '............nnnnnnnn............',  //  3: hair top  (8 wide, cols 12-19)
  '...........nnnFFFFnnn...........',  //  4: hair sides + forehead
  '...........nFFFFFFFFn...........',  //  5: face
  '...........nFEFFFFEFn...........',  //  6: eyes
  '...........nFFFFFFFFn...........',  //  7: face
  '...........nFFFmmFFFn...........',  //  8: mouth
  '...........nFFFFFFFFn...........',  //  9: chin
  '............nnnnnnnn............',  // 10: hair/chin bottom
  '..............NN................',  // 11: neck
  '............KKKKKKKK............',  // 12: shoulder ridge
  '..........aaaKTTTTKaaa..........',  // 13: shoulders+arms (arms outer, shirt outline)
  '..........aaaTttttTaaa..........',  // 14: torso + arms
  '..........aaaTttttTaaa..........',  // 15
  '..........aaaTttttTaaa..........',  // 16
  '..........aaaTttttTaaa..........',  // 17
  '..........aaaTttttTaaa..........',  // 18
  '...........aaTTTTTTaa...........',  // 19: torso bottom (arms ending)
  '............BBBBBBBB............',  // 20: belt
  '............BBBBBBBB............',  // 21: belt
  '............PPP..PPP............',  // 22: legs split (pants)
  '............PPP..PPP............',  // 23
  '............PPP..PPP............',  // 24
  '............PPP..PPP............',  // 25
  '............PPP..PPP............',  // 26
  '............PPP..PPP............',  // 27
  '...........bSSSb.bSSSb..........',  // 28: boot tops
  '...........bSSSb.bSSSb..........',  // 29
  '...........bbbbb.bbbbb..........',  // 30: boot soles
  '................................',  // 31
];

const CHARACTER_PALETTE = {
  n: '#3a2010', // hair (dark brown)
  F: '#e8a878', // face skin
  E: '#1a1a1a', // eyes
  m: '#7a2010', // mouth
  N: '#c08868', // neck (skin shade)
  K: '#2a2a3a', // shirt outline (dark)
  T: '#4a3828', // shirt mid (brown shade)
  t: '#8a6848', // shirt highlight (lighter)
  a: '#c08868', // arm skin
  B: '#3a2010', // belt (brown)
  P: '#3a3a4a', // pants
  S: '#5a3018', // boot leather
  b: '#1a0a04', // boot outline
};

function gridToRects(layout, palette) {
  const rows = layout.length;
  const cols = layout[0].length;
  let rects = '';
  for (let y = 0; y < rows; y++) {
    const row = layout[y];
    for (let x = 0; x < cols; x++) {
      const ch = row[x];
      if (ch === '.' || !palette[ch]) continue;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[ch]}"/>`;
    }
  }
  return rects;
}

function gridToSVG(layout, palette, sizePx) {
  const rows = layout.length;
  const cols = layout[0].length;
  const rects = gridToRects(layout, palette);
  // Maintain aspect (assume square or near-square)
  const width = Math.round(sizePx * cols / rows);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" width="${width}" height="${sizePx}" shape-rendering="crispEdges" style="image-rendering: pixelated;">${rects}</svg>`;
}

// Compose multiple pixel layers ({layout, palette}) onto a single SVG.
// Later layers overlap earlier ones. Layers must share the same grid size.
export function composedSpriteSVG(layers, sizePx = 64) {
  if (!layers || layers.length === 0) return '';
  const cells = layers[0].layout.length;
  let rects = '';
  for (const layer of layers) {
    rects += gridToRects(layer.layout, layer.palette);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" style="image-rendering: pixelated;">${rects}</svg>`;
}

export function chestSpriteSVG(tier, sizePx = 120) {
  const palette = CHEST_PALETTES[tier] || CHEST_PALETTES[1];
  return gridToSVG(CHEST_LAYOUT, palette, sizePx);
}

export function characterSpriteSVG(sizePx = 120) {
  return gridToSVG(CHARACTER_LAYOUT, CHARACTER_PALETTE, sizePx);
}

// Composite character + equipped items into a wide paper-doll canvas.
// 56×40: 32×32 character + 16×16 items at 1× scale around it.
export function composeCharacterWithGearSVG(equipment, sizePx = 120) {
  const W = 56, H = 40;
  const charX = 12, charY = 4;
  // Item sprites stay at 1× (16×16). Offsets are tuned for the new 32×32 character layout
  // where head spans rows 3-10 cols 11-20, torso 12-19, arms 13-18.
  const slotPositions = {
    helmet: { x: 20, y: 5 },   // covers character head
    armor:  { x: 20, y: 9 },   // covers character torso
    weapon: { x: 36, y: 6 },   // right of character (held up)
    shield: { x: -2, y: 12 },  // left of character
  };

  const drawSequence = [
    { type: 'item', slot: 'shield' },
    { type: 'char' },
    { type: 'item', slot: 'armor' },
    { type: 'item', slot: 'helmet' },
    { type: 'item', slot: 'weapon' },
  ];

  let body = '';
  for (const step of drawSequence) {
    if (step.type === 'char') {
      body += `<g transform="translate(${charX},${charY})">${gridToRects(CHARACTER_LAYOUT, CHARACTER_PALETTE)}</g>`;
      continue;
    }
    const item = equipment[step.slot];
    if (!item) continue;
    const pos = slotPositions[step.slot];
    if (!pos) continue;
    if (item.parts && hasCompositionFor(item.baseTypeId)) {
      const layers = getCompositionLayers(item.baseTypeId, item.parts);
      let inner = '';
      for (const layer of layers) inner += gridToRects(layer.layout, layer.palette);
      body += `<g transform="translate(${pos.x},${pos.y})">${inner}</g>`;
    } else if (item.emoji) {
      body += `<text x="${pos.x + 8}" y="${pos.y + 11}" font-size="11" text-anchor="middle" dominant-baseline="middle">${item.emoji}</text>`;
    }
  }

  const width = Math.round(sizePx * W / H);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${width}" height="${sizePx}" shape-rendering="crispEdges" style="image-rendering: pixelated;">${body}</svg>`;
}
