// Village vivant. Moteur d'ambiance par-dessus l'illustration du village :
// halos CSS (fenêtres, forge, orbe, sanctuaire), particules canvas (fumées,
// braises, lucioles, scintillement de l'étang, oiseaux) et un cycle
// jour/nuit branché sur l'heure réelle du joueur (teinte + vignette).
//
// Contrainte : la carte du village (villageMap.js) est régénérée par
// innerHTML à chaque renderAll (notify toutes les secondes sur l'onglet).
// Le moteur est donc un SINGLETON persistant : ses calques DOM et son
// état de particules survivent aux renders, et il se ré-accroche au
// nouveau .vmap-world à chaque frame. Un seul requestAnimationFrame.
//
// Coupe-circuits : option « Particules réduites » du jeu
// (state.settings.reducedParticles) et prefers-reduced-motion. Quand l'un
// est actif, rien ne tourne et les calques sont retirés du DOM.

import { state } from './state.js';

// ── Émetteurs, en pourcentage de l'illustration 1672×941 ─────────
const SMOKE  = [[23.2, 14.0], [20.8, 15.5], [12.6, 62.0], [84.6, 71.0], [58.0, 12.0], [13.8, 64.0]];
const EMBERS = [[77.9, 82.5], [13.3, 70.5]];   // forge + fonderie
const POND   = [9, 20, 88, 96];                // x1, x2, y1, y2 (étang bas-gauche)
const HALOS  = [
  { cls: 'vmap-glow',       x: 47.5, y: 46.5, d: 0   }, // fenêtres mairie
  { cls: 'vmap-glow',       x: 69.5, y: 48.5, d: 0.9 }, // étals du marché
  { cls: 'vmap-glow',       x: 68.5, y: 64,   d: 1.7 }, // fenêtres guilde
  { cls: 'vmap-glow',       x: 21.5, y: 25,   d: 2.4 }, // maison gauche
  { cls: 'vmap-glow magic', x: 37.3, y: 78,   d: 0   }, // dôme de l'atelier d'orbes
  { cls: 'vmap-glow holy',  x: 68.7, y: 5.5,  d: 0   }, // cristal du sanctuaire
  { cls: 'vmap-glow fire',  x: 77.9, y: 83,   d: 0   }, // four de la forge
];

// ── État du moteur (singleton) ───────────────────────────────────
let built = false, running = false;
let tintEl, vigEl, ambientEl, canvas, ctx;
let smokeDot, emberDot, flyDot, sparkDot;
let flies = [];
let P = [];
const acc = new Map();
let birds = null, nextBirds = 8 + Math.random() * 14;
let lastW = 0, lastH = 0, lastTime = 0, lastTod = -1e9;

function gated() {
  if (state.settings?.reducedParticles) return true;
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true; } catch {}
  return false;
}

function dot(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const t = c.getContext('2d');
  const r = t.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, color);
  r.addColorStop(1, 'rgba(0,0,0,0)');
  t.fillStyle = r;
  t.fillRect(0, 0, 64, 64);
  return c;
}

function build() {
  if (built) return;
  built = true;
  tintEl = document.createElement('div'); tintEl.className = 'vmap-tint';
  vigEl = document.createElement('div'); vigEl.className = 'vmap-vig';
  ambientEl = document.createElement('div'); ambientEl.className = 'vmap-ambient';
  for (const h of HALOS) {
    const el = document.createElement('div');
    el.className = h.cls;
    el.style.left = h.x + '%';
    el.style.top = h.y + '%';
    el.style.setProperty('--d', h.d + 's');
    ambientEl.appendChild(el);
  }
  canvas = document.createElement('canvas');
  canvas.className = 'vmap-fxcanvas';
  ctx = canvas.getContext('2d');
  // Fumée plus dense et un peu plus sombre : lisible sur la peinture claire.
  smokeDot = dot('rgba(210,206,218,0.8)');
  emberDot = dot('rgba(255,168,60,1)');
  flyDot   = dot('rgba(255,238,150,1)');
  sparkDot = dot('rgba(215,238,255,1)');
  flies = Array.from({ length: 18 }, (_, i) => ({
    cx: [8, 16, 30, 55, 77, 88, 12, 40][i % 8] + Math.random() * 6,
    cy: [90, 60, 90, 92, 90, 70, 80, 88][i % 8] + Math.random() * 4 - 2,
    rx: 1.2 + Math.random() * 1.8, ry: 0.8 + Math.random() * 1.2,
    sp: 0.25 + Math.random() * 0.4, p1: Math.random() * 7, p2: Math.random() * 7,
    bl: 0.5 + Math.random() * 1.2,
  }));
}

// Insère les 4 calques (teinte, vignette, halos, canvas) juste avant
// .vmap-spots, dans cet ordre : la teinte multiply et la vignette restent
// SOUS les halos et particules, qui brillent donc par-dessus la nuit.
function attach(world) {
  const spots = world.querySelector('.vmap-spots');
  for (const node of [tintEl, vigEl, ambientEl, canvas]) {
    if (node.parentNode !== world) world.insertBefore(node, spots);
  }
}

function detach() {
  for (const node of [tintEl, vigEl, ambientEl, canvas]) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }
}

function sizeCanvas(world) {
  const w = world.offsetWidth, h = world.offsetHeight;
  if (w === lastW && h === lastH) return;
  lastW = w; lastH = h;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
}

// Cycle jour/nuit branché sur l'heure réelle. nightness 0 = soir (l'art
// d'origine), 1 = nuit profonde. Plancher à 0.2 pour qu'en plein jour la
// scène garde un peu d'atmosphère (sinon halos à 0.4 d'opacité = invisibles
// sur la peinture déjà lumineuse, et le PC y reste plus longtemps sans
// changement perceptible).
function nightnessNow() {
  const d = new Date();
  const hr = d.getHours() + d.getMinutes() / 60;
  let n;
  if (hr < 5)  n = 1;
  else if (hr < 8)  n = 1 - (hr - 5) / 3;   // aube 5→8
  else if (hr < 18) n = 0;                  // jour
  else if (hr < 21) n = (hr - 18) / 3;      // crépuscule 18→21
  else n = 1;                               // nuit 21→24
  return Math.max(0.2, n);                  // plancher : jamais complètement plat
}

function applyTod(n) {
  tintEl.style.opacity = (n * 0.55).toFixed(3);
  vigEl.style.opacity = (n * 0.7).toFixed(3);
  // Halos toujours visibles (min 0.7), saturent vraiment la nuit.
  ambientEl.style.opacity = Math.min(1, 0.7 + n * 0.3).toFixed(3);
}

function frame(now) {
  if (!running) return;
  // Coupé en cours de route (option activée pendant qu'on regarde) ?
  if (gated()) { running = false; detach(); return; }
  const screen = document.querySelector('.vmap-screen');
  if (!screen) { running = false; return; } // onglet village quitté → on stoppe
  requestAnimationFrame(frame);

  const world = screen.querySelector('.vmap-world');
  if (!world) return;
  if (canvas.parentNode !== world) attach(world); // re-render a recréé le monde
  sizeCanvas(world);

  const dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
  if (now - lastTod > 2000) { lastTod = now; applyTod(nightnessNow()); }

  const W = canvas.width, H = canvas.height, t = now / 1000;
  const X = (x) => x / 100 * W, Y = (y) => y / 100 * H, S = (s) => s / 100 * W;
  const wind = -(0.35 + Math.sin(t * 0.13) * 0.25);

  const emit = (key, rate, fn) => {
    let a = (acc.get(key) || 0) + dt * rate;
    while (a >= 1) { a -= 1; fn(); }
    acc.set(key, a);
  };

  SMOKE.forEach((e, i) => emit('s' + i, 2.6, () => P.push({
    k: 'smoke', x: e[0] + (Math.random() - 0.5) * 0.5, y: e[1],
    vx: wind * 0.6 + (Math.random() - 0.5) * 0.3, vy: -(1.6 + Math.random() * 1.2),
    life: 3.4 + Math.random() * 2.0, age: 0, s: 1.1 + Math.random() * 0.7, ph: Math.random() * 7,
  })));
  EMBERS.forEach((e, i) => emit('e' + i, 7, () => P.push({
    k: 'ember', x: e[0] + (Math.random() - 0.5) * 0.8, y: e[1],
    vx: (Math.random() - 0.5) * 1.2, vy: -(2.5 + Math.random() * 3),
    life: 0.8 + Math.random() * 1.0, age: 0, s: 0.22 + Math.random() * 0.20, ph: Math.random() * 7,
  })));
  emit('pond', 2.0, () => P.push({
    k: 'spark', x: POND[0] + Math.random() * (POND[1] - POND[0]),
    y: POND[2] + Math.random() * (POND[3] - POND[2]), vx: 0, vy: 0,
    life: 1.0, age: 0, s: 0.30 + Math.random() * 0.16, ph: 0,
  }));

  nextBirds -= dt;
  if (!birds && nextBirds <= 0) {
    const ltr = Math.random() < 0.5;
    birds = { x: ltr ? -6 : 106, dir: ltr ? 1 : -1, y: 5 + Math.random() * 8, n: 3 + (Math.random() * 3 | 0), ph: Math.random() * 7 };
    nextBirds = 22 + Math.random() * 26;
  }

  ctx.clearRect(0, 0, W, H);

  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.age += dt;
    if (p.age >= p.life) { P.splice(i, 1); continue; }
    const f = p.age / p.life;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.k === 'smoke') {
      p.x += Math.sin(t * 0.8 + p.ph) * 0.12 * dt * 8;
      // Montée à ~0.8 d'alpha en début de vie puis fondu : les panaches de
      // cheminée doivent vraiment se voir, y compris en plein jour.
      const a = 0.8 * Math.min(f * 4, 1) * (1 - f);
      const s = S(p.s * (1 + f * 2.2));
      ctx.globalAlpha = a; ctx.drawImage(smokeDot, X(p.x) - s, Y(p.y) - s, s * 2, s * 2);
    } else if (p.k === 'ember') {
      p.vx += wind * dt; p.vy += 1.2 * dt;
      const a = (1 - f) * (0.55 + 0.45 * Math.sin(p.age * 28 + p.ph));
      const s = S(p.s);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, a); ctx.drawImage(emberDot, X(p.x) - s, Y(p.y) - s, s * 2, s * 2);
      ctx.globalCompositeOperation = 'source-over';
    } else { // spark étang
      const a = 0.5 * Math.sin(f * Math.PI);
      const s = S(p.s);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a; ctx.drawImage(sparkDot, X(p.x) - s, Y(p.y) - s, s * 2, s * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // Lucioles (additif)
  ctx.globalCompositeOperation = 'lighter';
  for (const fl of flies) {
    const x = fl.cx + Math.sin(t * fl.sp + fl.p1) * fl.rx;
    const y = fl.cy + Math.sin(t * fl.sp * 1.37 + fl.p2) * fl.ry;
    const a = Math.pow(Math.max(0, Math.sin(t * fl.bl + fl.p1)), 3) * 1.0;
    if (a < 0.02) continue;
    const s = S(0.26);
    ctx.globalAlpha = a; ctx.drawImage(flyDot, X(x) - s, Y(y) - s, s * 2, s * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // Vol d'oiseaux qui traverse le ciel
  if (birds) {
    birds.x += birds.dir * 2.6 * dt;
    if (birds.x < -8 || birds.x > 108) birds = null;
    else {
      ctx.strokeStyle = 'rgba(12,8,20,.95)';
      ctx.lineWidth = Math.max(1.4, S(0.075));
      for (let b = 0; b < birds.n; b++) {
        const bx = X(birds.x - b * 1.1 * birds.dir);
        const by = Y(birds.y + Math.sin(t * 1.1 + b) * 0.6 + (b % 2) * 0.8);
        const w = S(0.42 + (b % 3) * 0.05), flap = Math.sin(t * 9 + birds.ph + b) * 0.55;
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = 'rgba(12,8,20,.95)';
        ctx.beginPath(); ctx.ellipse(bx, by, w * 0.18, w * 0.10, 0, 0, 7); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx - w, by - flap * w);
        ctx.quadraticCurveTo(bx, by + w * 0.25, bx, by);
        ctx.quadraticCurveTo(bx, by + w * 0.25, bx + w, by - flap * w);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// Appelé après chaque render de la carte (depuis villageMap.js). Construit
// les calques si besoin, les accroche au monde courant, démarre la boucle.
export function ensureVillageAmbient() {
  if (gated()) { if (built) detach(); running = false; return; }
  const screen = document.querySelector('.vmap-screen');
  if (!screen) return;
  const world = screen.querySelector('.vmap-world');
  if (!world) return;
  build();
  attach(world);
  sizeCanvas(world);
  applyTod(nightnessNow());
  if (!running) {
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }
}
