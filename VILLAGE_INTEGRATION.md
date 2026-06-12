# Village illustré. Guide d'intégration

Remplace l'onglet village actuel (liste de cartes avec emojis) par une carte illustrée
cliquable : la grande peinture du village avec 14 zones tactiles, et une fiche par
bâtiment avec son portrait en gros plan.

## Contenu du dossier

| Fichier | Rôle |
|---------|------|
| `village-map.html` | La maquette de référence, fonctionnelle telle quelle. Tout le CSS, les positions des hotspots et le comportement de la fiche sont dedans. |
| `assets/village/village_bg.png` | La carte du village (1672 x 941). C'est la seule image de fond, les bâtiments y sont déjà peints. |
| `assets/village/village_fx.png` | Couche de fumées et halos. NON UTILISÉE pour l'instant (rendu pas convaincant), gardée au cas où. |
| `assets/village/buildings/<id>.png` | Les 14 portraits en gros plan, 800px, fond transparent. Les ids correspondent exactement à `BUILDINGS` de `village.js` (plus `townhall`). |

## Le principe

* La carte est une image de fond en `cover` qui garde son ratio. Sur mobile elle
  sur-zoome (x1.45) et se déplace au doigt (pan borné).
* Les 14 hotspots sont des positions en POURCENTAGE de l'illustration (pas du viewport),
  donc ils restent calés sur leurs bâtiments à toutes les tailles d'écran.
* Toucher un bâtiment ouvre une fiche en bas d'écran : portrait, nom, niveau,
  description, bouton Améliorer et gestion des ouvriers pour les producteurs.
* Les états visuels se font sur l'anneau du hotspot, pas sur l'illustration :
  verrouillé (cadenas, anneau gris), en construction (sablier), améliorable (pulse doré).

## Les positions des hotspots

À reprendre telles quelles depuis `village-map.html` (tableau `SPOTS`). Résumé :

| id | x % | y % | | id | x % | y % |
|----|-----|-----|-|----|-----|-----|
| townhall | 48.5 | 36 | | observatory | 88.5 | 9 |
| houses | 22 | 21 | | barracks | 88 | 42 |
| sawmill | 61 | 19 | | guild | 70 | 64 |
| quarry | 11 | 38 | | foundry | 12 | 72 |
| locksmith | 55.5 | 82 | | vault | 31 | 55 |
| market | 73 | 46 | | orbworks | 37 | 77 |
| forge | 82 | 79 | | sanctuary | 69.5 | 8.5 |

La maquette contient un mode calibrage (bouton en bas à gauche) : il affiche tous les
noms et chaque clic sur la carte donne les coordonnées en pourcentage dans la console.
Utile si un spot doit bouger.

## Branchement sur village.js

La maquette utilise des états de démo. Pour brancher le vrai jeu, chaque spot se
construit depuis les fonctions existantes :

```js
import { BUILDINGS, levelOf, workersOn, townhall, buildCost, canBuild } from './village.js';

function spotState(id) {
  if (id === 'townhall') return { lvl: townhall(), locked: false };
  const b = BUILDINGS.find(x => x.id === id);
  const lvl = levelOf(id);
  return {
    lvl,
    locked: townhall() < b.townhallReq,          // cadenas + anneau gris
    constructing: v().construction?.id === id,    // sablier
    upgradable: lvl > 0 && canBuild(id),          // pulse doré
  };
}
```

* La fiche reprend `b.name`, `b.desc`, `buildCost(id)` pour le bouton Améliorer,
  et les boutons ouvriers existants pour les producteurs (`perWorker > 0`).
* Le portrait : `assets/village/buildings/${id}.png`, avec l'emoji du bâtiment en
  secours si l'image manque (la maquette montre comment).
* Pour un bâtiment verrouillé, afficher « Requiert Mairie niv X » (le `townhallReq`).

## Topbar

La barre du haut de la maquette (or, bois, pierre, ouvriers, Âge) est indicative.
Reprendre les vraies valeurs et l'Âge courant (`currentAge()`), et garder le style
pastille sur fond dégradé pour la lisibilité au-dessus de l'illustration.

## Mobile et desktop

* Mobile : sur-zoom x1.45 + pan au doigt (déjà dans la maquette, borné aux bords).
  La fiche en bas respecte `env(safe-area-inset-bottom)`.
* Desktop : la carte tient en entier, pas de pan nécessaire. La fiche reste en bas,
  largeur max 560px centrée.
* Les anneaux de hotspot font au minimum 34px (cible tactile suffisante avec le
  padding du spot).

## Ce qui ne change pas

Toute la logique de `village.js` (coûts, gates par mairie, ouvriers, production,
construction avec durée) reste intacte. Cette refonte ne touche que la présentation
de l'onglet village.

## V2 possibles (plus tard)

* États visuels peints par bâtiment (silhouette verrouillée, échafaudage de chantier)
  posés par-dessus l'illustration aux positions des hotspots.
* Le portrait du bâtiment peut aussi servir dans les toasts de fin de construction
  et dans l'écran de choix de construction.
