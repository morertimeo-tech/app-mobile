// Combat au tour par tour. L'ennemi annonce toujours son prochain coup :
// le joueur décide en connaissance de cause (frapper, se défendre, se soigner).
import { state, gainXp, weaponAtk } from './state.js';
import { ENEMIES, SKILLS, ITEMS, STATUS, WEAPONS } from './data.js';
import { clear, label, button, bar } from './ui.js';

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export class CombatScene extends Phaser.Scene {
  constructor() { super('combat'); }

  init(data) {
    this.gs = data.gs;
    this.mob = data.mob;
    this.def = ENEMIES[data.mob.kind];
  }

  create() {
    const d = this.def;
    this.e = { hp: d.hp, maxHp: d.hp, atk: d.atk, def: d.def, st: {}, guard: false, phase: 0 };
    this.pst = {};          // états subis par le joueur
    this.guard = false;
    this.menu = 'main';
    this.busy = false;
    this.over = null;
    this.result = [];
    this.log = [];
    this.items = [];

    this.bg = this.add.rectangle(0, 0, 10, 10, 0x14110f).setOrigin(0).setInteractive();
    this.floor = this.add.ellipse(0, 0, 10, 10, 0x000000, 0.35);
    this.eSprite = this.add.image(0, 0, 'mobs', d.sprite);
    if (d.tint) this.eSprite.setTint(d.tint);

    this.say(`${d.name} attaque !`);
    this.pickIntent();
    if (d.spd > state.spd) {
      this.say(`${d.name} est plus rapide : il frappe en premier.`);
      this.busy = true;
      this.time.delayedCall(1100, () => this.enemyTurn());
    }

    this.scale.on('resize', this.render, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.render, this));
    this.render();
  }

  say(text) {
    this.log.push(text);
    if (this.log.length > 3) this.log.shift();
  }

  moves() {
    return this.def.phases ? this.def.phases[this.e.phase].moves : this.def.moves;
  }

  pickIntent() {
    const list = this.moves();
    let roll = Math.random() * list.reduce((s, m) => s + m.w, 0);
    this.intent = list[list.length - 1];
    for (const m of list) { roll -= m.w; if (roll < 0) { this.intent = m; break; } }
  }

  checkPhase() {
    const ph = this.def.phases;
    if (!ph) return;
    let changed = false;
    while (this.e.phase + 1 < ph.length && this.e.hp > 0 && this.e.hp / this.e.maxHp <= ph[this.e.phase + 1].below) {
      this.e.phase++;
      const p = ph[this.e.phase];
      this.e.atk = this.def.atk * (p.atk || 1);
      this.say(p.msg);
      changed = true;
    }
    if (changed) {
      this.pickIntent();
      this.cameras.main.flash(250, 160, 40, 30);
    }
  }

  dmg(atk, mult, def) {
    return Math.max(1, Math.round(atk * mult * (0.85 + Math.random() * 0.3)) - def);
  }
  pAtk() { return (state.atk + weaponAtk()) * (this.pst.rad ? 0.75 : 1); }
  eDef() { return this.e.guard ? this.e.def * 2 + 2 : this.e.def; }

  floatText(text, color) {
    const s = this.eSprite;
    const t = this.add.text(s.x, s.y - s.displayHeight * 0.5, text, {
      fontFamily: 'monospace', fontSize: Math.round(Math.min(this.scale.width, this.scale.height) * 0.07) + 'px',
      color, stroke: '#14110f', strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - s.displayHeight * 0.4, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  hitEnemy(n, msg) {
    this.e.hp = Math.max(0, this.e.hp - n);
    this.say(msg);
    this.floatText('-' + n, '#ffd040');
    this.tweens.add({ targets: this.eSprite, x: this.eSprite.x + 14, duration: 45, yoyo: true, repeat: 3 });
    this.checkPhase();
  }

  // ---------- Tour du joueur ----------
  act(kind, arg) {
    if (this.busy || this.over) return;
    const e = this.e, d = this.def;
    this.menu = 'main';

    if (kind === 'flee') {
      if (d.boss) { this.say('Impossible de fuir ce combat.'); this.render(); return; }
      const chance = Math.min(0.9, Math.max(0.2, 0.5 + (state.spd - d.spd) * 0.06));
      if (Math.random() < chance) { this.finish('flee'); return; }
      this.say('Fuite ratée !');
    }

    this.busy = true;
    this.guard = false;
    if (kind === 'attack') {
      const n = this.dmg(this.pAtk(), 1, this.eDef());
      this.hitEnemy(n, `Tu frappes : ${n} dégâts.`);
    } else if (kind === 'defend') {
      this.guard = true;
      state.en = Math.min(state.maxEn, state.en + 2);
      this.say('Tu te mets en garde (+2 énergie).');
    } else if (kind === 'skill') {
      state.ammo -= arg.ammo;
      state.en -= arg.en;
      if (arg.id === 'shot') {
        const n = this.dmg(this.pAtk(), 2.2, Math.floor(this.eDef() / 2));
        this.hitEnemy(n, `Tu tires : ${n} dégâts.`);
      } else if (arg.id === 'heavy') {
        const n = this.dmg(this.pAtk(), 1.6, this.eDef());
        this.hitEnemy(n, `Coup violent : ${n} dégâts.`);
        if (e.hp > 0 && Math.random() < 0.3) { e.st.bleed = STATUS.bleed.turns; this.say(`${d.name} saigne.`); }
      } else if (arg.id === 'aid') {
        const n = Math.round(state.maxHp * 0.35);
        state.hp = Math.min(state.maxHp, state.hp + n);
        this.say(`Premiers soins : +${n} PV.`);
      } else if (arg.id === 'stun') {
        const n = this.dmg(this.pAtk(), 1.2, this.eDef());
        this.hitEnemy(n, `Coup étourdissant : ${n} dégâts.`);
        if (e.hp > 0) {
          if (d.boss && Math.random() < 0.5) this.say(`${d.name} résiste à l'étourdissement.`);
          else e.st.stun = 1;
        }
      }
    } else if (kind === 'item') {
      state.items[arg]--;
      if (arg === 'bandage') { state.hp = Math.min(state.maxHp, state.hp + 15); delete this.pst.bleed; this.say('Bandage : +15 PV.'); }
      else if (arg === 'food') { state.hp = Math.min(state.maxHp, state.hp + 8); state.en = Math.min(state.maxEn, state.en + 5); this.say('Conserve : +8 PV, +5 énergie.'); }
      else if (arg === 'antidote') { delete this.pst.poison; delete this.pst.rad; this.say('Antidote : poison et irradiation soignés.'); }
    }

    this.render();
    if (e.hp <= 0) { this.time.delayedCall(800, () => this.win()); return; }
    this.time.delayedCall(900, () => this.enemyTurn());
  }

  // ---------- Tour de l'ennemi ----------
  tick(st, name, hurt) {
    for (const k of Object.keys(st)) {
      const s = STATUS[k];
      if (s.dmg) hurt(s.dmg, `${name} : ${s.name}, -${s.dmg} PV.`);
      if (k !== 'stun' && --st[k] <= 0) delete st[k];
    }
  }

  enemyTurn() {
    const e = this.e, d = this.def;
    e.guard = false;
    this.tick(e.st, d.name, (n, msg) => { e.hp = Math.max(0, e.hp - n); this.say(msg); });
    this.checkPhase();
    if (e.hp <= 0) { this.render(); this.time.delayedCall(800, () => this.win()); return; }

    if (e.st.stun) {
      delete e.st.stun;
      this.say(`${d.name} est étourdi et perd son tour.`);
    } else {
      const m = this.intent;
      if (m.t === 'atk') {
        let n = this.dmg(e.atk * (e.st.rad ? 0.75 : 1), m.m, state.def);
        if (this.guard) n = Math.max(1, Math.round(n * 0.4));
        state.hp = Math.max(0, state.hp - n);
        this.say(`${d.name} — ${m.n} : tu perds ${n} PV${this.guard ? ' (garde)' : ''}.`);
        this.cameras.main.shake(160, 0.012);
        if (m.st && !this.guard && Math.random() < m.p) {
          this.pst[m.st] = STATUS[m.st].turns;
          this.say(`Tu subis : ${STATUS[m.st].name}.`);
        }
      } else if (m.t === 'guard') {
        e.guard = true;
        this.say(`${d.name} — ${m.n} : sa défense augmente.`);
      } else if (m.t === 'heal') {
        e.hp = Math.min(e.maxHp, e.hp + m.h);
        this.say(`${d.name} — ${m.n} : +${m.h} PV.`);
      }
    }

    this.tick(this.pst, 'Toi', (n, msg) => { state.hp = Math.max(0, state.hp - n); this.say(msg); });
    state.en = Math.min(state.maxEn, state.en + 1);
    if (state.hp <= 0) { this.render(); this.time.delayedCall(900, () => this.lose()); return; }

    this.pickIntent();
    this.busy = false;
    this.render();
  }

  // ---------- Fin du combat ----------
  win() {
    const d = this.def;
    const scrap = rnd(d.scrap[0], d.scrap[1]);
    state.scrap += scrap;
    this.result = [`${d.name} est vaincu.`, `+${d.xp} XP, +${scrap} ferraille`];
    if (d.boss) {
      const ammo = rnd(4, 7);
      state.ammo += ammo;
      state.items.bandage += 2;
      this.result.push(`+${ammo} munitions, +2 bandages`);
      if (d.drop === 'serum') { state.maxHp += 10; this.result.push('Sérum mutagène : +10 PV max'); }
      else if (!state.weapons.includes(d.drop)) {
        state.weapons.push(d.drop);
        if (WEAPONS[d.drop].atk > weaponAtk()) state.weapon = d.drop;
        this.result.push(`Arme trouvée : ${WEAPONS[d.drop].name}`);
      }
    } else {
      const r = Math.random();
      if (r < 0.2) { state.ammo += 1; this.result.push('+1 munition'); }
      else if (r < 0.35) { state.items.bandage += 1; this.result.push('+1 bandage'); }
      else if (r < 0.45) { state.items.food += 1; this.result.push('+1 conserve'); }
    }
    for (const lvl of gainXp(d.xp)) this.result.push(`Niveau ${lvl} ! PV, énergie et attaque augmentent.`);
    const learned = SKILLS.find((s) => s.lvl === state.lvl && s.lvl > 1);
    if (learned && this.result.some((t) => t.startsWith('Niveau'))) this.result.push(`Nouvelle compétence : ${learned.name}`);
    this.over = 'win';
    this.eSprite.setVisible(false);
    this.render();
  }

  lose() {
    const lost = Math.floor(state.scrap * 0.3);
    state.scrap -= lost;
    this.result = ["Tu t'effondres...", 'Des rescapés te ramènent au camp.', lost ? `Ferraille perdue : ${lost}` : ''];
    this.over = 'dead';
    this.render();
  }

  finish(result) {
    this.gs.endCombat(result || this.over, this.mob);
  }

  // ---------- Affichage ----------
  render() {
    clear(this);
    const { width: w, height: h } = this.scale;
    const u = Math.min(w, h), pad = u * 0.03, land = w > h, d = this.def, e = this.e;
    const A = land ? { x: 0, y: 0, w: w * 0.58, h } : { x: 0, y: 0, w, h: h * 0.56 };
    const P = land ? { x: w * 0.58, y: 0, w: w * 0.42, h } : { x: 0, y: h * 0.56, w, h: h * 0.44 };
    const fs = u * 0.042, bw = A.w - pad * 2, bh = u * 0.045;
    this.bg.setSize(w, h);
    this.bg.input.hitArea.setSize(w, h);

    // Ennemi
    const stNames = (st) => Object.keys(st).map((k) => STATUS[k].name).join(', ');
    label(this, A.x + pad, A.y + pad, d.name + (d.boss ? '  [BOSS]' : ''), fs * 1.1, d.boss ? '#ff9a6a' : '#e8dfc8');
    bar(this, A.x + pad, A.y + pad + fs * 1.5, bw, bh, e.hp / e.maxHp, 0xb8402e, `${e.hp}/${e.maxHp}`);
    const est = [stNames(e.st), e.guard ? 'En garde' : ''].filter(Boolean).join(', ');
    if (est) label(this, A.x + pad, A.y + pad + fs * 1.5 + bh * 1.25, est, fs * 0.8, '#ffd040');

    const sc = (Math.min(A.w, A.h) * 0.3 / 16) * (d.boss ? 1.25 : 1);
    this.eSprite.setPosition(A.x + A.w / 2, A.y + A.h * 0.37).setScale(sc);
    this.floor.setPosition(this.eSprite.x, this.eSprite.y + sc * 7).setSize(sc * 18, sc * 4).setVisible(this.eSprite.visible);

    if (!this.over) {
      const m = this.intent;
      const hint = m.t === 'guard' ? ' (se protège)' : m.t === 'heal' ? ' (se soigne)' : m.big ? ' — GROS DÉGÂTS' : m.st ? ` (${STATUS[m.st].name})` : '';
      label(this, A.x + A.w / 2, A.y + A.h * 0.56, `Prépare : ${m.n}${hint}`, fs * 0.9, m.big ? '#ff6a4a' : '#9fd0ff', { align: 'center', wordWrap: { width: bw } }).setOrigin(0.5, 0);
    }
    label(this, A.x + pad, A.y + A.h * 0.65, (this.over ? this.result.filter(Boolean) : this.log).join('\n'), fs * 0.82, '#e8dfc8', { wordWrap: { width: bw }, lineSpacing: fs * 0.15 });

    // Joueur
    const by = A.y + A.h - pad - bh, half = (bw - pad) / 2;
    const pstTxt = [stNames(this.pst), this.guard ? 'En garde' : ''].filter(Boolean).join(', ');
    label(this, A.x + pad, by - fs * 1.2, `Niv ${state.lvl}  Munitions ${state.ammo}${pstTxt ? '  ' + pstTxt : ''}`, fs * 0.8, '#c9b98a');
    bar(this, A.x + pad, by, half, bh, state.hp / state.maxHp, 0x4f9a3a, `PV ${state.hp}/${state.maxHp}`);
    bar(this, A.x + pad * 2 + half, by, half, bh, state.en / state.maxEn, 0x3a6fb0, `Énergie ${state.en}/${state.maxEn}`);

    // Boutons
    let btns;
    if (this.over) btns = [['Continuer', () => this.finish()]];
    else if (this.menu === 'skills') {
      btns = SKILLS.filter((s) => s.lvl <= state.lvl).map((s) => {
        const cost = s.ammo ? `${s.ammo} munition` : `${s.en} énergie`;
        return [`${s.name} (${cost})`, () => this.act('skill', s), state.ammo < s.ammo || state.en < s.en];
      });
      btns.push(['Retour', () => { this.menu = 'main'; this.render(); }]);
    } else if (this.menu === 'items') {
      btns = Object.keys(ITEMS).filter((k) => state.items[k] > 0).map((k) => [`${ITEMS[k].name} x${state.items[k]}`, () => this.act('item', k)]);
      if (!btns.length) btns.push(['Sac vide', () => {}, true]);
      btns.push(['Retour', () => { this.menu = 'main'; this.render(); }]);
    } else {
      btns = [
        ['Attaquer', () => this.act('attack')],
        ['Compétences', () => { this.menu = 'skills'; this.render(); }],
        ['Objets', () => { this.menu = 'items'; this.render(); }],
        ['Défendre', () => this.act('defend')],
        ['Fuir', () => this.act('flee'), !!d.boss],
      ];
    }
    const n = btns.length;
    const hgt = Math.min((P.h - pad * (n + 1)) / n, u * 0.15);
    const top = P.y + (P.h - (hgt * n + pad * (n - 1))) / 2;
    btns.forEach(([text, fn, off], i) => {
      button(this, P.x + pad, top + i * (hgt + pad), P.w - pad * 2, hgt, text, fn, !!off || (this.busy && !this.over));
    });
  }
}
