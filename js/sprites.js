// Hand-crafted pixel-art sprites rendered as inline SVG.
// Chest and character are now 32×32 with finer detail; item parts stay 16×16.
import { getCompositionLayers, hasCompositionFor } from './parts.js';

// === CHEST (32×32) ===
// Layout chars: o=outline, H=lid highlight, B=lid base, L=lid plank band,
// O=seam dark, h=hinge brass, C=body base, c=body shade, K=lock plate, k=keyhole inner

const CHEST_LAYOUT = [
  '................................',
  '................................',
  '.......oooooooooooooooooo.......',
  '......oHHHHHHHHHHHHHHHHHHHHo....',
  '.....oHBBBBBBBBBBBBBBBBBBBBHo...',
  '....oHBBLLLLLLLLLLLLLLLLLLBBHo..',
  '....oHBLLLLLLLLLLLLLLLLLLLLBHo..',
  '....oHBLLLLLLLLLLLLLLLLLLLLBHo..',
  '....oHBLLLLLLLLLLLLLLLLLLLLBHo..',
  '....oHBBBBBBBBBBBBBBBBBBBBBBHo..',
  '....oHBBBBBBBBBBBBBBBBBBBBBBHo..',
  '....oOhOOOOOOOOOOOOOOOOOOOhOo...',
  '....oCCCCCCCCCCCCCCCCCCCCCCCo...',
  '....oCcccccccccccccccccccccCo...',
  '....oCcccccccKKKKKKKcccccccCo...',
  '....oCcccccccKkkkkkKcccccccCo...',
  '....oCcccccccKkOOOkKcccccccCo...',
  '....oCcccccccKkOOOkKcccccccCo...',
  '....oCcccccccKkkkkkKcccccccCo...',
  '....oCcccccccKKKKKKKcccccccCo...',
  '....oCcccccccccccccccccccccCo...',
  '....oCcccccccccccccccccccccCo...',
  '....oCCCCCCCCCCCCCCCCCCCCCCCo...',
  '....oOOOOOOOOOOOOOOOOOOOOOOOo...',
  '.....ooooooooooooooooooooooo....',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

// Per-tier palette. Each entry maps the chest layout chars to colors.
const CHEST_PALETTES = {
  1:  { o: '#1a0a04', B: '#7a4828', L: '#a06038', H: '#c8804a', O: '#3a1a08', h: '#a06820', C: '#8a5028', c: '#6a3818', K: '#3a2010', k: '#f5c842' }, // Bois
  2:  { o: '#0a0a0a', B: '#4a4a5a', L: '#6a6a7a', H: '#a0a0b8', O: '#1a1a24', h: '#7a7a8a', C: '#4a4a5a', c: '#3a3a48', K: '#1a1a24', k: '#f5c842' }, // Fer
  3:  { o: '#3a2008', B: '#b88828', L: '#d8a838', H: '#fff080', O: '#5a3818', h: '#f5d058', C: '#b88828', c: '#7a5818', K: '#3a2008', k: '#fff080' }, // Or
  4:  { o: '#100420', B: '#5828a8', L: '#7a4ab8', H: '#b078d8', O: '#280858', h: '#a058ff', C: '#5828a8', c: '#3a1878', K: '#1a0838', k: '#ffe14a' }, // Mythique
  5:  { o: '#100204', B: '#a82038', L: '#c82838', H: '#e84858', O: '#3a0810', h: '#ff5060', C: '#a82038', c: '#580818', K: '#280408', k: '#ffe14a' }, // Ancestral
  6:  { o: '#04081a', B: '#103088', L: '#1850a8', H: '#4080e8', O: '#082058', h: '#5aa8ff', C: '#103088', c: '#081848', K: '#04081a', k: '#ffe14a' }, // Stellaire
  7:  { o: '#080418', B: '#3018a0', L: '#5028b8', H: '#a058ff', O: '#180858', h: '#c890ff', C: '#3018a0', c: '#1a0858', K: '#080418', k: '#ffe14a' }, // Cosmique
  8:  { o: '#000000', B: '#2a2a3a', L: '#4a4a5a', H: '#7a7a98', O: '#0a0a14', h: '#a0a0c0', C: '#2a2a3a', c: '#15151f', K: '#000000', k: '#ffe14a' }, // Vide
  9:  { o: '#041008', B: '#1a5a28', L: '#2a8a3a', H: '#5acc6a', O: '#082818', h: '#80e08a', C: '#1a5a28', c: '#0a2810', K: '#040810', k: '#ffe14a' }, // Primordial
  10: { o: '#3a2818', B: '#c89020', L: '#ffe14a', H: '#fff8c8', O: '#7a6020', h: '#fff080', C: '#c89020', c: '#9a6818', K: '#5a4818', k: '#fff8c8' }, // Divin
};

// === CHARACTER (32×32) ===
// Detailed humanoid: head with hair/face/eyes/mouth, neck, shoulders, arms,
// torso (shirt), belt, legs (pants), boots.

const CHARACTER_LAYOUT = [
  '................................',
  '................................',
  '................................',
  '............nnnnnn..............',
  '...........nnnnnnnn.............',
  '..........nnFFFFFFnn............',
  '..........nFfFFFFfFn............',
  '..........nFEFffFEFn............',
  '..........nFFFFFFFFn............',
  '..........nFFFFFFFFn............',
  '...........FFFmmFFF.............',
  '............NNNNNN..............',
  '...........KKKKKKKK.............',
  '..........KKTTTTTTKK............',
  '.........KTTtttttttTK...........',
  '........KaTTttttttttTK..........',
  '........KaTttttttttttK..........',
  '........KaTttttttttttK..........',
  '........KaTttttttttttK..........',
  '........KaTttttttttttK..........',
  '........KaTttttttttttK..........',
  '.........KTTtttttttTK...........',
  '..........KKBBBBBBKK............',
  '...........BBBBBBBB.............',
  '...........PPP..PPP.............',
  '...........PPP..PPP.............',
  '...........PPP..PPP.............',
  '...........PPP..PPP.............',
  '...........PPP..PPP.............',
  '..........SSSS..SSSS............',
  '..........SSSS..SSSS............',
  '................................',
];

const CHARACTER_PALETTE = {
  n: '#3a2010', // hair outline / dark brown
  F: '#e8a878', // face skin
  f: '#c08858', // face shade (under eye / cheek)
  E: '#1a1a1a', // eyes
  m: '#7a2010', // mouth
  N: '#c89060', // neck shade
  K: '#2a2a3a', // shirt/armor outline (dark)
  T: '#5a4838', // shirt mid
  t: '#8a6848', // shirt highlight
  a: '#a87858', // arms / skin
  B: '#3a2010', // belt
  P: '#3a3a4a', // pants
  S: '#1a1a1a', // boots
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
// 64×40: 32×32 character centred (offset 16,4), items at 16×16 scaled 2× around it.
export function composeCharacterWithGearSVG(equipment, sizePx = 120) {
  const W = 64, H = 40;
  const charX = 16, charY = 4;
  // Slot positions / scale factor. Items are 16×16 sprites scaled 2× to match character.
  const slotPositions = {
    helmet: { x: 16, y: 0 },   // overlaps character head
    armor:  { x: 16, y: 12 },  // overlaps character torso
    weapon: { x: 36, y: 8 },   // right of character (held up)
    shield: { x: -4, y: 8 },   // left of character
  };

  const drawSequence = [
    { type: 'item', slot: 'shield' },
    { type: 'item', slot: 'armor' },
    { type: 'char' },
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
      // Items are 16×16, scale 2× to match 32×32 character size.
      body += `<g transform="translate(${pos.x},${pos.y}) scale(2)">${inner}</g>`;
    } else if (item.emoji) {
      body += `<text x="${pos.x + 16}" y="${pos.y + 22}" font-size="18" text-anchor="middle" dominant-baseline="middle">${item.emoji}</text>`;
    }
  }

  const width = Math.round(sizePx * W / H);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${width}" height="${sizePx}" shape-rendering="crispEdges" style="image-rendering: pixelated;">${body}</svg>`;
}
