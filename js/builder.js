// Procedural pixel-art builder primitives — shared by character/chest/boss
// sprites in sprites.js AND the 64×64 weapon parts in partsHD.js.
//
// Conventions:
//   - canvas = { w, h, grid: string[][] }, grid cells are single chars, '.' = transparent
//   - all ops are mutators on the canvas (no return value besides the canvas itself)
//   - palette codes are single chars; the palette dict maps each char → hex color
//   - outline() does a 4-neighbor border pass and is idempotent enough for stamps

export function makeCanvas(w, h) {
  const grid = [];
  for (let y = 0; y < h; y++) grid.push(new Array(w).fill('.'));
  return { w, h, grid };
}

export function px(c, x, y, ch) {
  if (x >= 0 && x < c.w && y >= 0 && y < c.h) c.grid[y][x] = ch;
}

export function rect(c, x, y, w, h, ch) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) px(c, xx, yy, ch);
}

export function ellipse(c, cx, cy, rx, ry, ch) {
  for (let yy = cy - ry; yy <= cy + ry; yy++) {
    for (let xx = cx - rx; xx <= cx + rx; xx++) {
      const dx = (xx - cx + 0.5) / (rx + 0.5);
      const dy = (yy - cy + 0.5) / (ry + 0.5);
      if (dx * dx + dy * dy <= 1) px(c, xx, yy, ch);
    }
  }
}

export function ellipseOutline(c, cx, cy, rx, ry, ch) {
  for (let yy = cy - ry; yy <= cy + ry; yy++) {
    for (let xx = cx - rx; xx <= cx + rx; xx++) {
      const dx = (xx - cx + 0.5) / (rx + 0.5);
      const dy = (yy - cy + 0.5) / (ry + 0.5);
      const d = dx * dx + dy * dy;
      if (d <= 1 && d >= 0.62) px(c, xx, yy, ch);
    }
  }
}

export function hline(c, x1, x2, y, ch) {
  for (let x = x1; x <= x2; x++) px(c, x, y, ch);
}

export function vline(c, x, y1, y2, ch) {
  for (let y = y1; y <= y2; y++) px(c, x, y, ch);
}

// Diagonal line via Bresenham — useful for slashes and angled details.
export function line(c, x1, y1, x2, y2, ch) {
  let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let x = x1, y = y1;
  while (true) {
    px(c, x, y, ch);
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 <  dx) { err += dx; y += sy; }
  }
}

// Add a 1-pixel outline around every non-transparent area using char ch.
export function outline(c, ch) {
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

export function canvasToLayout(c) {
  return c.grid.map(r => r.join(''));
}

export function cloneCanvas(c) {
  return { w: c.w, h: c.h, grid: c.grid.map(r => r.slice()) };
}
