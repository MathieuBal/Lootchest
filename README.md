# Lootchest ⚔️📦

Un RPG-looter pixel-art en vanilla JS — ouvre des coffres, équipe ton héros,
plonge dans le donjon.

**Aucun build requis.** Ouvre `index.html` dans un navigateur moderne.
**100% jouable au tactile** (mobile / tablette) avec une feuille d'action dédiée.

---

## Boucle de jeu principale

```
Donjon → Clés + Or → Coffres → Équipement → Donjon plus profond
```

1. **Combats** dans le donjon pour gagner clés, or et items.
2. **Ouvre des coffres** (1 clé par coffre) pour looter de l'équipement.
3. **Équipe** les meilleurs items pour renforcer ton héros.
4. **Monte** dans les étages, traverse les 5 biomes.
5. **Ascensionne** (prestige) à T5 + étage 50 pour repartir plus puissant.

---

## 🆕 Première visite

Au premier chargement, un **welcome modal** explique le jeu en 4 cartes :
ouvre des coffres → équipe & combats → progresse → astuces tactile/desktop.

Des **indicateurs "prochaine étape"** (pulsation dorée) guident le joueur
vers l'action la plus utile : ouvrir le premier coffre, équiper son premier
item, aller au donjon pour le premier combat.

Les termes de jeu (`affixe`, `orbe`, `ascension`, `pity`, `set`…) sont
**soulignés en pointillés dorés** dans l'aide et dans certaines zones —
hover ou tap dessus affiche leur définition (glossaire inline de 23 termes).

---

## Pixel-art & visuel

### 👤 Personnage (64×64 procédural)
Sprite construit programmatiquement avec primitives (rect, ellipse,
outline). Multi-niveaux de shading (4 hair, 4 skin), traits faciaux
distincts (sourcils, yeux + blancs, nez, bouche), armure (pauldrons,
plastron, rivets, collerette V), bottes anatomiques.

### 📦 Coffres (64×64, 10 variantes décorées)
Au-delà du changement de palette, **chaque tier a sa décoration unique** :

| Tier | Nom        | Décoration                         |
|------|------------|------------------------------------|
| T1   | Bois       | base classique                     |
| T2   | Fer        | 2 bandes métalliques               |
| T3   | Or         | gemme dorée + sparkles             |
| T4   | Mythique   | 3 runes violettes                  |
| T5   | Ancestral  | grosse gemme rouge + 3 pics        |
| T6   | Stellaire  | 4 étoiles + sparkle sommet         |
| T7   | Cosmique   | rune centrale + sparkles cosmiques |
| T8   | Vide       | glyphe sombre avec œil             |
| T9   | Primordial | feuilles + vigne en arc            |
| T10  | Divin      | couronne dorée + halo + gemme      |

T3-T10 affichent une **aura colorée** (drop-shadow) selon leur thème,
et un pulse doré `chest-ready` quand tu as ≥1 clé.

### 👹 Boss pixel-art (5 sprites 48×48)
Chaque boss de biome remplace l'emoji par un sprite dédié :

- 🌲 **Roi Sylvain** : tronc face creuse, yeux jaunes, couronne de feuilles
- 🪨 **Hydre des Profondeurs** : 3 têtes serpent vertes, yeux rouges
- 🏰 **Roi Mort** : crâne + couronne dorée à 3 pics + gemme rouge
- 🔥 **Seigneur Démon** : tête cornue rouge, yeux blancs incandescents
- 🌌 **Maître du Néant** : œil cosmique, 4 tentacules, sparkles

### ⚔️ Items composés HD (64×64)
Chaque item est composé de plusieurs **parts** procédurales construites
au pixel via primitives (rect, ellipse, line, outline) à **64×64** :
- Armes : blade/guard/grip/pommel (épée, dague), head/handle/wrap (hache),
  head/shaft (baguette), limbs/grip/tips (arc)
- Armures : crown/visor/jaw (heaume), chest/shoulders/lower (plastron),
  top/body/trim (robe), dome/brim/accent (coiffe)…
- Boucliers : body/rim/boss (pavois, targe)
- Accessoires : ring/gem (anneau), chain/body (amulette)…

**17 types composés**, tous en 64×64 (`partsHD.js`). Chaque part :
- a 5-6 niveaux de shading par couleur
- déclare des `roles` (outline/shadow/mid/light/highlight/accent) qui
  permettent le **retint matériau** (la même lame en Or, Obsidienne,
  Cristal…)
- reçoit une **couche d'overlay élémentaire animée** pour les armes
  (braises feu, cristaux givre, arcs foudre, tendrils néant)

Les anciennes parts 16×16 (`parts.js`) restent en fallback pour les
items des sauvegardes pré-HD.

### Optimisations rendu
- Fusion des runs horizontaux dans `gridToRects` : 1 `<rect width="N">`
  au lieu de N rects de 1px → **-64% rects sur le perso, -77% sur le coffre**
- Cache des rects pour layouts immutables (perso + 10 tiers + 5 bosses)
- `scale2x` : upscale intelligent des sprites 16×16 legacy en grand affichage
- Builder partagé (`builder.js`) entre perso/coffre/boss/parts HD

---

## 📱 Mobile / Tactile

- Viewport : `viewport-fit=cover` + safe-areas (notch iPhone)
- `touch-action: manipulation` partout → pas de délai 300ms
- Cibles de tap : `min-height 36–44px` (recommandation WCAG)
- `@media (hover: none)` : suppression des `:hover` collants
- Breakpoints : 800px / 600px / 480px / 360px + landscape compact
- **Feuille d'action** (bottom sheet animé) au tap sur un item :
  Équiper / Vendre / Récupérer / Verrouiller — remplace Shift/Ctrl/Alt+click
  qui restent disponibles en desktop
- HUD plus lisible : 7 boutons principaux + menu `⋯` regroupant
  Aide / Son / Paramètres / Export / Import / Reset

---

## Systèmes de jeu

### 🗝 Clés & Coffres
- Coffres verrouillés → 1 clé pour ouvrir.
- Clés farmées au donjon : ~30% par monstre normal, **1 garantie sur Elite**,
  **3 sur boss**.
- Démarre avec 10 clés. Compteur dans le HUD, pulse rouge quand vide.

### ⚔️ Donjon & Combat
**5 biomes** de 10 étages chacun (étage 41+ = Néant infini) :

| Étages | Biome    | Boss (×5 étages)         | Mécanique                                          |
|--------|----------|--------------------------|----------------------------------------------------|
| 1-10   | Forêt    | Roi Sylvain              | **Régen** 5% PV/tour                              |
| 11-20  | Cavernes | Hydre des Profondeurs    | **Enragé** ×2 dmg sous 30% PV                      |
| 21-30  | Château  | Roi Mort                 | **Bouclier** immunise 1 tour sur 3                 |
| 31-40  | Enfer    | Seigneur Démon           | **Brûlure** 8 dmg/tour passifs                     |
| 41+    | Néant    | Maître du Néant          | **Phase** ×1.5 dmg tous les 4 tours                |

- Navigation libre entre étages débloqués.
- **⭐ Elites** (8% sur étages ≥3, hors boss) : monstre violet, stats ×2.5,
  récompenses ×2.5, 1 clé garantie.
- **✦ Affixes de monstres** : mécaniques de combat (et non plus de simples
  stats) portées par les élites (toujours 1) et par les monstres normaux à
  partir de l'étage 8 (chance croissante). Le **Néant (41+)** peut en empiler
  **2** pour varier l'endgame. Chaque affixe augmente l'or, le drop et la
  chance de clé (~+30 %/affixe). L'encounter est **stable** : l'aperçu
  correspond au combat, puis se re-roll après chaque combat.

  | Affixe         | Effet                                         |
  |----------------|-----------------------------------------------|
  | 🔄 Régénérant  | Régénère 4 % PV/tour                          |
  | 💢 Enragé      | ×1.6 dégâts sous 35 % PV                       |
  | 🛡 Blindé      | Immunise 1 tour sur 4                          |
  | 🔥 Brûlant     | Brûlure passive (∝ ses dégâts)                |
  | 🌀 Instable    | ×1.4 dégâts tous les 4 tours                   |
  | 🌵 Épineux     | Renvoie 25 % de tes coups                      |
  | 🩸 Vampirique  | Se soigne de 40 % de ses dégâts                |
  | ⚡ Véloce      | 30 % de frapper deux fois                      |

- **🔁 Boucle** : auto-combat sur tout étage déjà battu, s'arrête à la défaite.

### 🌊 Plongée des Profondeurs (roguelite)
Débloquée à l'**étage 10**, la Plongée transforme la progression plate en
un **run à attrition** : tes **PV se reportent** d'un combat à l'autre (avec
un petit soin de 8% PV/victoire), les monstres s'enfoncent toujours plus
profond avec une « taxe de plongée » croissante, et tu descends aussi loin
que ta survie le permet.

- **Points de contrôle** tous les 3 paliers : choisis **1 boon parmi 3**
  (💚 Repos · ⚔️ Furie +15% dégâts · 🛡 Égide −12% dégâts subis ·
  ❤️ Vigueur +20% PV max · 💰 Cupidité +50% or) puis décide de **continuer
  ou de remonter** avec ton butin.
- **Butin sécurisé vs en jeu** : l'or gagné depuis le dernier point de
  contrôle est « en jeu ». Atteindre un point de contrôle le **sécurise**.
  Remonter volontairement = **100%** du butin ; **mourir = tu perds la moitié
  de l'or non sécurisé** → vraie tension pousser/encaisser.
- **Record de profondeur** persistant. La plongée est un *run* : recharger
  la page l'abandonne (seul le record est gardé).

### 🎒 Inventaire & Items

#### Raretés
`Commun → Magique → Rare → Épique → Légendaire → Ancestral`

#### 🧩 Composition procédurale
Chaque arme/armure est composée de plusieurs **couches indépendantes** qui
contribuent toutes aux stats finales et apparaissent dans la section
"Composition" du tooltip avec leur qualité de roll (▓▓▓░░) :

| Couche             | Contenu                                                                  | Visible où                                  |
|--------------------|--------------------------------------------------------------------------|---------------------------------------------|
| 🧩 **Parties**     | Lame + garde + pommeau (épée), tête + manche + lien (hache), etc.        | Sprite de l'item                            |
| 🔩 **Matériau**    | Fer · Bronze · Os · Acier · Argent · Obsidienne · Or · Cristal · Mithril · Os de Dragon | Chip coin bas-gauche, adjectif au nom |
| ✨ **Élément**     | Aucun · Feu · Givre · Poison · Foudre · Néant (optionnel)                | Chip coin haut-droit (flicker), nom         |
| 🏷 **Faction**     | Aucune · Royal · Infernal · Sylvain · Spectral · Bestial (rare+ uniquement) | Adjectif au nom + biais matériau/élément |
| ✦ **Effet légend.**| Pacte de Sang · Marque du Vampire · Toucher Brûlant · Foudre en Chaîne · Toucher d'Or · Écho du Néant | ✦ doré coin + bloc dans tooltip |

Les factions biaisent les rolls de matériau et d'élément vers leur thème
(un objet Infernal a ~44 % de chance d'être de Feu vs ~14 % sans biais).
Les effets légendaires modifient le **comportement** de combat (vs les
affixes qui n'ajoutent que des stats) et certains nécessitent un
élément/matériau spécifique (Foudre en Chaîne ne sort que sur des items
de Foudre, Toucher d'Or que sur des items en Or…).

Exemple d'item :
```
Astral Robe Givrée en Acier Royale
  🧩 Épaules Lisses      +24 %Feu        ▓▓▓░░
  🧩 Corps Lisse         +35 Vie         ▓▓▓░░
  🧩 Bordure Dorée       +13 Vie · +13 %Or
  🔩 Acier               +5 Dégâts · +3 Armure
  ✨ Givre               +29 %Givre · +7 %Vitesse
  🏷 Royal               +5 Armure · +6 %Or
  ✦ Marque du Vampire    Vol de vie 8 % / coup
```

Une **🪨 Pierre de Forge** préserve toute l'identité (parties, matériau,
élément, faction, affixes, effet) — seules les valeurs montent en gamme.

#### Sets & Uniques
- **20 uniques légendaires** (items nommés, affixes fixes, flavor text,
  pas rerollables, pas d'effet légendaire procédural)
- **9 sets** thématiques avec bonus 2/3/4 pièces + effet 4 pièces unique

| Set         | Pièces                                  | Effet 4-pièces                                    |
|-------------|-----------------------------------------|---------------------------------------------------|
| Dragon      | helm + plate + sword + tower            | 15% dégâts ×2 (feu)                               |
| Ombre       | robe + dagger + band + pendant          | Après esquive, prochaine attaque = crit garanti   |
| Titan       | helm + plate + tower + signet           | 15% esquive totale                                |
| Phénix      | crown + robe + wand + pendant           | Une fois par combat, revis à 30% PV               |
| Givre       | helm + bow + band + talisman            | 20%/hit : gèle le monstre (saute son tour)        |
| Liche       | crown + robe + wand + signet            | 10% des dégâts infligés te soignent               |
| Druide      | crown + robe + wand + pendant           | Soin 20% PV tous les 4 tours                      |
| Démoniaque  | helm + plate + sword + signet           | Le 1er coup d'un combat inflige ×3 dégâts         |
| Voyageur    | robe + tower + band + talisman          | 25% esquive permanente                            |

#### Préfixes / Suffixes
Chaque affixe est **Préfixe (P)** ou **Suffixe (S)**. Limites par rareté :
- Magique : 1+1 (max 2)
- Rare / Épique : 2+2 (max 4)
- Légendaire / Ancestral : 3+3 (max 6)

#### Power Score
Chaque item affiche son **score de puissance** calculé à partir de la
contribution réelle de ses stats à votre build.

#### 🔒 Verrouillage & 🤖 Auto-actions
- `Alt+clic` (desktop) ou bouton 🔒 du sheet (mobile) verrouille un item —
  exclu de toutes les ventes/recyclages en masse.
- Auto-sell / Auto-salvage par rareté : action automatique après ouverture
  de coffre (sell, salvage, ou off).

### ⚒ Forge (style Path of Exile, 10 actions)
- 🟢 **Transmutation** : commun → magique
- 🔵 **Augmentation** : +1 affixe sur magique
- 🟣 **Altération** : reroll complet d'un magique
- 🟡 **Régal** : magique → rare
- 🟠 **Chaos** : reroll complet d'un rare+
- ⚪ **Divin** : reroll uniquement les valeurs
- 🔴 **Exil** : +1 affixe sur un rare+
- 🪨 **Pierre de Forge** : +1 tier d'objet (max T5)
- 🟪 **Maître Forgeron** : ajoute un affixe au CHOIX (drop très rare)
- 💎 **Reroll+** : reroll avec hauts rolls garantis (coûte 3 cristaux
  de la rareté de l'objet)

### 💎 Cristaux & Recyclage
Recycler un item (Ctrl+clic ou sheet sur mobile) donne des **cristaux**
de sa rareté. Utilisés pour le Reroll+ — choix stratégique : 💰 or
immédiat vs 💎 cristaux pour des items parfaits plus tard.

### 📜 Compétences (12 passives)
S'activent automatiquement en combat selon stats/talents :

| # | Compétence       | Effet                                          |
|---|------------------|------------------------------------------------|
| 1 | Sang-Froid       | -15% dégâts reçus des boss                     |
| 2 | Précision        | +15% précision                                  |
| 3 | Endurance        | +20% HP                                         |
| 4 | Esquive          | 10% d'esquive                                   |
| 5 | Coup Critique    | 20% crit, ×2 dégâts                             |
| 6 | Pilleur          | +25% or                                         |
| 7 | Chanceux         | +15% item drop                                  |
| 8 | Exécution        | +50% dégâts sous 30% PV ennemi                  |
| 9 | Tempête          | 15% de frapper ×2                               |
| 10| Vampirisme       | Régénère 5% PV à chaque attaque                 |
| 11| Adrénaline       | Tous les 3 tours : +75% dégâts                  |
| 12| Ultime Résistance| 60% esquive sous 25% PV                         |

Les compétences sont **automatiques** (débloquées par seuils de stats). Les
**capacités**, elles, se **choisissent**.

### ✦ Capacités actives (loadout de 3)
Contrairement aux compétences passives, les capacités sont **équipées par le
joueur** (3 slots) — c'est une **décision de build** : tu en débloques 8 au fil
de la progression mais n'en emportes que 3. Elles se déclenchent en combat via
le même moteur de hooks que les compétences.

| Capacité          | Effet                                   | Déblocage        |
|-------------------|-----------------------------------------|------------------|
| 🗡 Frappe Puissante | Tous les 3 tours : ×2.5 dégâts        | dès le départ    |
| ⚡ Frénésie        | Tous les 3 tours : crit garanti         | dès le départ    |
| 💚 Second Souffle  | 1×/combat sous 40% PV : soigne 45%      | dès le départ    |
| 💢 Cri de Guerre   | +10% dégâts/tour (max +50%)             | 100 monstres tués|
| 🌀 Hâte            | Tous les 4 tours : +100% dégâts         | étage 15         |
| ☠ Exécution        | Sous 35% PV ennemi : +150% dégâts       | étage 25         |
| 🛡 Garde           | Bloque une attaque tous les 4 tours     | 75 coffres       |
| 🌵 Riposte         | Renvoie 50% des dégâts subis            | 200 monstres tués|

### 🌳 Talents (8 améliorations passives, 3 catégories)
Points gagnés aux paliers d'étage (25/50/75…) et à chaque ascension (+2).

- ⚔️ **Combat** : forgeKnight, sharpBlade, ironWill, pityMaster
- 💰 **Richesse** : greedyHands, scrapper, crestBonus, goldFinder

**Bonus de Maîtrise** : ≥5 points dans une catégorie = +10% d'effet à
tous les talents de cette catégorie.

### 🌟 Ascension / Prestige
- Débloqué à **T5 coffre + étage 50**.
- Reset complet du jeu, mais conserve talents + codex.
- Gagne +1 niveau de prestige : **+25% drops rares et or** par niveau,
  cumulatif et permanent.
- Chaque ascension débloque un tier de coffre supérieur (T6 Stellaire →
  T10 Divin) et octroie +2 points de talent.

#### 🏺 Reliques d'Ascension
À chaque ascension, choisis **1 relique parmi 3** (tirage aléatoire). Les
reliques sont **permanentes, cumulables** (un même effet pris plusieurs
fois s'additionne) et **survivent au reset** : c'est le levier de build
long terme qui rend chaque lignée de prestige différente.

| Relique               | Effet                                  |
|-----------------------|----------------------------------------|
| ⚔️ Pacte du Berserker | +40 % dégâts · −15 % PV max            |
| 💥 Canon de Verre     | +80 % dégâts · +40 % dégâts subis      |
| 🎯 Œil de Lynx        | +12 % chance de critique               |
| ✨ Élémentaliste      | +30 % dégâts élémentaires              |
| 🛡 Rempart            | +25 % PV max · +20 armure              |
| 🩸 Soif de Sang       | Vol de vie 5 % des dégâts              |
| 💰 Main de Midas      | +50 % or                               |
| 🍀 Fortune            | +30 % drops rares                      |

Les reliques offensives/défensives/économiques s'excluent par le coût
d'opportunité du choix — empiler 🛡 Rempart donne un tank, enchaîner
💥 Canon de Verre un glass-cannon, etc.

### 📋 Contrats
3 contrats actifs en permanence (tuer X monstres, looter Y légendaires,
atteindre l'étage Z…). Progression auto en jouant, récompenses en or /
orbes / points de talent. Reroll payant (5 000 💰).

### 📖 Codex
- **Uniques** lootés (20 au total)
- **Sets** découverts (pièces vues sur les 9 sets)
- **Boss** tués (par biome)
- 3 succès "100% complet" associés.

### 🏆 Achievements
40+ succès avec récompenses, toast à l'unlock.

### 📊 Stats Breakdown
Bouton ⚡ du HUD : modal détaillant la contribution de chaque source
(base, équipement par slot, sets actifs, talents, compétences).

### ⚙️ Paramètres
| Option                       | Effet                                          |
|------------------------------|------------------------------------------------|
| Combat Rapide                | Skip animations de combat                      |
| Particules réduites          | Moins d'effets visuels                         |
| Confirmer Ascension          | Dialog avant prestige                          |
| Confirmer Vente Destructive  | Confirm avant "tout vendre" épique+            |
| Mode Cauchemar               | Monstres ×1.5 HP/dmg, drops ×1.5               |

### 💾 Sauvegarde
- Sauvegarde **automatique** dans `localStorage` après chaque action.
- Export/Import JSON pour backup.
- **Migrations versionnées** : v1 → v2 → v3 sans perte de données.

---

## Raccourcis Clavier (desktop)

| Touche             | Action                                         |
|--------------------|------------------------------------------------|
| `Espace`           | Ouvre le coffre / lance le combat              |
| `Échap`            | Ferme popup / modal                            |
| `1` / `2`          | Onglet Coffre / Donjon                         |
| `S`                | Détail des stats                                |
| `T` / `A`          | Talents / Succès                                |
| `B` / `C` / `K`    | Contrats / Codex / Compétences                  |
| `I`                | Forge                                           |
| `Clic` (inventaire)| Équiper                                         |
| `Shift+Clic`       | Vendre                                          |
| `Ctrl+Clic`        | Recycler (💎)                                   |
| `Alt+Clic`         | Verrouiller / déverrouiller 🔒                  |
| `Clic` (slot)      | Déséquiper                                      |

Sur **mobile / tactile**, un simple tap sur un item ouvre la feuille
d'action avec tous les boutons.

---

## Structure technique

```
index.html        layout + modals + welcome + action sheet
style.css         design pixel + responsive + animations
js/
  data.js         constantes : raretés, affixes, currencies, biomes,
                  sets, uniques, talents
  state.js        état global + pub/sub + flag onboarding (v3)
  save.js         localStorage + export/import + migrations v1→v2→v3
  glossary.js     38 termes de jeu + aliases (matériaux, éléments,
                  factions, effets légendaires, jargon RPG…)
  loot.js         génération d'items (rollRarity, buildItem,
                  buildSetPiece, buildUniqueLegendary, rescaleItemToTier,
                  rerollAffixesOnly, rerollPartValuesOnly,
                  rerollPartsAndVisuals)
  chest.js        openChest (gate clés), rollOrbDrops, canUpgrade
  character.js    computeStats, computeStatsBreakdown,
                  activeSetEffects, itemPowerContribution
  inventory.js    sellItem, salvageItem, toggleLockItem,
                  autoActionFor, setAutoMode
  combat.js       resolveFight (skills/sets/boss mechanics/elite +
                  6 effets légendaires + 5 dégâts élémentaires),
                  generateMonster, key drops
  achievements.js checkAchievements, onAchievementUnlocked
  forge.js        10 actions (Pierre préserve identité visuelle
                  via rescaleItemToTier)
  prestige.js     canAscend, ascend (reset + keys = 10 + choix relique)
  relics.js       reliques d'ascension : relicTotals + multiplicateurs
                  (dégâts/PV/or/drop/crit/élément/vol de vie), choix 1/3
  skills.js       12 compétences passives + merge des capacités slottées
  abilities.js    8 capacités actives (loadout de 3, déblocages par
                  progression) partageant les hooks de combat
  dive.js         Plongée des Profondeurs : run à attrition (report de
                  PV, boons aux points de contrôle, butin sécurisé/en jeu)
  talents.js      multiplicateurs + categoryPoints + categoryMastery
  bounties.js     generateBounty, trackProgress, rerollBounty
  builder.js      primitives pixel partagées (makeCanvas, rect,
                  ellipse, line, outline, canvasToLayout…)
  sprites.js      perso 64×64, coffres 64×64 ×10 tiers décorés,
                  5 boss 48×48, composition perso+équipement,
                  scale2x, dispatch HD/legacy
  partsHD.js      HD_WEAPON_PARTS — 17 types composés en 64×64
                  procédural (armes + armures + boucliers + accessoires)
                  + overlays élémentaires HD par famille d'arme
  parts.js        WEAPON_PARTS legacy 16×16 (fallback saves pré-HD).
                  getCompositionLayers(type, parts, mat, elem, {hd})
                  dispatch vers partsHD selon item.hdParts.
                  Helpers rollPart/rollWeaponParts/recomputePartStats
                  exposent quality (d20) + statSources.
  materials.js    10 matériaux (Fer → Os de Dragon) avec stats,
                  icônes, tintColor, tags pour biais faction.
  elements.js     5 éléments (Feu, Givre, Poison, Foudre, Néant)
                  + Aucun. Mécaniques de dégâts élémentaires.
  factions.js     6 factions (Royal, Infernal, Sylvain, Spectral,
                  Bestial, Aucune). Biaisent material/element via tags.
  legendaryEffects.js  6 effets de combat sur légendaires/ancestraux
                  (Pacte de Sang, Marque du Vampire, Toucher Brûlant,
                  Foudre en Chaîne, Toucher d'Or, Écho du Néant) avec
                  tag-gating par élément ou matériau.
  sound.js        SFX synthétisés Web Audio (toggle mute)
  fx.js           particules, floating damage, screen shake
  ui.js           renderAll + tous les renders modaux + stats
                  breakdown + welcome + action sheet
  main.js         bootstrap + wiring événements + boucle + raccourcis
                  + dropdown HUD + onboarding + glossaire
```

---

## Lancer le jeu

```bash
# Option 1 — Serveur local (recommandé pour les ES modules)
python3 -m http.server 8080
# puis ouvrir http://localhost:8080

# Option 2 — Directement
open index.html
```

Compatible Chrome, Firefox, Edge, Safari (desktop + mobile) — ES modules
natifs requis.
