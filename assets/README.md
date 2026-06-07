# Assets — sprites PNG

Dépose les PNG pixel-art dans ces sous-dossiers. Le jeu les détecte
automatiquement au runtime ; les fichiers manquants retombent sur le
fallback procédural (SVG / emoji) — tu peux y aller progressivement.

## ⚙️ Convention

Le code charge **uniquement le `-hires.png`** pour le moment.
Nom de fichier attendu : `<id>-hires.png` (l'id ci-dessous, suffixé `-hires`).

Liste vérifiée le 2026-06-07 par un test runtime qui résout chaque entité
de `data.js` à travers `js/spriteMap.js` :
**25 monstres + 5 boss + 10 coffres + 10 orbes + 2 mimics + 2 trésors = 54 sprites**.

## 📁 monsters/ — 25 fichiers

```
gobelin-hires.png        loup-hires.png           araignee-hires.png
ours-hires.png           plante-hires.png

chauvesouris-hires.png   squelette-hires.png      slime-hires.png
troll-hires.png          golem-hires.png

zombie-hires.png         bandit-hires.png         spectre-hires.png
garde-hires.png          sorcier-hires.png

diablotin-hires.png      demonette-hires.png      cerbere-hires.png
incube-hires.png         lave-hires.png

ombre-hires.png          horreur-hires.png        wraith-hires.png
tentacule-hires.png      videmarcheur-hires.png
```

## 📁 bosses/ — 5 fichiers

```
roi_sylvain-hires.png
hydre-hires.png
roi_mort-hires.png
seigneur_demon-hires.png
maitre_neant-hires.png
```

## 📁 chests/ — 10 tiers + 2 mimics

```
t1_bois-hires.png         t2_fer-hires.png        t3_or-hires.png
t4_mythique-hires.png     t5_ancestral-hires.png  t6_stellaire-hires.png
t7_cosmique-hires.png     t8_vide-hires.png       t9_primordial-hires.png
t10_divin-hires.png

mimic-hires.png           mimic_gold-hires.png
```

## 📁 orbs/ — 10 fichiers

```
transmu-hires.png   augm-hires.png     alte-hires.png    regal-hires.png
chaos-hires.png     divin-hires.png    exil-hires.png    pierre-hires.png
maitre-hires.png    focus-hires.png
```

## 📁 treasures/ — 2 fichiers

```
cle-hires.png       crystal-hires.png
```

`crystal-hires.png` est un seul PNG ; la rareté du cristal est appliquée
via `filter: hue-rotate()` en CSS, pas via plusieurs fichiers.

## 🛠 Vérifier ce qui est chargé en jeu

Ouvre la console navigateur (F12) après avoir lancé le jeu :

```js
window.spriteAudit?.()    // affiche un tableau OK / MISSING / PROBING
```

Tu y verras chaque URL avec son statut. Idéal pour repérer un nom mal
orthographié.

## ⚠️ Règle d'or

L'équipement (armes/armures composées) reste **100 % procédural** —
ne mets rien dans des dossiers `weapons/` ou `armors/`, c'est `partsHD.js`
qui gère la composition.
