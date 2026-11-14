// État du joueur et sauvegarde sur le téléphone.
import { WEAPONS } from './data.js';

const SAVE_KEY = 'cendres-save-v1';

export const joy = { x: 0, y: 0 };
export const state = {};

const defaults = () => ({
  lvl: 1, xp: 0, hp: 30, maxHp: 30, en: 10, maxEn: 10, atk: 5, def: 2, spd: 5,
  scrap: 0, ammo: 6, weapon: 'pipe', weapons: ['pipe'],
  items: { bandage: 2, food: 1, antidote: 0 },
  looted: {}, bosses: {},
});

export function loadSave() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { raw = null; }
  const d = defaults();
  Object.assign(state, d, (raw && raw.player) || {});
  state.items = { ...d.items, ...state.items };
  if (!WEAPONS[state.weapon]) state.weapon = 'pipe';
  return raw;
}

export function writeSave(extra) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...extra, player: state })); } catch (e) { /* stockage indisponible */ }
}

export const weaponAtk = () => WEAPONS[state.weapon].atk;
export const xpNeed = (lvl) => 12 + lvl * 10;

// Ajoute de l'expérience. Renvoie la liste des niveaux gagnés.
export function gainXp(n) {
  const ups = [];
  state.xp += n;
  while (state.xp >= xpNeed(state.lvl)) {
    state.xp -= xpNeed(state.lvl);
    state.lvl++;
    state.maxHp += 6;
    state.maxEn += 2;
    state.atk += 1;
    if (state.lvl % 2 === 0) state.def += 1;
    state.hp = state.maxHp;
    state.en = state.maxEn;
    ups.push(state.lvl);
  }
  return ups;
}
