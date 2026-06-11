// Séquence de début de partie : le coffre, la libération de Mémo, puis le récit
// des tableaux de la cinématique avec Mémo au premier plan.
// Réutilise window.CINEMATIC_SCENES (cinematic-scenes.js) pour les couches.
// Fonctionne au tap (mobile) comme au clic/clavier (PC).

(function () {
  const SCENES = window.CINEMATIC_SCENES;
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage'), camera = $('#camera'), shade = $('#shade');
  const chestScene = $('#chestScene'), burst = $('#burst');
  const dlg = $('#dlg'), memoImg = $('#memoSprite img'), lineEl = $('#line'), tapHint = $('#tapHint');
  const sceneTitle = $('#sceneTitle'), titleNum = $('#sceneTitle .num'), titleT = $('#sceneTitle .t');
  const skipBtn = $('#skip'), backBtn = $('#back'), beginBtn = $('#begin');

  const SPRITE = (n) => `assets/mascot/${n}.png`;

  // ── Le récit de Mémo : par tableau, une liste de répliques.
  // sprite = pose de Mémo pendant la réplique.
  const SCRIPT = [
    { // 0 — juste après l'ouverture, encore sur le fond du coffre
      scene: null,
      lines: [
        { t: "Oh. De l'air. Enfin.", s: 'surprised' },
        { t: "C'est toi qui m'as ouvert ? Toi ?", s: 'surprised' },
        { t: "Bon. J'imagine que je te dois quelque chose. Je m'appelle... attends, ça va me revenir.", s: 'idle' },
        { t: "Appelle-moi Mémo. C'est ce qui reste.", s: 'speak' },
        { t: "Avant que tu poses la question : oui, je vivais dans ce coffre. Et non, ce n'est pas triste. Écoute plutôt.", s: 'point' },
      ],
    },
    { // 1 — L'Oubli
      scene: 0,
      lines: [
        { t: "Le monde n'a pas brûlé. Personne ne l'a conquis. Il a été oublié.", s: 'speak' },
        { t: "Une lente érasure, depuis les bords. Les choses s'effaçaient... jusqu'à n'avoir jamais existé.", s: 'sad' },
        { t: "Je le sais parce que j'y étais. Enfin, je crois. C'est flou.", s: 'idle' },
      ],
    },
    { // 2 — Les Reliquaires
      scene: 1,
      lines: [
        { t: "Les Anciens n'ont pas pu l'arrêter. Alors ils ont choisi d'être retenus.", s: 'speak' },
        { t: "Ils ont tout scellé. Leurs œuvres, leurs noms, leurs âmes. Dans des reliquaires. Des coffres, si tu préfères.", s: 'point' },
        { t: "J'étais dans l'un d'eux. Tu viens de le vider. Merci, au passage.", s: 'idle' },
      ],
    },
    { // 3 — L'Abîme
      scene: 2,
      lines: [
        { t: "Ensuite, tout a sombré. Strate après strate.", s: 'fly' },
        { t: "L'Abîme n'est pas un gouffre. C'est le monde enseveli, qui attend qu'on s'en souvienne.", s: 'speak' },
        { t: "Il y a des choses qui veillent en bas. On en reparlera. Pas maintenant.", s: 'sad' },
      ],
    },
    { // 4 — Le dernier Porte-Clé
      scene: 3,
      lines: [
        { t: "Et puis il y a toi.", s: 'point' },
        { t: "Tu es le dernier à porter les clés. Chaque coffre que tu ouvres rend au jour un fragment du monde perdu.", s: 'speak' },
        { t: "Pas de pression, hein.", s: 'idle' },
      ],
    },
    { // 5 — Ce que la surface se rappelle
      scene: 4,
      lines: [
        { t: "Ce que tu remontes, tu le reforges. Et la surface s'en souvient.", s: 'speak' },
        { t: "Pierre après pierre, le monde renaît derrière toi. Un village, d'abord. Puis qui sait.", s: 'fly' },
      ],
    },
    { // 6 — Le Cycle
      scene: 5,
      lines: [
        { t: "Je dois être honnête. L'Oubli efface plus vite qu'une seule vie ne sauve.", s: 'sad' },
        { t: "Quand tu tombes, l'Abîme efface tes pas. Il ne te laisse que ce que tu es devenu.", s: 'speak' },
        { t: "Ton savoir. Ton équipement. Toi. Le reste, il le reprend. C'est le Cycle.", s: 'idle' },
      ],
    },
    { // 7 — Le Dévoreur
      scene: 6,
      lines: [
        { t: "Et tout au fond, il y a... lui.", s: 'surprised' },
        { t: "L'Oubli fait chair. Le Dévoreur. Tant qu'il respire, le monde s'efface.", s: 'sad' },
        { t: "Descends. Souviens-toi. Et rends-lui le jour.", s: 'point' },
        { t: "Allez. Je passe devant. C'est toi qui portes les clés, mais c'est moi qui connais le chemin. Enfin... à peu près.", s: 'fly' },
      ],
    },
  ];

  // ── Rendu d'un tableau (couches + parallaxe) ──
  function renderScene(idx) {
    const s = SCENES[idx];
    camera.className = '';
    camera.innerHTML = s.layers.map(l =>
      `<div class="layer" data-depth="${l.depth || 0}" style="z-index:${l.z || 0}">${l.svg}</div>`).join('');
    void camera.offsetWidth;
    camera.classList.add('zoom');
  }

  // ── Parallaxe : souris (PC) + gyroscope léger via touch-drag (mobile) ──
  let px = 0, py = 0, tx = 0, ty = 0;
  function setTarget(nx, ny) { tx = nx; ty = ny; }
  stage.addEventListener('mousemove', (e) => {
    setTarget(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  });
  stage.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    setTarget((t.clientX / innerWidth - 0.5) * 0.7, (t.clientY / innerHeight - 0.5) * 0.7);
  }, { passive: true });
  (function loop() {
    px += (tx - px) * 0.06; py += (ty - py) * 0.06;
    const MAX = 26;
    camera.querySelectorAll('.layer').forEach(l => {
      const d = (parseFloat(l.dataset.depth) || 0) / 28;
      l.style.transform = `translate(${-px * d * MAX}px,${-py * d * MAX * 0.6}px) scale(1.12)`;
    });
    requestAnimationFrame(loop);
  })();

  // ── Machine à états ──
  // phase: 'chest' → 'dialogue'
  let chap = 0;   // index dans SCRIPT
  let li = 0;     // index de réplique dans le chapitre
  let phase = 'chest';
  let busy = false;

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  function showTitle(sceneIdx) {
    if (sceneIdx == null) { sceneTitle.classList.remove('show'); return; }
    titleNum.textContent = ROMAN[sceneIdx] + ' · ' + SCENES.length;
    titleT.textContent = SCENES[sceneIdx].title;
    sceneTitle.classList.add('show');
  }

  function showLine() {
    const c = SCRIPT[chap];
    const l = c.lines[li];
    memoImg.src = SPRITE(l.s);
    lineEl.textContent = l.t;
    const last = chap === SCRIPT.length - 1 && li === c.lines.length - 1;
    tapHint.textContent = last ? '' : 'toucher pour continuer';
    dlg.classList.remove('pop'); void dlg.offsetWidth; dlg.classList.add('pop');
    if (last) beginBtn.classList.add('show');
  }

  function goChapter(n, dir) {
    if (n < 0 || n >= SCRIPT.length) return;
    busy = true;
    stage.classList.add('swap');
    beginBtn.classList.remove('show');
    setTimeout(() => {
      chap = n; li = (dir === 'back') ? 0 : 0;
      const c = SCRIPT[chap];
      if (c.scene != null) { chestScene.classList.add('hidden'); renderScene(c.scene); }
      showTitle(c.scene);
      stage.classList.remove('swap');
      showLine();
      busy = false;
    }, 700);
  }

  function advance() {
    if (busy || phase !== 'dialogue') return;
    const c = SCRIPT[chap];
    if (li < c.lines.length - 1) { li++; showLine(); }
    else if (chap < SCRIPT.length - 1) goChapter(chap + 1);
    // dernier chapitre + dernière ligne : le bouton "Entrer dans l'Abîme" est déjà affiché
  }
  function goBack() {
    if (busy || phase !== 'dialogue') return;
    if (li > 0) { li--; showLine(); }
    else if (chap > 0) goChapter(chap - 1, 'back');
  }

  // ── Phase 1 : le coffre ──
  let opened = false;
  $('#chestWrap').addEventListener('click', () => {
    if (opened) return; opened = true;
    chestScene.classList.add('shaking');
    setTimeout(() => {
      burst.classList.add('go');
      setTimeout(() => {
        phase = 'dialogue';
        chestScene.querySelector('#chestHint').style.opacity = 0;
        dlg.classList.remove('hidden');
        skipBtn.classList.remove('hidden');
        backBtn.classList.remove('hidden');
        showLine();
      }, 480);
    }, 520);
  });

  // ── Contrôles ──
  dlg.addEventListener('click', advance);
  stage.addEventListener('click', (e) => {
    if (phase !== 'dialogue') return;
    if (e.target.closest('#dlg,#skip,#back,#begin,#chestWrap')) return;
    advance();
  });
  backBtn.addEventListener('click', (e) => { e.stopPropagation(); goBack(); });
  skipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (phase !== 'dialogue') return;
    goChapter(SCRIPT.length - 1);
    setTimeout(() => { li = SCRIPT[SCRIPT.length - 1].lines.length - 1; showLine(); }, 750);
  });
  beginBtn.addEventListener('click', () => {
    // Dans le jeu : UI.endIntro() → state.ui.hasSeenIntro = true → onglet coffre.
    beginBtn.textContent = '✓ À toi de jouer';
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') advance();
    if (e.key === 'ArrowLeft') goBack();
    if (e.key === 'Escape') skipBtn.click();
  });
})();
