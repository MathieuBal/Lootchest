# Assets — sprites PNG

Dépose les PNG pixel-art dans ces sous-dossiers. Le jeu les détecte
automatiquement au runtime ; les fichiers manquants retombent sur le
fallback procédural (SVG / emoji) — donc tu peux y aller progressivement.

Convention : `<id>.png` (petit, ~64px pour HUD/cards) et/ou
`<id>-hires.png` (grand, ~500-900px pour combat & révélations).
Seul le `-hires` est utilisé par le code actuel.

## monsters/ (25 ids)

```
gobelin loup araignee ours plante
chauvesouris squelette slime troll golem
zombie bandit spectre garde sorcier
diablotin demonette cerbere incube lave
ombre horreur wraith tentacule videmarcheur
```

Fichier attendu : `assets/monsters/<id>-hires.png`

## bosses/ (5 ids)

```
roi_sylvain  hydre  roi_mort  seigneur_demon  maitre_neant
```

Fichier attendu : `assets/bosses/<id>-hires.png`

## chests/ (10 tiers + 2 mimics)

```
t1_bois       t2_fer        t3_or          t4_mythique    t5_ancestral
t6_stellaire  t7_cosmique   t8_vide        t9_primordial  t10_divin
mimic         mimic_gold
```

Fichier attendu : `assets/chests/<id>-hires.png`

## orbs/ (10 ids — alignés sur `CURRENCY_TYPES`)

```
transmu  augm  alte  regal  chaos
divin    exil  pierre  maitre  focus
```

Fichier attendu : `assets/orbs/<id>-hires.png`

## treasures/ (2 ids)

```
cle  crystal
```

`crystal` est un seul PNG ; la rareté du cristal est appliquée via
`filter: hue-rotate()` en CSS, pas via plusieurs fichiers.

Fichier attendu : `assets/treasures/<id>-hires.png`

## Règle d'or

L'équipement (armes/armures composées) reste **100 % procédural** —
ne mets rien dans des dossiers `weapons/` ou `armors/`, c'est `partsHD.js`
qui gère la composition.
