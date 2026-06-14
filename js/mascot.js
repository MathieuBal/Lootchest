// Mémo, l'Esprit de Reliquaire. Logique des interventions.
// Le jeu lui signale des événements via Mascot.fire('event'), il décide
// seul s'il doit parler (flags persistés dans state.mascot). Il vit aussi
// sur le hub (perché près du coffre) : Mascot.ambient(ctx) fournit une
// réplique contextuelle quand le joueur le tape.
//
// LES TEXTES SONT DANS js/mascotLines.json (éditable à la main, sans
// toucher au code). Ce module ne contient plus que les sprites, les
// conditions nommées des répliques contextuelles, et la mécanique
// (cooldowns, anti-répétition, déblocage des souvenirs).
//
// Voix : esprit millénaire enfermé mille ans dans un coffre, sarcastique,
// désabusé, lucide sur le fait d'être dans un jeu. Brise le 4e mur par la
// poésie, pas par le jargon. Parlé, pas écrit : virgules et points, pas de
// tirets cadratins, peu de majuscules emphatiques.

// ── Sprites disponibles (assets/mascot/) + fallback emoji ──
export const MASCOT_SPRITES = {
  idle:      'assets/mascot/idle.png',
  speak:     'assets/mascot/speak.png',
  point:     'assets/mascot/point.png',
  surprised: 'assets/mascot/surprised.png',
  sad:       'assets/mascot/sad.png',
  fly:       'assets/mascot/fly.png',
  hero:      'assets/mascot/hero.png',            // grand format, dialogues plein écran
  face_neutral:   'assets/mascot/face_neutral.png',
  face_happy:     'assets/mascot/face_happy.png',
  face_surprised: 'assets/mascot/face_surprised.png',
  face_worried:   'assets/mascot/face_worried.png',
};
// Tant que les PNG n'existent pas, Mémo est un feu follet emoji.
export const MASCOT_EMOJI = {
  idle: '🔮', speak: '🔮', point: '🔮', surprised: '🔮', sad: '🔮',
  fly: '🔮', hero: '🔮',
  face_neutral: '🔮', face_happy: '✨', face_surprised: '💫', face_worried: '🌫️',
};

// ── Les répliques vivent dans mascotLines.json (éditable à la main) ──
// On charge le fichier au démarrage du module. MASCOT_LINES et AMBIENT_LINES
// sont remplis quand la requête revient ; d'ici là Mémo reste muet (les
// événements n'arrivent qu'après une interaction du joueur, bien après).
export let MASCOT_LINES = [];
let AMBIENT_LINES = [];

// Conditions nommées des répliques ambiantes contextuelles. Le JSON ne
// référence que la clé (cond), la logique reste ici.
const AMBIENT_COND = {
  nokeys:     c => (c.keys || 0) === 0,
  pityLow:    c => c.pityLeft > 0 && c.pityLeft <= 5,
  canUpgrade: c => !!c.canUpgrade,
  boss:       c => c.floor % 5 === 0 && c.floor > 0,
  streak:     c => (c.streak || 0) >= 10,
  night:      c => c.hour >= 23 || c.hour < 5,
  rich:       c => (c.gold || 0) >= 1e6,
  fullInv:    c => (c.invSize || 0) >= 80,
  noPrestige: c => (c.prestige || 0) === 0 && c.floor >= 40,
  justDied:   c => !!c.justDied,
  broke:      c => (c.gold || 0) < 50,
  deep:       c => (c.floor || 0) >= 30,
  veteran:    c => (c.prestige || 0) >= 3,
};

// Remplace les placeholders {floor} {streak} {pityLeft} {pityS} par les
// valeurs du contexte courant.
function interpolate(tpl, c) {
  return String(tpl)
    .replace(/\{floor\}/g, c.floor ?? '')
    .replace(/\{streak\}/g, c.streak ?? '')
    .replace(/\{pityLeft\}/g, c.pityLeft ?? '')
    .replace(/\{pityS\}/g, (c.pityLeft > 1) ? 's' : '');
}

// Transforme les entrées JSON ambiantes (cond + texte avec placeholders)
// en entrées internes { id, prio, when, text(ctx) }.
function buildAmbient(raw) {
  return (raw || []).map(a => ({
    id: a.id,
    prio: !!a.prio,
    when: a.cond ? AMBIENT_COND[a.cond] : null,
    text: (c) => interpolate(a.text, c),
  }));
}

async function loadLines() {
  try {
    const res = await fetch(new URL('./mascotLines.json', import.meta.url));
    const data = await res.json();
    MASCOT_LINES = Array.isArray(data.lines) ? data.lines : [];
    AMBIENT_LINES = buildAmbient(data.ambient);
  } catch (e) {
    console.warn('Mémo : impossible de charger mascotLines.json', e);
  }
}
// Lancement immédiat (sans bloquer le graphe de modules).
const _linesLoaded = loadLines();


// ── Logique ──
const listeners = [];
let cooldownUntil = 0;
const COOLDOWN_MS = 25000;       // 25 s entre deux interventions (hors lvl 1 et hors "once" jamais vus)
const lineCooldowns = new Map(); // cooldowns par réplique rejouable (non persistés)
const lastVariantIdx = new Map(); // dernière variante servie par réplique (anti-répétition)
let lastAmbientId = null;

// Tire une variante au hasard en évitant de répéter celle servie juste avant
// pour la même réplique. C'est ce qui empêche « les mêmes phrases reviennent ».
function pickText(line) {
  if (!line.variants) return line.text;
  const n = line.variants.length;
  if (n === 1) return [line.variants[0]];
  let idx = Math.floor(Math.random() * n);
  if (idx === lastVariantIdx.get(line.id)) idx = (idx + 1) % n;
  lastVariantIdx.set(line.id, idx);
  return [line.variants[idx]];
}

export const Mascot = {
  state: null, // à brancher : state.mascot du jeu

  init(mascotState) {
    this.state = mascotState || { seen: {}, mode: 'normal' };
    return this.state;
  },

  mode() { return this.state?.mode || 'normal'; },
  setMode(m) { if (this.state) this.state.mode = m; },

  // Le jeu appelle Mascot.fire('chest:opened', { ... }) aux endroits clés.
  fire(event, ctx = {}) {
    if (!this.state) return null;
    const now = Date.now();
    for (const line of MASCOT_LINES) {
      if (line.on !== event) continue;
      if (line.once !== false && this.state.seen[line.id]) continue;
      if (line.chapter != null && ctx.chapter !== line.chapter) continue;
      // Les souvenirs se débloquent toujours (leur événement ne se reproduit
      // pas). En mode discret/muet ils filent au Codex sans pastille.
      if (line.memory && this.state.mode !== 'normal') {
        this.state.seen[line.id] = true;
        return null;
      }
      if (this.state.mode === 'muet') return null;
      if (line.once === false && now < (lineCooldowns.get(line.id) || 0)) continue;
      // Cooldown global. Exemptions :
      //   lvl 1 (grands moments)
      //   souvenirs (event one-shot perdu sinon)
      //   "once: true" jamais vus (tutoriels)
      const firstTime = (line.once !== false) && !this.state.seen[line.id];
      const exempt = line.lvl === 1 || line.memory || firstTime;
      if (!exempt && now < cooldownUntil) continue;

      this.state.seen[line.id] = true;
      if (line.once === false && line.cd) lineCooldowns.set(line.id, now + line.cd);
      if (line.lvl !== 1 && !firstTime) cooldownUntil = now + COOLDOWN_MS;
      const spoken = { ...line, text: pickText(line) };
      listeners.forEach(fn => fn(spoken, ctx));
      return spoken; // une seule intervention par événement
    }
    return null;
  },

  // Réplique ambiante au tap sur Mémo (hub). Toujours disponible, même en
  // mode discret. C'est le joueur qui vient le chercher. Anti-répétition.
  ambient(ctx = {}) {
    // Avant que le JSON soit chargé, on a une réplique de secours pour ne
    // jamais rester sans rien dire au tap.
    if (!AMBIENT_LINES.length) {
      return { id: 'amb_fallback', lvl: 2, sprite: 'speak', face: 'face_happy',
        text: ["Laisse-moi une seconde, je rassemble mes esprits. Au sens propre, dans mon cas."], ambient: true };
    }
    const eligible = AMBIENT_LINES.filter(l => !l.when || l.when(ctx));
    const contextual = eligible.filter(l => l.prio && l.id !== lastAmbientId);
    // 75 % de chances de servir le contextuel s'il y en a un.
    let pool = (contextual.length && Math.random() < 0.75) ? contextual : eligible;
    if (pool.length > 1) pool = pool.filter(l => l.id !== lastAmbientId);
    const line = pool[Math.floor(Math.random() * pool.length)];
    lastAmbientId = line.id;
    return {
      id: line.id, lvl: 2, sprite: 'speak', face: 'face_happy',
      text: [typeof line.text === 'function' ? line.text(ctx) : line.text],
      ambient: true,
    };
  },

  // Promesse résolue quand mascotLines.json est chargé (pour les tests).
  ready() { return _linesLoaded; },

  // mascotUI.js s'abonne ici pour afficher la bulle.
  onSpeak(fn) { listeners.push(fn); },

  // Pour le Codex : tous les souvenirs (débloqués ou non).
  memories() {
    return MASCOT_LINES.filter(l => l.memory).map(l => ({
      id: l.id, title: l.memoryTitle || l.id, text: l.text,
      unlocked: !!this.state?.seen[l.id],
    }));
  },

  // Mémo apparaît sur le hub dès qu'il est sorti de son coffre.
  isFreed() { return !!this.state?.seen?.first_chest; },
};
