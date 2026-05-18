# Lootchest ⚔️

Un RPG idle de loot en vanilla JS — ouvrez des coffres, équipez votre héros, plongez dans le donjon.

**Aucun build requis.** Ouvrez `index.html` dans un navigateur moderne.

---

## Boucle de jeu principale

```
Donjon → Clés + Or → Coffres → Équipement → Donjon plus profond
```

1. **Combattez** dans le donjon pour gagner des clés et de l'or.
2. **Ouvrez des coffres** (1 clé par coffre) pour obtenir de l'équipement.
3. **Équipez** les meilleurs items pour renforcer votre héros.
4. **Montez** dans le donjon pour débloquer de nouveaux étages.
5. **Ascendez** (prestige) pour repartir plus puissant.

---

## Systèmes

### 🗝 Clés & Coffres
- Les coffres sont verrouillés — il faut des **clés** pour les ouvrir.
- Les clés se farment dans le donjon :
  - Monstre normal : ~30% de chance de lâcher 1 clé
  - Elite : 1 clé garantie
  - Boss : 3 clés garanties
- Le compteur de clés est visible dans le HUD en haut.
- Sans clé, le bouton d'ouverture est grisé avec un message d'indication.

### ⚔️ Donjon & Combat
- **10 étages** par biome (Forêt → Désert → Toundra → Volcan → Abysses).
- Navigation libre : revenez à n'importe quel étage déjà débloqué.
- Chaque victoire déverrouille l'étage suivant.

#### 🔁 Mode Boucle
- Disponible une fois un étage passé une première fois.
- Le bouton **Boucle** relance automatiquement le même combat après chaque victoire.
- La boucle s'arrête sur défaite (enjeux réels) ou si vous changez d'étage.
- Idéal pour farmer des clés et de l'or sans micro-gestion.

#### ⭐ Monstres Élites
- 8% de chance d'apparaître sur les étages non-boss (étage ≥ 3).
- 4 variants : **Sauvage** (+30% ATK), **Blindé** (+50% DEF), **Frénétique** (+25% ATK/vitesse), **Colossal** (+80% HP/DEF).
- Loot garanti de rareté **Rare+**, 1 clé assurée.
- Visuellement distincts dans la carte de combat (badge ⭐ Elite).

#### 💀 Boss avec Mécaniques Uniques
Chaque boss de biome a une mécanique propre visible pendant le combat :

| Biome | Boss | Mécanique |
|-------|------|-----------|
| Forêt | Dragon Vert | **Régénération** — récupère 8% HP/tour |
| Désert | Scorpion Géant | **Enragé** — double dégâts sous 30% HP |
| Toundra | Golem de Glace | **Bouclier** — immunité 1 tour sur 3 |
| Volcan | Seigneur du Feu | **Brûlure** — 15% HP en dégâts bonus/tour |
| Abysses | Lich Ancienne | **Phase Shift** — 50% de rater l'attaque du joueur |

### 🎒 Inventaire & Items

#### Raretés
`Commun → Magique → Rare → Épique → Légendaire → Ancestral`

- **Uniques Légendaires** (16) : items nommés avec effets spéciaux.
- **Pièces de Set** : 6 sets complets à collecter.

#### ⚡ Power Score
Chaque item affiche son **score de puissance** dans le tooltip, calculé à partir de la contribution réelle de ses stats à votre build.

#### 🔒 Verrouillage d'item
- `Alt+clic` sur un item pour le **verrouiller** (icône cadenas 🔒).
- Un item verrouillé est **exclu** de toutes les ventes et recyclages en masse.
- Protection contre la vente accidentelle d'items précieux.

#### 🤖 Actions Automatiques (Auto-Sell / Auto-Salvage)
Par rareté (Commun → Ancestral), choisissez l'action après ouverture d'un coffre :
- **OFF** : rien (comportement normal)
- **💰 Vendre** : vente automatique au prix d'achat
- **💎 Recycler** : recyclage en éclats automatique

Chaque rareté se débloque contre de l'or dans le panneau Auto.

### 🧪 Forge (Style Path of Exile)
9 currencies avec des effets distincts, regroupées par catégorie :

**Rareté**
- Orbe de Transmutation → Commun à Magique
- Orbe d'Altération → reroll affixes Magique
- Orbe Regal → Magique à Rare (+1 affix)
- Orbe du Chaos → reroll tous les affixes Rare
- Orbe Divin → reroll valeurs d'affixes existants

**Tiers & Puissance**
- Pierre de Forge → +1 Tier (cap dynamique selon niveau de prestige)
- Orbe d'Augmentation → +1 affix (si slot libre)

**Spécial**
- Orbe d'Exil → reset à Commun (puis reroll rareté)
- Orbe de Maîtrise → maîtrise craft (choisir un affix spécifique)

### 🧙 Compétences (12 passifs)
Débloquées aux jalons de kills (floor 5, 10, etc.) :

| Compétence | Effet |
|-----------|-------|
| Sang-Froid | -15% dégâts reçus des boss |
| Précision | +15% précision |
| Endurance | +20% HP |
| Esquive | 10% d'esquive |
| Coup Critique | 20% crit, ×2 dégâts |
| Pilleur | +25% or |
| Chanceux | +15% item drop |
| Exécution | +50% dégâts sous 30% HP ennemi |
| **Tempête** | 15% de frapper ×2 |
| **Vampirisme** | Régénère 5% HP à chaque attaque |
| **Adrénaline** | Tous les 3 tours : +75% dégâts |
| **Ultime Résistance** | 60% esquive sous 25% HP |

### 🌟 Talents (8 améliorations passives)
Gagnez des **points de talent** aux jalons de combat. 3 catégories :

- ⚔️ **Combat** : forgeKnight, sharpBlade, ironWill, pityMaster
- 💰 **Richesse** : greedyHands, scrapper, crestBonus, goldFinder

**Bonus de Maîtrise** : investir ≥5 points dans une catégorie octroie +10% d'effet à tous les talents de cette catégorie.

### 🏆 Sets v2 — Effets 4 Pièces
Équiper les 4 pièces d'un set déclenche un effet unique en combat :

| Set | Effet 4 Pièces |
|-----|---------------|
| Dragon | Souffle de feu — 30% de brûler le monstre (+40% dégâts tour suivant) |
| Ombre | Frappe dans l'ombre — 25% de frapper ×3 |
| Titan | Mur de Titane — -50% dégâts reçus 1 tour sur 4 |
| Phénix | Résurrection — se relève 1× par combat à 1 HP |
| Givre | Gel — 20% de geler le monstre (perd son attaque) |
| Liche | Drain vital — vole 15% HP à chaque attaque |

### 🔮 Prestige (Ascension)
- Nécessite Tier de coffre 10 + Or requis (croissant).
- Réinitialise le progrès mais conserve les **talents** et le **codex**.
- Bonus **linéaire** : `+15% or et drop par niveau` (vs l'ancien exponentiel qui trivialise trop tôt).
- Débloque les tiers de coffres supérieurs (jusqu'à T10).

### 📊 Stats Breakdown
Bouton **📊** dans le panneau personnage — modal détaillant la contribution de chaque source :
- Stats de base
- Chaque équipement slot par slot
- Bonus de sets actifs
- Effets de talents
- Compétences passives actives

### 🏅 Achievements & Codex
- **40+ achievements** déclenchent un toast visuel à l'unlock.
- **Codex Uniques** : liste tous les legendaries découverts.
- **Codex Sets** : progression par set (pièces vues).
- **Codex Boss** : kill count par boss de biome.

### 📋 Bounties (Contrats)
- 3 contrats actifs avec objectifs variés (kills, or, items ouverts, etc.).
- Récompenses en or ou éclats à la complétion.
- Reroll payant si le contrat ne convient pas.

### ⚙️ Paramètres
| Option | Effet |
|--------|-------|
| Combat Rapide | Skip animations de combat |
| Particules réduites | Moins d'effets visuels |
| Confirmer Ascension | Dialog avant prestige |
| Confirmer Vente Destructive | Confirm avant "tout vendre" épique+ |
| Mode Difficile | Monstres ×1.5 HP/dégâts, drops ×1.5 |

### 💾 Sauvegarde
- Sauvegarde **automatique** dans `localStorage` après chaque action.
- Export/Import JSON pour backup manuel.
- **Système de migration** : les anciennes sauvegardes (v1, v2) migrent automatiquement vers v3 sans perte de données.

---

## Raccourcis Clavier
| Touche | Action |
|--------|--------|
| `1` / `2` | Onglet Coffre / Donjon |
| `Alt+clic` | Verrouiller/déverrouiller un item |
| `Échap` | Fermer la modal active |

---

## Structure Technique

```
js/
  data.js         Constantes : raretés, affixes, currencies, biomes, sets, uniques, talents
  state.js        État global + pub/sub pour les re-renders (version 3)
  save.js         localStorage + export/import + migrations v1→v2→v3
  loot.js         Génération d'items (rollRarity, buildItem, buildSetPiece, buildUniqueLegendary)
  chest.js        openChest (gate clés), rollOrbDrops, canUpgrade
  character.js    computeStats, computeStatsBreakdown, activeSetEffects, itemPowerContribution
  inventory.js    sellItem, salvageItem, toggleLockItem, autoActionFor, setAutoMode
  combat.js       resolveFight (skills/sets/boss mechanics/elite), generateMonster, key drops
  achievements.js checkAchievements, onAchievementUnlocked
  forge.js        9 FORGE_ACTIONS (Pierre cap dynamique selon prestige)
  prestige.js     canAscend, ascend (reset + keys = 10)
  skills.js       12 compétences passives avec hooks onTurnStart/onPlayerAttack/onDamageCalc/onTakeDamage
  talents.js      Multiplicateurs + categoryPoints + categoryMastery
  bounties.js     generateBounty, trackProgress, rerollBounty
  sprites.js      Composition SVG personnage + équipement
  parts.js        Composition visuelle armes (WEAPON_PARTS)
  sound.js        SFX synthétisés Web Audio (toggle mute)
  fx.js           Particules, floating damage, screen shake
  ui.js           renderAll + tous les renders modaux, stats breakdown, settings
  main.js         Bootstrap + wiring événements + loop mode + raccourcis
```

---

## Lancer le jeu

```bash
# Option 1 — Directement (Chrome/Edge uniquement en local)
open index.html

# Option 2 — Serveur local (recommandé, évite les restrictions CORS modules ES)
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

Compatible Chrome, Firefox, Edge — ES modules natifs requis.
