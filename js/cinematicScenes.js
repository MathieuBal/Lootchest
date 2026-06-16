// Lootchest. Données des 7 tableaux de l'intro cinématique.
// Module ES, importé par introMemo.js (séquence avec Mémo) et utilisable
// aussi par cinematic-preview.html (rejouage depuis le Codex) qui lui le
// récupère via une exposition `window.CINEMATIC_SCENES` poussée depuis
// introMemo.js si besoin.
//
// Scene 1 (L'Oubli) et les suivantes pointent sur des planches détourées
// dans assets/cinematic/ (bg / mid / fg + fx par scène). Tant que les PNG
// ne sont pas présents, les balises <img> renderont leur alt vide. Le
// gradient / les FX SVG inclus garantissent un fond visible.

const L = (svg, depth, z) => ({ svg, depth: depth || 0, z: z || 0 });
const IMG = (src) => `<img src="${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;image-rendering:auto" alt="">`;
const grad = (id, stops, type) => type === 'radial'
  ? `<radialGradient id="${id}">${stops}</radialGradient>`
  : `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`;
const SVG = (inner) => `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;

export const CINEMATIC_SCENES = [
  // 1. L'Oubli
  {
    title: "L'Oubli", cam: 'cam-panR',
    text: "Le monde ne fut ni brûlé ni conquis. Il fut oublié. Une lente érasure, depuis les bords, effaça les choses, jusqu'à ce qu'elles n'aient jamais été.",
    layers: [
      L(IMG('assets/cinematic/scene1_bg.png'), 4, 0),
      L(`<div style="position:absolute;inset:0;transform:translateY(5%) scale(1.1);transform-origin:center bottom">${IMG('assets/cinematic/scene1_mid.png')}</div>`, 7, 1),
      L(`<div class="fx-drift" style="position:absolute;inset:0;opacity:.45;mix-blend-mode:screen">${IMG('assets/cinematic/scene1_fx.png')}</div>`, 14, 2),
      L(IMG('assets/cinematic/scene1_fg.png'), 26, 3),
    ],
  },
  // 2. Les Reliquaires
  {
    title: 'Les Reliquaires', cam: 'cam-in',
    text: "Les Anciens ne purent l'arrêter. Alors ils choisirent d'être retenus. Ils scellèrent le monde, leurs œuvres, leurs noms, leurs âmes, dans d'innombrables reliquaires, et les confièrent à l'Abîme.",
    layers: [
      L(IMG('assets/cinematic/scene2_bg.png'), 4, 0),
      L(`<div style="position:absolute;inset:0;transform:translateY(4%) scale(1.05);transform-origin:center bottom">${IMG('assets/cinematic/scene2_mid.png')}</div>`, 8, 1),
      L(SVG(`<defs>${grad('s2g', '<stop offset="0" stop-color="#ffdf9a" stop-opacity=".5"/><stop offset="55%" stop-color="#caa05a" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0"/>', 'radial')}</defs><ellipse class="fx-breathe" cx="50" cy="40" rx="34" ry="38" fill="url(#s2g)"/>`), 6, 1),
      L(`<div class="fx-pulse" style="position:absolute;inset:0;opacity:.4;mix-blend-mode:screen">${IMG('assets/cinematic/scene2_fx.png')}</div>`, 13, 2),
      L(`<div class="fx-bob" style="position:absolute;inset:0"><div class="fx-sway" style="position:absolute;inset:0;transform-origin:50% 0"><div style="position:absolute;inset:0;transform:translateY(-7%) scale(.9)">${IMG('assets/cinematic/scene2_fg.png')}</div></div></div>`, 22, 3),
    ],
  },
  // 3. L'Abîme
  {
    title: "L'Abîme", cam: 'cam-down',
    text: "Tout ce qui fut sombra, strate après strate. L'Abîme n'est pas un gouffre, c'est le monde enseveli, qui attend qu'on s'en souvienne.",
    layers: [
      L(IMG('assets/cinematic/scene3_bg.png'), 4, 0),
      L(`<div class="fx-rain" style="position:absolute;inset:0;opacity:.85;mix-blend-mode:screen">${IMG('assets/cinematic/scene3_fx.png')}</div>`, 7, 1),
      L(`<div class="fx-bob" style="position:absolute;inset:0;transform:scale(1.02)">${IMG('assets/cinematic/scene3_mid.png')}</div>`, 13, 2),
      L(`<div style="position:absolute;inset:0;transform:scale(1.05)">${IMG('assets/cinematic/scene3_fg.png')}</div>`, 24, 3),
    ],
  },
  // 4. Le dernier Porte-Clé
  {
    // hero: true → introMemo.js incarne ce tableau avec l'avatar réel du joueur
    // (characterSpriteSVG) en surimpression, plutôt qu'un héros anonyme (UX-007).
    title: 'Le dernier Porte-Clé', cam: 'cam-inHero', hero: true,
    text: "Tu es le dernier à porter les clés. Chaque coffre que tu ouvres rend au jour un fragment du monde perdu.",
    layers: [
      L(`<div style="position:absolute;inset:0;filter:brightness(1.28) contrast(1.05) saturate(1.08)">${IMG('assets/cinematic/scene4_bg.png')}</div>`, 3, 0),
      L(`<div class="fx-bob" style="position:absolute;inset:0;transform:translateY(2%) scale(.9);transform-origin:center 42%">${IMG('assets/cinematic/scene4_mid.png')}</div>`, 11, 1),
      L(`<div style="position:absolute;inset:0;transform:translateY(2%) scale(1.05)">${IMG('assets/cinematic/scene4_fg.png')}</div>`, 26, 3),
    ],
  },
  // 5. Ce que la surface se rappelle
  {
    title: 'Ce que la surface se rappelle', cam: 'cam-panL',
    text: "Ce que tu remontes, tu le reforges, et la surface s'en souvient. Pierre après pierre, le monde renaît derrière toi.",
    layers: [
      L(`<div style="position:absolute;inset:0;filter:saturate(1.05)">${IMG('assets/cinematic/scene5_bg.png')}</div>`, 4, 0),
      L(`<div class="fx-bob" style="position:absolute;inset:0;transform:translateY(8%) scale(.82);transform-origin:center bottom">${IMG('assets/cinematic/scene5_mid.png')}</div>`, 12, 1),
      L(`<div style="position:absolute;inset:0;transform:translateY(2%) scale(1.05)">${IMG('assets/cinematic/scene5_fg.png')}</div>`, 26, 3),
    ],
  },
  // 6. Le Cycle
  {
    title: 'Le Cycle', cam: 'cam-in',
    text: "Mais l'Oubli efface plus vite qu'une seule vie ne sauve. Quand tu tombes, l'Abîme efface tes pas, et ne te laisse que ce que tu es devenu.",
    layers: [
      L(IMG('assets/cinematic/scene6_bg.png'), 4, 0),
      L(`<div class="fx-bob" style="position:absolute;inset:0;transform:translateY(1%) scale(1.01)">${IMG('assets/cinematic/scene6_mid.png')}</div>`, 12, 1),
      L(`<div style="position:absolute;inset:0;transform:scale(1.04)">${IMG('assets/cinematic/scene6_fg.png')}</div>`, 26, 3),
    ],
  },
  // 7. Le Dévoreur
  {
    title: 'Le Dévoreur', cam: 'cam-inDev',
    text: "Au plus profond veille l'Oubli fait chair, le Dévoreur. Tant qu'il respire, le monde s'efface. Descends. Souviens-toi. Et rends-lui le jour.",
    layers: [
      L(IMG('assets/cinematic/scene7_bg.png'), 4, 0),
      L(`<div class="fx-breathe" style="position:absolute;inset:0;transform:translateY(10%) scale(1.02);transform-origin:center bottom">${IMG('assets/cinematic/scene7_mid.png')}</div>`, 10, 1),
      L(`<div style="position:absolute;inset:0;transform:scale(1.03)">${IMG('assets/cinematic/scene7_fg.png')}</div>`, 26, 3),
    ],
  },
];

// Pour le rejouage standalone : si quelqu'un charge cinematic-preview.html
// après ce module (rejouage depuis le Codex), on expose la liste.
if (typeof window !== 'undefined') window.CINEMATIC_SCENES = CINEMATIC_SCENES;
