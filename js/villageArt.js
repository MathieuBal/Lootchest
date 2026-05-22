// Procedural SVG art for Village buildings — flat-shaded, consistent visual
// language, drawn on a 64×64 canvas with a small ground shadow at the base.
// Level lightly drives detail (more lit windows / taller). Pure markup; the
// animated bits (smoke, flag) are CSS classes applied to elements below.

const PAL = {
  stone: '#c9b48a', stoneDk: '#9a8460', stoneSh: '#7c684a',
  wood: '#8a5a30', woodDk: '#6d4523',
  roof: '#9c3b3b', roofDk: '#742b2b',
  gold: '#f0c463', goldDk: '#a07424',
  winLit: '#ffd76a', winOff: '#3a3354',
  fire: '#ff8a3c', orb: '#7ad0ff', steel: '#b9c2cf', steelDk: '#7d8696',
  ground: 'rgba(0,0,0,.35)',
};

// A few lit windows scaling with level (capped).
function windows(x, y, n, lvl) {
  const lit = Math.min(n, 1 + Math.floor((lvl - 1) / 2));
  let s = '';
  for (let i = 0; i < n; i++) {
    s += `<rect x="${x + i * 9}" y="${y}" width="5" height="6" rx="1" fill="${i < lit ? PAL.winLit : PAL.winOff}"/>`;
  }
  return s;
}
const shadow = `<ellipse cx="32" cy="58" rx="22" ry="5" fill="${PAL.ground}"/>`;

function mairie(lvl) {
  return `${shadow}
    <rect x="14" y="30" width="36" height="24" fill="${PAL.stone}"/>
    <rect x="14" y="30" width="36" height="24" fill="none" stroke="${PAL.stoneSh}" stroke-width="1"/>
    <rect x="17" y="34" width="4" height="20" fill="${PAL.stoneDk}"/>
    <rect x="30" y="34" width="4" height="20" fill="${PAL.stoneDk}"/>
    <rect x="43" y="34" width="4" height="20" fill="${PAL.stoneDk}"/>
    <polygon points="10,30 32,18 54,30" fill="${PAL.roof}"/>
    <polygon points="10,30 32,18 54,30" fill="none" stroke="${PAL.roofDk}" stroke-width="1"/>
    <circle cx="32" cy="26" r="3" fill="${PAL.gold}"/>
    <rect x="36" y="44" width="8" height="10" fill="${PAL.woodDk}"/>
    <line x1="32" y1="18" x2="32" y2="8" stroke="${PAL.goldDk}" stroke-width="1.5"/>
    <polygon class="vart-flag" points="32,8 44,11 32,14" fill="${PAL.gold}"/>`;
}
function houses(lvl) {
  return `${shadow}
    <rect x="10" y="36" width="20" height="18" fill="${PAL.stone}"/>
    <polygon points="8,36 20,26 32,36" fill="${PAL.roof}"/>
    <rect x="17" y="44" width="6" height="10" fill="${PAL.woodDk}"/>
    ${windows(12, 38, 1, lvl)}
    <rect x="34" y="40" width="20" height="14" fill="${PAL.stoneDk}"/>
    <polygon points="32,40 44,31 56,40" fill="${PAL.roofDk}"/>
    <rect x="41" y="46" width="6" height="8" fill="${PAL.woodDk}"/>
    ${windows(36, 42, 1, lvl)}`;
}
function sawmill(lvl) {
  return `${shadow}
    <rect x="16" y="32" width="30" height="22" fill="${PAL.wood}"/>
    <polygon points="14,32 31,22 48,32" fill="${PAL.roofDk}"/>
    ${windows(20, 38, 2, lvl)}
    <rect x="6" y="50" width="14" height="4" fill="${PAL.woodDk}"/>
    <rect x="9" y="46" width="14" height="4" fill="${PAL.woodDk}"/>
    <g class="vart-spin" style="transform-origin:46px 44px">
      <circle cx="46" cy="44" r="9" fill="${PAL.steel}" stroke="${PAL.steelDk}" stroke-width="1"/>
      <circle cx="46" cy="44" r="2" fill="${PAL.steelDk}"/>
      ${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="46" y1="44" x2="${46 + Math.cos(a) * 9}" y2="${44 + Math.sin(a) * 9}" stroke="${PAL.steelDk}" stroke-width="1"/>`; }).join('')}
    </g>`;
}
function quarry(lvl) {
  return `${shadow}
    <rect x="12" y="40" width="18" height="14" fill="${PAL.stoneDk}"/>
    <polygon points="10,40 21,32 32,40" fill="${PAL.roofDk}"/>
    <polygon points="30,54 40,38 50,54" fill="${PAL.stone}"/>
    <polygon points="38,54 46,44 54,54" fill="${PAL.stoneDk}"/>
    <line x1="40" y1="30" x2="48" y2="42" stroke="${PAL.woodDk}" stroke-width="2"/>
    <path d="M36,30 q4,-4 8,0" stroke="${PAL.steel}" stroke-width="2.5" fill="none"/>`;
}
function locksmith(lvl) {
  return `${shadow}
    <rect x="16" y="32" width="32" height="22" fill="${PAL.stone}"/>
    <polygon points="14,32 32,22 50,32" fill="${PAL.roof}"/>
    ${windows(20, 38, 2, lvl)}
    <circle cx="32" cy="46" r="5" fill="none" stroke="${PAL.gold}" stroke-width="2"/>
    <rect x="31" y="46" width="2" height="7" fill="${PAL.gold}"/>
    <rect x="31" y="51" width="5" height="2" fill="${PAL.gold}"/>`;
}
function forge(lvl) {
  return `${shadow}
    <rect x="14" y="32" width="34" height="22" fill="${PAL.stoneDk}"/>
    <polygon points="12,32 31,22 50,32" fill="${PAL.roofDk}"/>
    <rect x="40" y="16" width="6" height="16" fill="${PAL.stoneSh}"/>
    <circle class="vart-smoke" cx="43" cy="14" r="3" fill="#cbb8d8"/>
    <circle class="vart-smoke vart-smoke2" cx="43" cy="14" r="2.5" fill="#cbb8d8"/>
    <rect x="20" y="40" width="12" height="14" fill="#1c1430"/>
    <ellipse cx="26" cy="50" rx="6" ry="4" fill="${PAL.fire}"/>
    <ellipse cx="26" cy="51" rx="3" ry="2.5" fill="${PAL.gold}"/>
    <rect x="36" y="46" width="10" height="3" fill="${PAL.steelDk}"/>
    <rect x="39" y="49" width="4" height="4" fill="${PAL.steelDk}"/>`;
}
function barracks(lvl) {
  return `${shadow}
    <rect x="12" y="30" width="40" height="24" fill="${PAL.stoneDk}"/>
    <rect x="12" y="28" width="40" height="4" fill="${PAL.stoneSh}"/>
    ${Array.from({ length: 5 }, (_, i) => `<rect x="${13 + i * 8}" y="26" width="5" height="4" fill="${PAL.stoneDk}"/>`).join('')}
    <rect x="27" y="42" width="10" height="12" fill="#1c1430"/>
    <path d="M32,36 l5,3 l-5,3 l-5,-3 z" fill="${PAL.gold}"/>
    <line x1="24" y1="34" x2="40" y2="46" stroke="${PAL.steel}" stroke-width="1.5"/>
    <line x1="40" y1="34" x2="24" y2="46" stroke="${PAL.steel}" stroke-width="1.5"/>`;
}
function foundry(lvl) {
  return `${shadow}
    <rect x="12" y="34" width="34" height="20" fill="${PAL.stoneSh}"/>
    <rect x="44" y="14" width="8" height="40" fill="${PAL.stoneDk}"/>
    <rect x="43" y="12" width="10" height="4" fill="${PAL.stoneSh}"/>
    <circle class="vart-smoke" cx="48" cy="10" r="3.5" fill="#b9aec4"/>
    <circle class="vart-smoke vart-smoke2" cx="48" cy="10" r="3" fill="#b9aec4"/>
    ${windows(16, 40, 3, lvl)}
    <rect x="18" y="48" width="22" height="6" fill="${PAL.fire}" opacity="0.85"/>`;
}
function orbworks(lvl) {
  return `${shadow}
    <rect x="22" y="30" width="20" height="24" fill="${PAL.stone}"/>
    <polygon points="20,30 32,20 44,30" fill="${PAL.roof}"/>
    ${windows(25, 40, 1, lvl)}
    <circle class="vart-orb" cx="32" cy="14" r="6" fill="${PAL.orb}"/>
    <circle cx="32" cy="14" r="6" fill="none" stroke="#cdebff" stroke-width="1"/>
    <circle cx="30" cy="12" r="1.6" fill="#eaf7ff"/>`;
}

const ART = { mairie, townhall: mairie, houses, sawmill, quarry, locksmith, forge, barracks, foundry, orbworks };

export function buildingArtSVG(id, level = 1, size = 56) {
  const fn = ART[id];
  if (!fn) return '';
  return `<svg class="vart" viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${fn(level)}</svg>`;
}
