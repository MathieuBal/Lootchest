// Legendary effects — special behaviors on non-unique legendary+ items.
// Unlike affixes (which add stats), these mutate combat behavior :
// first-hit triple, lifesteal, burn, crit double-strike, etc.
//
// Each item has at most one effect. Roll probability scales with rarity
// (30 % on legendary, 80 % on ancestral). Some effects require a matching
// element/material tag for thematic coherence ("Foudre en Chaîne" only
// rolls on lightning items).

import { state } from './state.js';

export const LEGENDARY_EFFECTS = {
  bloodPact: {
    id: 'bloodPact', name: 'Pacte de Sang',
    desc: 'Le premier coup d\'un combat inflige le triple des dégâts.',
    tagRequired: null,
  },
  vampireMark: {
    id: 'vampireMark', name: 'Marque du Vampire',
    desc: 'Vol de vie 8 % sur chaque coup infligé.',
    tagRequired: null,
  },
  searingTouch: {
    id: 'searingTouch', name: 'Toucher Brûlant',
    desc: 'Inflige 3 % des PV max ennemis en feu chaque tour.',
    elementRequired: 'fire',
  },
  chainLightning: {
    id: 'chainLightning', name: 'Foudre en Chaîne',
    desc: 'Chaque crit déclenche une seconde attaque (50 % dégâts).',
    elementRequired: 'lightning',
  },
  goldenTouch: {
    id: 'goldenTouch', name: 'Toucher d\'Or',
    desc: '+30 % d\'or par monstre tué.',
    materialRequired: 'gold',
  },
  voidEcho: {
    id: 'voidEcho', name: 'Écho du Néant',
    desc: '12 % de chance que ton attaque se répète.',
    elementRequired: 'void',
  },
};

const EFFECT_LIST = Object.values(LEGENDARY_EFFECTS);

// Pick a random eligible effect for an item. Returns null if no effect applies
// or if the rarity-based gate fails.
export function rollLegendaryEffect(item) {
  if (item.uniqueId || item.setId) return null;       // uniques/sets have their own
  const rarity = item.rarity;
  if (rarity !== 'legendary' && rarity !== 'ancestral') return null;
  const chance = rarity === 'ancestral' ? 0.80 : 0.30;
  if (Math.random() > chance) return null;

  const itemElementId  = item.element?.id;
  const itemMaterialId = item.material?.id;
  const eligible = EFFECT_LIST.filter(e =>
    (!e.elementRequired  || e.elementRequired  === itemElementId) &&
    (!e.materialRequired || e.materialRequired === itemMaterialId)
  );
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

// === Combat-side helpers ===
// Return the set of legendary effect IDs the player currently has equipped.
export function activeLegendaryEffectIds() {
  const ids = new Set();
  for (const slot of Object.keys(state.equipment || {})) {
    const it = state.equipment[slot];
    if (it && it.legendaryEffect && it.legendaryEffect.id) ids.add(it.legendaryEffect.id);
  }
  return ids;
}
