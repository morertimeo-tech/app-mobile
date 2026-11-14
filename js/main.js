import { buildTextures, TILES, SOLID_IDS, TS } from './tiles.js';
import { generate, biomeName, W, H } from './world.js';

const VERSION = '0.1';
const SAVE_KEY = 'cendres-save-v1';
const CELL = 8;                 // taille (en tuiles) d'une case de carte explorée
const CW = W / CELL, CH = H / CELL;
const SPEED = 80;

const dpr = Math.min(window.devicePixelRatio || 1, 3);
const joy = { x: 0, y: 0 };

function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
}
function writeSave(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* stockage indisponible */ }
}

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    buildTextures(this);
    const world = this.world = generate();

    const rows = (arr) => {
      const out = [];
      for (let y = 0; y < H; y++) out.push(Array.from(arr.subarray(y * W, (y + 1) * W)));
      return out;
    };
    const gmap = this.make.tilemap({ data: rows(world.ground), tileWidth: TS, tileHeight: TS });
    const ground = gmap.createLayer(0, gmap.addTilesetImage('tiles'), 0, 0);
    const omap = this.make.tilemap({ data: rows(world.objects), tileWidth: TS, tileHeight: TS });
    const objects = omap.createLayer(0, omap.addTilesetImage('tiles'), 0, 0);
    ground.setCollision(SOLID_IDS);
    objects.setCollision(SOLID_IDS);

    // Reprise de la sauvegarde, si la position enregistrée est toujours praticable.
    const save = loadSave();
    let px = world.spawn.x * TS + 8, py = world.spawn.y * TS + 8;
    this.explored = new Uint8Array(CW * CH);
    if (save && typeof save.x === 'number' && typeof save.y === 'number' && !this.isSolid(save.x, save.y)) {
      px = save.x; py = save.y;
    }
    if (save && typeof save.explored === 'string' && save.explored.length === CW * CH) {
      for (let i = 0; i < CW * CH; i++) this.explored[i] = save.explored[i] === '1' ? 1 : 0;
    }

    const p = this.player = this.physics.add.sprite(px, py, 'player', 'down0');
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

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * TS, H * TS);
    cam.startFollow(p, true);
    this.scale.on('resize', this.applyZoom, this);
    this.applyZoom();

    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,Z,Q');
    this.biomeId = -1;
    this.tick = 0;
    this.saveTimer = 0;

    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    window.addEventListener('pagehide', () => this.save());

    this.scene.launch('ui', { gs: this });
  }

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

  update(time, delta) {
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

class UIScene extends Phaser.Scene {
  constructor() { super('ui'); }
  init(data) { this.gs = data.gs; }

  create() {
    const gs = this.gs, world = gs.world;

    // Carte complète (cachée), copiée case par case dans la carte visible quand on explore.
    const full = this.full = document.createElement('canvas');
    full.width = W; full.height = H;
    const fctx = full.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o = world.objects[i];
      fctx.fillStyle = (o >= 0 && TILES[o].color) || TILES[world.ground[i]].color;
      fctx.fillRect(x, y, 1, 1);
    }
    this.mmTex = this.textures.createCanvas('minimap', W, H);
    this.mmTex.context.fillStyle = '#0b0a09';
    this.mmTex.context.fillRect(0, 0, W, H);
    for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) if (gs.explored[cy * CW + cx]) this.reveal(cx, cy, false);
    this.mmTex.refresh();

    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.8).setOrigin(0).setVisible(false).setInteractive();
    this.frame = this.add.rectangle(0, 0, 10, 10, 0x0b0a09).setOrigin(0).setStrokeStyle(2, 0xc9b98a, 0.9);
    this.mm = this.add.image(0, 0, 'minimap').setOrigin(0).setInteractive();
    this.dot = this.add.rectangle(0, 0, 4, 4, 0xffe14d);
    this.tweens.add({ targets: this.dot, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });
    this.mapBig = false;
    this.mm.on('pointerdown', () => this.toggleMap());
    this.backdrop.on('pointerdown', () => this.toggleMap());

    const font = { fontFamily: 'monospace', color: '#e8dfc8', stroke: '#14110f' };
    this.biomeText = this.add.text(0, 0, '', font);
    this.versionText = this.add.text(0, 0, 'v' + VERSION, font).setOrigin(0, 1).setAlpha(0.5);
    this.title = this.add.text(0, 0, 'CENDRES', { ...font, color: '#f4c542' }).setOrigin(0.5);
    this.tweens.add({ targets: this.title, alpha: 0, delay: 2200, duration: 900 });

    // Joystick flottant : il apparaît là où le pouce se pose.
    this.base = this.add.circle(0, 0, 10, 0xffffff, 0.1).setStrokeStyle(2, 0xffffff, 0.35).setVisible(false);
    this.knob = this.add.circle(0, 0, 10, 0xffffff, 0.35).setVisible(false);
    this.joyId = null;
    this.input.addPointer(2);
    this.input.on('pointerdown', (p, over) => {
      if (over.length || this.joyId !== null) return;
      this.joyId = p.id;
      this.base.setPosition(p.x, p.y).setVisible(true);
      this.knob.setPosition(p.x, p.y).setVisible(true);
    });
    this.input.on('pointermove', (p) => {
      if (p.id !== this.joyId) return;
      let dx = p.x - this.base.x, dy = p.y - this.base.y;
      const d = Math.hypot(dx, dy), max = this.joyR;
      if (d > max) { dx *= max / d; dy *= max / d; }
      this.knob.setPosition(this.base.x + dx, this.base.y + dy);
      const dead = d < max * 0.15;
      joy.x = dead ? 0 : dx / max;
      joy.y = dead ? 0 : dy / max;
    });
    const release = (p) => { if (!p || p.id === this.joyId) this.resetJoy(); };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.game.events.on('blur', () => this.resetJoy());

    gs.events.on('biome', (name) => {
      this.biomeText.setText(name).setAlpha(1);
      this.tweens.killTweensOf(this.biomeText);
      this.tweens.add({ targets: this.biomeText, alpha: 0.55, delay: 2500, duration: 800 });
    });
    gs.events.on('reveal', (cx, cy) => this.reveal(cx, cy, true));
    if (gs.biomeId >= 0) this.biomeText.setText(biomeName(gs.biomeId));

    this.scale.on('resize', this.layout, this);
    this.layout();
  }

  resetJoy() {
    this.joyId = null;
    joy.x = 0; joy.y = 0;
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }

  reveal(cx, cy, refresh) {
    const x = cx * CELL, y = cy * CELL;
    this.mmTex.context.drawImage(this.full, x, y, CELL, CELL, x, y, CELL, CELL);
    if (refresh) this.mmTex.refresh();
  }

  toggleMap() {
    this.mapBig = !this.mapBig;
    this.resetJoy();
    this.layout();
  }

  layout() {
    const { width: w, height: h } = this.scale;
    const u = Math.min(w, h), m = Math.round(u * 0.03);
    this.resetJoy();
    this.joyR = u * 0.12;
    this.base.setRadius(this.joyR).setStrokeStyle(Math.max(2, u * 0.005), 0xffffff, 0.35);
    this.knob.setRadius(this.joyR * 0.45);

    const size = Math.round(this.mapBig ? u * 0.92 : u * 0.28);
    const x = this.mapBig ? Math.round((w - size) / 2) : w - size - m;
    const y = this.mapBig ? Math.round((h - size) / 2) : m;
    this.mm.setPosition(x, y).setDisplaySize(size, size);
    this.frame.setPosition(x, y).setSize(size, size).setStrokeStyle(Math.max(2, u * 0.006), 0xc9b98a, 0.9);
    this.backdrop.setSize(w, h).setVisible(this.mapBig);
    this.backdrop.input.hitArea.setSize(w, h);
    this.mmSize = size;
    this.dot.setSize(Math.max(3, size * 0.022), Math.max(3, size * 0.022));

    this.biomeText.setPosition(m, m).setFontSize(Math.round(u * 0.045)).setStroke('#14110f', Math.max(2, u * 0.008));
    this.versionText.setPosition(m, h - m).setFontSize(Math.round(u * 0.03));
    this.title.setPosition(w / 2, h * 0.3).setFontSize(Math.round(u * 0.13)).setStroke('#14110f', Math.max(3, u * 0.015));
  }

  update() {
    const p = this.gs.player;
    this.dot.setPosition(
      this.mm.x + (p.x / (W * TS)) * this.mmSize,
      this.mm.y + (p.y / (H * TS)) * this.mmSize,
    );
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
  scene: [GameScene, UIScene],
});
window.__game = game;

const onResize = () => { const [w, h] = size(); game.scale.resize(w, h); };
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 250));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
