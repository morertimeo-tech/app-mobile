import { buildTextures, TILES, SOLID_IDS, TS, T } from './tiles.js';
import { generate, biomeName, W, H, BIOME, CITIES, SEED } from './world.js';
import { hash2, mulberry } from './rng.js';
import { state, joy, loadSave, writeSave } from './state.js';
import { ENEMIES, BOSSES, WEAPONS } from './data.js';
import { UIScene, CELL, CW, CH } from './hud.js';
import { CombatScene } from './combat.js';
import { MenuScene } from './menu.js';

const VERSION = '0.2';
const SPEED = 80;
const MOB_COUNT = 150;

const dpr = Math.min(window.devicePixelRatio || 1, 3);

// Quel ennemi dans quel biome : [type, poids].
const SPAWNS = {
  [BIOME.MUD]: [['ghoul', 2], ['rat', 2]],
  [BIOME.DESERT]: [['rat', 3], ['dog', 2]],
  [BIOME.WASTE]: [['dog', 3], ['rat', 2], ['raider', 2]],
  [BIOME.PLAIN]: [['rat', 3], ['dog', 2]],
  [BIOME.FOREST]: [['dog', 3], ['rat', 2], ['ghoul', 1]],
  [BIOME.ASH]: [['ghoul', 3], ['dog', 1]],
  city: [['raider', 3], ['drone', 2]],
};

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    buildTextures(this);
    const save = loadSave();
    const world = this.world = generate();
    for (const i of Object.keys(state.looted)) if (world.objects[i] === T.crate) world.objects[i] = T.crateOpen;

    const rows = (arr) => {
      const out = [];
      for (let y = 0; y < H; y++) out.push(Array.from(arr.subarray(y * W, (y + 1) * W)));
      return out;
    };
    const gmap = this.make.tilemap({ data: rows(world.ground), tileWidth: TS, tileHeight: TS });
    const ground = this.groundLayer = gmap.createLayer(0, gmap.addTilesetImage('tiles'), 0, 0);
    const omap = this.make.tilemap({ data: rows(world.objects), tileWidth: TS, tileHeight: TS });
    const objects = this.objLayer = omap.createLayer(0, omap.addTilesetImage('tiles'), 0, 0);
    ground.setCollision(SOLID_IDS);
    objects.setCollision(SOLID_IDS);

    // Reprise de la sauvegarde, si la position enregistrée est toujours praticable.
    let px = world.spawn.x * TS + 8, py = world.spawn.y * TS + 8;
    this.explored = new Uint8Array(CW * CH);
    if (save && typeof save.x === 'number' && typeof save.y === 'number' && !this.isSolid(save.x, save.y)) {
      px = save.x; py = save.y;
    }
    if (save && typeof save.explored === 'string' && save.explored.length === CW * CH) {
      for (let i = 0; i < CW * CH; i++) this.explored[i] = save.explored[i] === '1' ? 1 : 0;
    }

    const p = this.player = this.physics.add.sprite(px, py, 'player', 'down0').setDepth(2);
    p.body.setSize(8, 6).setOffset(4, 9);
    p.setCollideWorldBounds(true);
    this.dir = 'down';
    for (const d of ['down', 'up', 'left', 'right']) {
      this.anims.create({
        key: 'walk-' + d,
        frames: [d + '1', d + '0', d + '2', d + '0'].map((frame) => ({ key: 'player', frame })),
        frameRate: 8,
        repeat: -1,
      });
    }
    this.physics.world.setBounds(0, 0, W * TS, H * TS);
    this.physics.add.collider(p, ground);
    this.physics.add.collider(p, objects);

    this.mobs = this.physics.add.group();
    this.physics.add.collider(this.mobs, ground);
    this.physics.add.collider(this.mobs, objects);
    this.physics.add.overlap(p, this.mobs, (pl, mob) => this.startCombat(mob));
    this.spawnMobs();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * TS, H * TS);
    cam.startFollow(p, true);
    this.scale.on('resize', this.applyZoom, this);
    this.applyZoom();

    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,Z,Q');
    this.biomeId = -1;
    this.clock = 0;          // horloge du jeu : n'avance pas pendant un combat ou un menu
    this.safeUntil = 1500;   // pas d'embuscade juste après un chargement, une fuite ou une mort
    this.tick = 0;
    this.saveTimer = 0;
    this.locked = false;

    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    window.addEventListener('pagehide', () => this.save());

    this.scene.launch('ui', { gs: this, version: VERSION });
  }

  // ---------- Monde ----------
  isSolid(px, py) {
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    const i = ty * W + tx;
    const o = this.world.objects[i];
    return TILES[this.world.ground[i]].solid || (o >= 0 && TILES[o].solid);
  }

  applyZoom() {
    const { width, height } = this.scale;
    this.cameras.main.setZoom(Math.max(2, Math.round(Math.min(width, height) / (TS * 11))));
  }

  save() {
    let explored = '';
    for (let i = 0; i < this.explored.length; i++) explored += this.explored[i] ? '1' : '0';
    writeSave({ v: VERSION, x: Math.round(this.player.x), y: Math.round(this.player.y), explored });
  }

  // ---------- Ennemis ----------
  addMob(kind, x, y) {
    const def = ENEMIES[kind];
    const mob = this.mobs.create(x, y, 'mobs', def.sprite).setDepth(1);
    mob.kind = kind;
    mob.body.setSize(10, 8).setOffset(3, 7);
    mob.nextTurn = 0;
    mob.stunUntil = 0;
    if (def.tint) mob.setTint(def.tint);
    if (def.boss) { mob.setScale(2); mob.body.setImmovable(true); }
    return mob;
  }

  spawnMobs() {
    this.mobs.clear(true, true);
    const world = this.world, r = mulberry(SEED + 5);
    const cx = world.camp.x, cy = world.camp.y;
    let made = 0;
    for (let tries = 0; tries < MOB_COUNT * 20 && made < MOB_COUNT; tries++) {
      const tx = 2 + Math.floor(r() * (W - 4)), ty = 2 + Math.floor(r() * (H - 4));
      const i = ty * W + tx, b = world.biome[i];
      const roll = r();
      if (Math.hypot(tx - cx, ty - cy) < 14 || this.isSolid(tx * TS + 8, ty * TS + 8)) continue;
      const table = b >= BIOME.CITY ? SPAWNS.city : SPAWNS[b];
      if (!table) continue;
      let pick = roll * table.reduce((s, t) => s + t[1], 0), kind = table[0][0];
      for (const [k, wgt] of table) { pick -= wgt; if (pick < 0) { kind = k; break; } }
      this.addMob(kind, tx * TS + 8, ty * TS + 8);
      made++;
    }
    for (const id of BOSSES) {
      if (state.bosses[id]) continue;
      const c = CITIES[ENEMIES[id].city];
      this.addMob(id, (c.x + 1) * TS, (c.y + 1) * TS);
    }
  }

  updateMobs() {
    const p = this.player, now = this.clock;
    const hunted = now > this.safeUntil && this.biomeId !== BIOME.CAMP;
    for (const mob of this.mobs.getChildren()) {
      if (!mob.active) continue;
      const dx = p.x - mob.x, dy = p.y - mob.y, d = Math.hypot(dx, dy);
      if (ENEMIES[mob.kind].boss || d > 280 || now < mob.stunUntil) { mob.setVelocity(0, 0); continue; }
      if (d < 84 && hunted) {
        mob.setVelocity((dx / d) * 52, (dy / d) * 52);
      } else if (now > mob.nextTurn) {
        mob.nextTurn = now + 800 + Math.random() * 1600;
        const a = Math.random() * Math.PI * 2, sp = Math.random() < 0.4 ? 0 : 22;
        mob.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
      }
      if (mob.body.velocity.x !== 0) mob.setFlipX(mob.body.velocity.x < 0);
    }
  }

  startCombat(mob) {
    if (this.locked || !mob.active || this.clock < this.safeUntil) return;
    this.locked = true;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    this.scene.pause();
    this.scene.sleep('ui');
    this.scene.launch('combat', { gs: this, mob });
  }

  endCombat(result, mob) {
    const def = ENEMIES[mob.kind];
    if (result === 'win') {
      if (def.boss) state.bosses[mob.kind] = 1;
      mob.destroy();
      if (def.boss && BOSSES.every((b) => state.bosses[b])) this.events.emit('toast', 'Les trois boss sont vaincus.\nLes terres mortes respirent un peu.');
    } else if (result === 'dead') {
      this.player.setPosition(this.world.spawn.x * TS + 8, this.world.spawn.y * TS + 8);
      state.hp = state.maxHp;
      state.en = state.maxEn;
      this.events.emit('toast', 'Tu te réveilles au camp.');
    } else {
      mob.stunUntil = this.clock + 4000;
      mob.setVelocity(0, 0);
      this.events.emit('toast', 'Tu prends la fuite.');
    }
    this.safeUntil = this.clock + 2500;
    this.locked = false;
    this.save();
    this.scene.stop('combat');
    this.scene.wake('ui');
    this.scene.resume();
  }

  // ---------- Sac ----------
  openMenu() {
    if (this.locked) return;
    this.locked = true;
    this.player.setVelocity(0, 0);
    this.scene.pause();
    this.scene.sleep('ui');
    this.scene.launch('menu', { gs: this });
  }

  closeMenu() {
    this.locked = false;
    this.save();
    this.scene.stop('menu');
    this.scene.wake('ui');
    this.scene.resume();
  }

  // ---------- Interactions : caisses, épaves, feu de camp ----------
  findInteract() {
    const p = this.player, o = this.world.objects;
    const tx = Math.floor(p.x / TS), ty = Math.floor((p.y + 4) / TS);
    let found = null;
    for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x, t = o[i];
      if (t === T.fire) return { kind: 'fire', i, label: 'Se reposer' };
      if (t === T.crate && !state.looted[i]) found = { kind: 'crate', i, label: 'Fouiller' };
      const car = t === T.carL ? i : t === T.carR ? i - 1 : -1;
      if (car >= 0 && !state.looted[car] && !found) found = { kind: 'car', i: car, label: "Fouiller l'épave" };
    }
    return found;
  }

  doInteract() {
    const it = this.findInteract();
    if (!it || this.locked) return;
    if (it.kind === 'fire') {
      state.hp = state.maxHp;
      state.en = state.maxEn;
      this.spawnMobs();
      this.events.emit('toast', 'Tu te reposes près du feu.\nPV et énergie restaurés.\nLes créatures reviennent rôder.');
    } else {
      this.events.emit('toast', 'Tu trouves : ' + this.loot(it).join(', '));
    }
    this.save();
  }

  loot(it) {
    const i = it.i, r = hash2(i, 7, 99), r2 = hash2(i, 13, 99), got = [];
    state.looted[i] = 1;
    const scrap = 2 + Math.floor(r * 7);
    state.scrap += scrap;
    got.push(scrap + ' ferraille');
    const ammo = (n) => { state.ammo += n; got.push(n + (n > 1 ? ' munitions' : ' munition')); };
    const item = (k, name) => { state.items[k]++; got.push(name); };
    if (it.kind === 'car') {
      if (r2 < 0.45) ammo(1 + Math.floor(r * 3));
    } else {
      this.world.objects[i] = T.crateOpen;
      this.objLayer.putTileAt(T.crateOpen, i % W, Math.floor(i / W));
      if (r2 < 0.3) item('bandage', '1 bandage');
      else if (r2 < 0.55) item('food', '1 conserve');
      else if (r2 < 0.8) ammo(1 + Math.floor(r * 3));
      else if (r2 < 0.9) item('antidote', '1 antidote');
      else if (!state.weapons.includes('machete')) {
        state.weapons.push('machete');
        if (WEAPONS.machete.atk > WEAPONS[state.weapon].atk) state.weapon = 'machete';
        got.push('une machette (équipée)');
      } else item('bandage', '1 bandage');
    }
    return got;
  }

  // ---------- Boucle ----------
  update(time, delta) {
    this.clock += delta;
    const k = this.keys, p = this.player;
    let vx = joy.x, vy = joy.y;
    if (k.LEFT.isDown || k.A.isDown || k.Q.isDown) vx = -1;
    if (k.RIGHT.isDown || k.D.isDown) vx = 1;
    if (k.UP.isDown || k.W.isDown || k.Z.isDown) vy = -1;
    if (k.DOWN.isDown || k.S.isDown) vy = 1;
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    p.setVelocity(vx * SPEED, vy * SPEED);

    if (len > 0.01) {
      this.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      p.anims.play('walk-' + this.dir, true);
    } else {
      p.anims.stop();
      p.setFrame(this.dir + '0');
    }

    this.updateMobs();

    this.tick += delta;
    if (this.tick > 200) {
      this.tick = 0;
      const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
      const b = this.world.biome[ty * W + tx];
      if (b !== this.biomeId) { this.biomeId = b; this.events.emit('biome', biomeName(b)); }
      const cx = Math.floor(tx / CELL), cy = Math.floor(ty / CELL);
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
        if (x < 0 || y < 0 || x >= CW || y >= CH || this.explored[y * CW + x]) continue;
        this.explored[y * CW + x] = 1;
        this.events.emit('reveal', x, y);
      }
    }
    this.saveTimer += delta;
    if (this.saveTimer > 3000) { this.saveTimer = 0; this.save(); }
  }
}

const size = () => [Math.round(window.innerWidth * dpr), Math.round(window.innerHeight * dpr)];
const [gw, gh] = size();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14110f',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, width: gw, height: gh, zoom: 1 / dpr },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
  input: { activePointers: 3 },
  scene: [GameScene, UIScene, CombatScene, MenuScene],
});
window.__game = game;

const onResize = () => { const [w, h] = size(); game.scale.resize(w, h); };
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 250));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
