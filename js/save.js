// Persistence: localStorage auto-save (debounced) + export/import JSON.
import { state, replaceState, subscribe } from './state.js';
import { regenerateItemName } from './loot.js';

const KEY = 'lootchest.save.v1';
export const CURRENT_SAVE_VERSION = 5;

// Migrations are run sequentially: from version N → N+1.
// Each function receives `data` and mutates it in place (or returns a new object).
const MIGRATIONS = {
  // 1 → 2 : add `mode` field to autoSell slots, default 'sell'.
  //         Add `settings` block. Add `locked` flag on items (false default — handled lazily).
  1: (data) => {
    if (data.autoSell) {
      for (const r of Object.keys(data.autoSell)) {
        if (!data.autoSell[r].mode) data.autoSell[r].mode = 'sell';
      }
    }
    if (!data.settings) {
      data.settings = {
        fastCombat: false, reducedParticles: false,
        confirmAscend: true, confirmDestructiveSell: true, hardMode: false,
      };
    }
    data.version = 2;
    return data;
  },
  // 2 → 3 : keys system. Existing saves get a generous starting stash so the
  //         change isn't punitive : 1 key per chest opened so far, capped at 50.
  2: (data) => {
    if (data.keys === undefined) {
      data.keys = Math.min(50, Math.max(10, data.opened || 10));
    }
    data.version = 3;
    return data;
  },
  // 3 → 4 : extended pity (ancestral + unique counters), focus orb + focusSlot.
  3: (data) => {
    if (!data.pity) data.pity = { sinceLegendary: 0 };
    if (data.pity.sinceAncestral === undefined) data.pity.sinceAncestral = 0;
    if (data.pity.sinceUnique === undefined) data.pity.sinceUnique = 0;
    if (!data.orbs) data.orbs = {};
    if (data.orbs.focus === undefined) data.orbs.focus = 0;
    if (data.focusSlot === undefined) data.focusSlot = null;
    data.version = 4;
    return data;
  },
  // 4 → 5 : corrige les accords masculin/féminin des noms générés (BUG-009).
  //         Régénère le nom des objets ordinaires depuis leurs composants ;
  //         sets/uniques gardent leur nom canonique. Stats, raretés, affixes,
  //         matériau/élément/faction sont préservés (le nom est cosmétique).
  4: (data) => {
    if (Array.isArray(data.inventory)) data.inventory.forEach(regenerateItemName);
    if (data.equipment) for (const slot of Object.keys(data.equipment)) regenerateItemName(data.equipment[slot]);
    data.version = 5;
    return data;
  },
};

function migrateSave(data) {
  if (!data || typeof data !== 'object') return data;
  let version = data.version || 1;
  while (version < CURRENT_SAVE_VERSION) {
    const fn = MIGRATIONS[version];
    if (!fn) {
      data.version = CURRENT_SAVE_VERSION;
      break;
    }
    const next = fn(data);
    if (next && typeof next === 'object') data = next;
    version = data.version || version + 1;
  }
  data.version = CURRENT_SAVE_VERSION;
  return data;
}
let timer = null;

export function startAutosave() {
  subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Save failed', e);
      }
    }, 400);
  });
}

export function loadFromLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const data = migrateSave(JSON.parse(raw));
    replaceState(data);
    return true;
  } catch (e) {
    console.warn('Load failed', e);
    return false;
  }
}

export function clearLocal() {
  localStorage.removeItem(KEY);
}

export function exportSave() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `lootchest-save-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importSave(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = migrateSave(JSON.parse(e.target.result));
        replaceState(data);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
