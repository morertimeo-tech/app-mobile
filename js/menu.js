// Écran du sac : statistiques, objets, armes.
import { state, xpNeed, weaponAtk } from './state.js';
import { ITEMS, WEAPONS, BOSSES } from './data.js';
import { clear, label, button } from './ui.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }
  init(data) { this.gs = data.gs; }

  create() {
    this.items = [];
    this.bg = this.add.rectangle(0, 0, 10, 10, 0x14110f, 0.94).setOrigin(0).setInteractive();
    this.scale.on('resize', this.render, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.render, this));
    this.render();
  }

  use(key) {
    state.items[key]--;
    if (key === 'bandage') state.hp = Math.min(state.maxHp, state.hp + 15);
    if (key === 'food') { state.hp = Math.min(state.maxHp, state.hp + 8); state.en = Math.min(state.maxEn, state.en + 5); }
    this.render();
  }

  render() {
    clear(this);
    const { width: w, height: h } = this.scale;
    const u = Math.min(w, h), pad = u * 0.03, land = w > h, fs = u * 0.04;
    this.bg.setSize(w, h);
    this.bg.input.hitArea.setSize(w, h);

    const bosses = BOSSES.filter((b) => state.bosses[b]).length;
    const stats = [
      'SAC',
      '',
      `Niveau ${state.lvl}   XP ${state.xp}/${xpNeed(state.lvl)}`,
      `PV ${state.hp}/${state.maxHp}   Énergie ${state.en}/${state.maxEn}`,
      `Attaque ${state.atk} (+${weaponAtk()})   Défense ${state.def}`,
      `Ferraille ${state.scrap}   Munitions ${state.ammo}`,
      `Boss vaincus ${bosses}/${BOSSES.length}`,
    ].join('\n');
    const S = land ? { x: pad, y: pad, w: w * 0.45 } : { x: pad, y: pad, w: w - pad * 2 };
    const statText = label(this, S.x, S.y, stats, fs, '#e8dfc8', { wordWrap: { width: S.w }, lineSpacing: fs * 0.3 });

    const full = state.hp >= state.maxHp;
    const btns = [];
    for (const k of ['bandage', 'food']) {
      const usable = state.items[k] > 0 && !(k === 'bandage' && full) && !(k === 'food' && full && state.en >= state.maxEn);
      btns.push([`${ITEMS[k].name} x${state.items[k]} : utiliser`, () => this.use(k), !usable]);
    }
    btns.push([`Antidote x${state.items.antidote} (en combat)`, () => {}, true]);
    for (const k of state.weapons) {
      const on = state.weapon === k;
      btns.push([`${WEAPONS[k].name} +${WEAPONS[k].atk}${on ? ' [équipée]' : ''}`, () => { state.weapon = k; this.render(); }, on]);
    }
    btns.push(['Fermer', () => this.gs.closeMenu()]);

    const B = land
      ? { x: w * 0.5, y: pad, w: w * 0.5 - pad, h: h - pad * 2 }
      : { x: pad, y: statText.y + statText.height + pad * 2, w: w - pad * 2, h: h - (statText.y + statText.height + pad * 3) };
    const n = btns.length, gap = pad * 0.7;
    const hgt = Math.min((B.h - gap * (n - 1)) / n, u * 0.12);
    btns.forEach(([text, fn, off], i) => button(this, B.x, B.y + i * (hgt + gap), B.w, hgt, text, fn, !!off));
  }
}
