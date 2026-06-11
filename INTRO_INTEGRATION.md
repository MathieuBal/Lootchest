# Séquence de début de partie. Guide d'intégration

Cette séquence remplace l'ancienne intro (`startIntro` dans `cinematic.js`). Elle couvre
le tout premier lancement du jeu : le joueur a une clé et un coffre, il l'ouvre, Mémo en
sort et raconte l'histoire du monde en sept tableaux peints, puis le joueur entre dans le jeu.

## Contenu du dossier

| Fichier | Rôle |
|---------|------|
| `intro-memo.html` | La séquence complète. Sert de référence : tout le CSS et la structure sont dedans. |
| `intro-memo-script.js` | La machine à états : phase coffre, dialogues de Mémo, navigation, parallaxe. |
| `cinematic-scenes.js` | Les 7 tableaux (couches, profondeurs de parallaxe, animations). Partagé avec la cinématique seule. |
| `cinematic-preview.html` | La cinématique sans Mémo, gardée comme référence et pour rejouer l'histoire depuis le Codex. |
| `assets/cinematic/` | Les 26 planches détourées (bg, mid, fg et fx par scène). |
| `assets/mascot/` | Les 11 sprites de Mémo. |
| `assets/chests/t1_bois.png`, `assets/treasures/cle.png` | Le coffre et la clé de la phase 1. |

Ouvre `intro-memo.html` dans un navigateur pour voir le comportement attendu, sur PC comme
sur mobile. Tout fonctionne au tap, au clic et au clavier.

## Le déroulé

1. Phase coffre : un coffre en bois au centre, le compteur affiche 1 clé, une invite pulse.
   Le joueur touche le coffre : tremblement, éclat de lumière.
2. Mémo apparaît en bas avec sa boîte de dialogue. Cinq répliques de présentation.
3. Les tableaux s'enchaînent. Mémo reste au premier plan et raconte, sa pose change selon
   la réplique (surpris, triste, il pointe, il vole). Derrière lui, les planches en
   parallaxe avec un zoom lent.
4. Sur la dernière réplique du dernier tableau, le bouton « Entrer dans l'Abîme » apparaît.

## Branchement dans le jeu

### 1. Copier les fichiers
```
js/intro-memo-script.js
js/cinematic-scenes.js        (remplace la version existante si elle date)
assets/cinematic/             (26 png)
assets/mascot/                (11 png, déjà copiés si Mémo est intégré)
```

### 2. Démarrage
Dans `main.js`, à l'endroit où l'ancienne intro se lançait :
```js
if (!state.ui.hasSeenIntro) startMemoIntro();
```
`startMemoIntro` monte la structure de `intro-memo.html` (le bloc `#stage` et ses enfants)
dans un overlay plein écran et charge le script. À la fin, le bouton « Entrer dans l'Abîme »
doit faire :
```js
state.ui.hasSeenIntro = true;
state.ui.hasSeenWelcome = true;   // la séquence remplace aussi le welcome modal
// retirer l'overlay, aller à l'onglet coffre
```

### 3. Cohérence avec Mémo
La séquence EST la première rencontre avec Mémo. Donc dans `mascot.js`, retire la
réplique `first_chest` (ou marque `state.mascot.seen.first_chest = true` à la fin de
l'intro) pour qu'il ne se représente pas une deuxième fois au premier coffre.

### 4. Rejouer l'histoire
Garde un bouton « Revoir l'histoire » dans les options ou le Codex qui ouvre
`cinematic-preview.html` (la version sans Mémo, textes d'origine).

## Points techniques à connaître

* Le conteneur des couches est surdimensionné (`scale(1.12)`) pour que la parallaxe ne
  révèle jamais les bords des images. Si tu changes l'amplitude de la parallaxe (MAX dans
  le script), garde la marge en proportion.
* `#stage` doit garder `flex: none` s'il vit dans un conteneur flex, sinon il se fait
  comprimer et le cadre 16:9 devient une colonne.
* Les images des tableaux pèsent entre 1 et 3 Mo chacune. Précharge la scène suivante
  pendant que le joueur lit (une balise `link rel=preload` ou un `new Image()` suffit).
* Sur mobile, les tailles passent par `clamp()` et les `safe-area-inset`. Ne remplace pas
  les unités `vmin` par des pixels fixes.
* `prefers-reduced-motion` coupe déjà toutes les animations.
* La phase coffre utilise les vrais assets du jeu (`t1_bois.png`, `cle.png`) : si le
  joueur démarre avec un autre coffre, remplace simplement la source de l'image.

## Le ton des textes

Les répliques de Mémo dans `intro-memo-script.js` suivent les mêmes règles que `mascot.js` :
phrases courtes et naturelles, humour sec, pas de tirets longs ni de symboles. Si tu ajoutes
ou modifies des répliques, garde ce ton. Les textes d'origine de la cinématique (plus
solennels) restent dans `cinematic-scenes.js` et servent à la version sans Mémo.
