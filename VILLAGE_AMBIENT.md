# Village vivant. Le moteur d'ambiance

Ce document décrit le moteur d'effets qui rend le village vivant, et comment l'intégrer.
La référence jouable est `village-fx-demo.html` (panneau de contrôle pour tout tester,
slider jour/nuit, sliders densité et vent). Toute la logique y est, prête à être reprise.

## Le principe

Au-dessus de l'illustration du village, on empile trois choses, toutes invisibles tant
qu'il n'y a pas de contenu, et toutes positionnées en POURCENTAGE de l'image (donc
indépendantes de la taille d'écran, du zoom et du pan) :

```
#world
  img            l'illustration du village (village_bg.png)
  #tint          calque de teinte jour/nuit (mix-blend-mode: multiply)
  #vig           vignette qui s'assombrit la nuit
  #ambient       halos CSS (fenêtres, forge, orbe, sanctuaire)
  #fxcanvas      moteur de particules (tout le reste)
```

Le tint et la vignette sont placés SOUS le canvas et les halos : la nuit, le village
s'assombrit pendant que torches, braises, fenêtres et étoiles continuent de briller
par-dessus. C'est ce qui donne la vraie sensation de nuit.

## Les effets (tous activables/désactivables un par un)

| Effet | Type | Où, sur l'illustration |
|-------|------|------------------------|
| Fumées de cheminée | canvas | maisons, fonderie, forge, scierie |
| Braises | canvas additif | gueule du four de la forge + fonderie |
| Lucioles | canvas additif | lisières et étang |
| Étang qui scintille | canvas additif | plan d'eau en bas à gauche |
| Oiseaux | canvas | vol qui traverse le ciel, toutes les 20 à 45 s |
| Torches vacillantes | canvas additif | 6 lampadaires de la place et des routes |
| Magie | canvas additif | volutes dorées sur la statue, violettes sur sanctuaire et orbe |
| Feuilles | canvas | tombent des lisières de forêt |
| Brume rasante | canvas | carrière et bord bas de l'image |
| Chauves-souris | canvas | s'envolent de la tour de la caserne |
| Villageois | canvas | marchent sur les routes de terre, certains avec une lanterne |
| Papillons de nuit | canvas additif | tournoient autour des torches |
| Halos de fenêtres | CSS | mairie, marché, guilde, maisons, + orbe, sanctuaire, forge |
| Cycle jour/nuit | tint + vignette | toute la scène |

Les positions des émetteurs sont dans des tableaux en haut du moteur (`SMOKE`, `EMBERS`,
`TORCHES`, `MAGIC`, `LEAFZONES`, `MISTZONES`, `POND`, `ROADS`, `SKY`), en pourcentage.
Tout a été calé sur l'illustration actuelle. Si l'illustration change, ce sont les seuls
chiffres à reprendre (le panneau de la démo a un mode de relevé de coordonnées).

## Le cycle jour/nuit

Une seule variable `nightness` (0 = soir, l'art d'origine ; 1 = nuit profonde) pilote :
* l'opacité du calque de teinte bleue (multiply) et de la vignette
* l'intensité des halos de fenêtres
* l'apparition des étoiles (invisibles le soir, brillantes la nuit)
* le relief des torches dans le noir

`applyTod()` applique tout ça instantanément, indépendamment de la boucle d'animation,
donc la réponse au réglage est immédiate.

Dans le jeu, branche `nightness` sur ce que tu veux :
* l'heure réelle du joueur (`new Date().getHours()` mappé sur une courbe)
* une horloge de jeu qui avance pendant les sessions
* un état narratif (la nuit tombe quand l'Oubli gagne du terrain, par exemple)

Mets `autoTod = true` pour un cycle automatique de démonstration.

## Intégration

1. Reprends le bloc `#tint`, `#vig`, `#ambient`, `#fxcanvas` dans le conteneur du village,
   le CSS associé, et le `<script>` du moteur depuis `village-fx-demo.html`.
2. Le moteur est autonome : un seul `requestAnimationFrame`, ses sprites sont pré-rendus
   (aucune image à charger), il plafonne ses particules. Tu peux le coller tel quel.
3. Branche `nightness` sur ton horloge de jeu.
4. Câble les coupe-circuit (voir plus bas).

Le canvas est en `pointer-events: none`, il ne gêne donc jamais les hotspots des bâtiments.

## Performances et accessibilité

* Le `devicePixelRatio` est plafonné à 1.5 pour limiter le coût sur mobile.
* Coupe-circuit `prefers-reduced-motion` : ne rien démarrer (à recâbler dans le jeu si
  tu pars de la version carte, qui a déjà le gate).
* Classe `no-ambient` sur le conteneur : tout couper, à brancher sur l'option
  « Particules réduites » existante du jeu.
* Le slider « Densité » de la démo montre la marge : tu peux baisser le nombre de
  particules sur les petits appareils sans rien changer d'autre.

## Réglages par défaut conseillés

* Densité 1.0, vent 1.0 : bon équilibre, l'ambiance reste discrète.
* `nightness` de départ vers 0.35 (léger crépuscule) : la scène respire sans être sombre.
* Sur mobile, démarrer avec le panneau de réglages masqué (la démo le fait déjà).

## Fichiers

* `village-fx-demo.html` : la référence jouable avec le panneau de contrôle.
* `village-map.html` : la carte cliquable du jeu (hotspots + fiches). Le moteur d'ambiance
  s'y intègre dans le même conteneur `#world`.
* `assets/village/` : l'illustration et les 14 portraits de bâtiments.
