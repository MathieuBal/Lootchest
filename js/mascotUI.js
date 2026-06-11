// Affichage des interventions de Mémo. Trois rendus selon le niveau :
//   lvl 1  plein écran assombri, le texte avance au tap, grand sprite
//   lvl 2  bulle ancrée en bas, non bloquante, se ferme au tap
//   lvl 3  pastille discrète, ouvre la bulle si on la touche
// Tout passe par Mascot.onSpeak ; main.js peut aussi pousser une réplique
// ambiante via memoSay(line) (tap sur Mémo perché au hub).

import { Mascot, MASCOT_SPRITES, MASCOT_EMOJI } from './mascot.js';
import { spriteImg } from './spriteMap.js';

const css = `
.memo-layer { position: fixed; inset: 0; z-index: 300; pointer-events: none; }
.memo-fullscreen {
  position: absolute; inset: 0; pointer-events: auto;
  background: rgba(5, 3, 10, .82); backdrop-filter: blur(3px);
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  padding: 24px 18px calc(env(safe-area-inset-bottom, 0px) + 28px);
  animation: memoFade .35s ease;
}
.memo-fullscreen .memo-sprite { width: min(46vw, 240px); margin-bottom: 14px; animation: memoHover 3.2s ease-in-out infinite; text-align: center; }
.memo-fullscreen .memo-sprite img { width: 100%; filter: drop-shadow(0 0 24px rgba(150, 130, 255, .4)); }
.memo-fullscreen .memo-sprite .memo-emoji { font-size: min(30vw, 130px); filter: drop-shadow(0 0 24px rgba(150, 130, 255, .55)); }
.memo-box {
  width: min(560px, 100%); background: linear-gradient(160deg, #1c1530, #120d20);
  border: 1px solid #4a3a6e; border-radius: 14px; padding: 14px 16px;
  color: #ece4f5; font-size: 15px; line-height: 1.5;
}
.memo-box .memo-name { font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: #b39ddb; margin-bottom: 6px; }
.memo-box .memo-next { margin-top: 10px; font-size: 12px; color: #8a7fa8; text-align: right; }
.memo-bubble {
  position: absolute; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 76px);
  pointer-events: auto; display: flex; gap: 10px; align-items: flex-end;
  animation: memoRise .3s ease;
}
.memo-bubble .memo-mini { width: 56px; flex-shrink: 0; text-align: center; }
.memo-bubble .memo-mini img { width: 100%; filter: drop-shadow(0 0 10px rgba(150, 130, 255, .4)); }
.memo-bubble .memo-mini .memo-emoji { font-size: 40px; filter: drop-shadow(0 0 10px rgba(150, 130, 255, .55)); }
.memo-bubble .memo-box { flex: 1; border-radius: 14px 14px 14px 4px; }
.memo-ping {
  position: absolute; pointer-events: auto; width: 44px; height: 44px;
  border-radius: 50%; background: rgba(28, 21, 48, .9); border: 1px solid #4a3a6e;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  animation: memoPulse 2.6s ease-in-out infinite;
}
.memo-ping img { width: 32px; }
.memo-ping .memo-emoji { font-size: 24px; }
/* Mémo perché sur le hub, flottant à droite du coffre (.chest-hero est relative) */
.memo-perch {
  position: absolute; right: -54px; bottom: 8px;
  width: 60px; height: 60px; border: none; background: none; cursor: pointer;
  padding: 0; display: flex; align-items: center; justify-content: center;
  animation: memoHover 3.6s ease-in-out infinite; z-index: 3;
}
.memo-perch img { width: 100%; filter: drop-shadow(0 0 12px rgba(150, 130, 255, .45)); }
.memo-perch .memo-emoji { font-size: 42px; filter: drop-shadow(0 0 12px rgba(150, 130, 255, .6)); }
.memo-perch:active { transform: scale(.92); }
.memo-perch .memo-zzz {
  position: absolute; top: -6px; right: -4px; font-size: 14px; color: #b39ddb;
  animation: memoFade 1s ease; pointer-events: none;
}
@keyframes memoFade { from { opacity: 0 } }
@keyframes memoRise { from { opacity: 0; transform: translateY(10px) } }
@keyframes memoHover { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes memoPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(150, 130, 255, .35) } 50% { box-shadow: 0 0 0 8px rgba(150, 130, 255, 0) } }
`;

// CSS injecté dès l'import : le hub (ui.js) utilise .memo-perch sans
// attendre la première bulle.
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

let layer = null;

function ensureLayer() {
  if (layer) return layer;
  layer = document.createElement('div');
  layer.className = 'memo-layer';
  document.body.appendChild(layer);
  return layer;
}

// Sprite avec fallback emoji tant que les PNG n'existent pas.
export function memoSprite(key, { size = null } = {}) {
  const src = MASCOT_SPRITES[key] || MASCOT_SPRITES.idle;
  const emoji = `<span class="memo-emoji">${MASCOT_EMOJI[key] || '🔮'}</span>`;
  return spriteImg(src, emoji, { size, title: 'Mémo' });
}

// lvl 1 : dialogue plein écran, le texte avance au tap
function showFullscreen(line) {
  const root = ensureLayer();
  let step = 0;
  const el = document.createElement('div');
  el.className = 'memo-fullscreen';
  const render = () => {
    el.innerHTML = `
      <div class="memo-sprite">${memoSprite(line.sprite)}</div>
      <div class="memo-box">
        <div class="memo-name">Mémo</div>
        <div>${line.text[step]}</div>
        <div class="memo-next">${step < line.text.length - 1 ? 'toucher pour continuer' : 'toucher pour fermer'}</div>
      </div>`;
  };
  el.addEventListener('click', () => {
    step++;
    if (step >= line.text.length) el.remove();
    else render();
  });
  render();
  root.appendChild(el);
}

// lvl 2 : bulle non bloquante (une seule à la fois — la nouvelle remplace)
let currentBubble = null;
function showBubble(line) {
  const root = ensureLayer();
  if (currentBubble) currentBubble.remove();
  const el = document.createElement('div');
  el.className = 'memo-bubble';
  el.innerHTML = `
    <div class="memo-mini">${memoSprite(line.face || line.sprite)}</div>
    <div class="memo-box">
      <div class="memo-name">Mémo</div>
      <div>${line.text[0]}</div>
    </div>`;
  el.addEventListener('click', () => { el.remove(); if (currentBubble === el) currentBubble = null; });
  root.appendChild(el);
  currentBubble = el;
  setTimeout(() => { el.remove(); if (currentBubble === el) currentBubble = null; }, 12000);
}

// lvl 3 : pastille discrète qui ouvre la bulle
function showPing(line) {
  const root = ensureLayer();
  const el = document.createElement('div');
  el.className = 'memo-ping';
  el.style.right = '14px';
  el.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 140px)';
  el.innerHTML = memoSprite('fly');
  el.addEventListener('click', () => { el.remove(); showBubble(line); });
  root.appendChild(el);
  setTimeout(() => el.remove(), 30000); // s'efface si on l'ignore
}

// Réplique poussée directement (tap sur Mémo au hub).
export function memoSay(line) { if (line) showBubble(line); }

Mascot.onSpeak((line) => {
  if (line.lvl === 1) showFullscreen(line);
  else if (line.lvl === 2) showBubble(line);
  else showPing(line);
});
