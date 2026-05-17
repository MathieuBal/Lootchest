// Hand-crafted 16x16 pixel-art sprites rendered as inline SVG.
// Each sprite is a string grid + palette. '.' = transparent.

const CHEST_LAYOUT = [
  '................',
  '...oooooooooo...',
  '..oBBBBBBBBBBo..',
  '.oBLLLLLLLLLLBo.',
  '.oBLLLLLLLLLLBo.',
  '.oBLLLLLLLLLLBo.',
  '.oOOOOOOOOOOOOo.',
  '.oCCCCCCCCCCCCo.',
  '.oCCCCCCCCCCCCo.',
  '.oCCCCCKKCCCCCo.',
  '.oCCCCCKKCCCCCo.',
  '.oCCCCCKKCCCCCo.',
  '.oCCCCCCCCCCCCo.',
  '.oOOOOOOOOOOOOo.',
  '..oOoooooooooOo.',
  '................',
];

const CHEST_PALETTES = {
  1: { o: '#3a1a08', B: '#a06038', L: '#c8804a', O: '#5a2a14', C: '#c8804a', K: '#1a0a04' }, // Bois
  2: { o: '#1a1a1a', B: '#6a6a6a', L: '#a0a0a0', O: '#2a2a2a', C: '#a0a0a0', K: '#0a0a0a' }, // Fer
  3: { o: '#3a2810', B: '#d8a838', L: '#f5d058', O: '#5a3818', C: '#f5d058', K: '#1a1004' }, // Or
  4: { o: '#1a0a2a', B: '#7a4ab8', L: '#b078d8', O: '#3a1a4a', C: '#b078d8', K: '#0a0414' }, // Mythique
  5: { o: '#2a0408', B: '#c82838', L: '#e84858', O: '#4a0810', C: '#e84858', K: '#100204' }, // Ancestral
};

const CHARACTER_LAYOUT = [
  '................',
  '......HHHH......',
  '.....HHHHHH.....',
  '....HHFFFFHH....',
  '....HFEFFEFH....',  // E = eyes
  '....HFFFFFFH....',
  '.....FFMMFF.....',  // M = mouth
  '....AAAAAAAA....',
  '...ABCCCCCCBA...',  // B = belt
  '..ABBBCCCCBBBA..',
  '..AABCCCCCCBAA..',
  '...ABCCCCCCBA...',
  '....AA....AA....',
  '....BB....BB....',
  '...BBBB..BBBB...',
  '................',
];

const CHARACTER_PALETTE = {
  H: '#5a3818', // hair brown
  F: '#f0b888', // face skin
  E: '#1a1a1a', // eyes
  M: '#7a2010', // mouth
  A: '#7a7a8a', // armor light
  B: '#3a3a4a', // belt/dark armor
  C: '#a8a8c0', // armor highlight
};

function gridToRects(layout, palette) {
  const cells = layout.length;
  let rects = '';
  for (let y = 0; y < cells; y++) {
    const row = layout[y];
    for (let x = 0; x < cells; x++) {
      const ch = row[x];
      if (ch === '.' || !palette[ch]) continue;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[ch]}"/>`;
    }
  }
  return rects;
}

function gridToSVG(layout, palette, sizePx) {
  const cells = layout.length;
  const rects = gridToRects(layout, palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" style="image-rendering: pixelated;">${rects}</svg>`;
}

// Compose multiple pixel layers ({layout, palette}) onto a single SVG.
// Later layers overlap earlier ones.
export function composedSpriteSVG(layers, sizePx = 64) {
  if (!layers || layers.length === 0) return '';
  const cells = layers[0].layout.length;
  let rects = '';
  for (const layer of layers) {
    rects += gridToRects(layer.layout, layer.palette);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" style="image-rendering: pixelated;">${rects}</svg>`;
}

export function chestSpriteSVG(tier, sizePx = 96) {
  const palette = CHEST_PALETTES[tier] || CHEST_PALETTES[1];
  return gridToSVG(CHEST_LAYOUT, palette, sizePx);
}

export function characterSpriteSVG(sizePx = 80) {
  return gridToSVG(CHARACTER_LAYOUT, CHARACTER_PALETTE, sizePx);
}
