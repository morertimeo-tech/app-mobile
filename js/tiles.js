// Tous les graphismes sont dessinés par code, pixel par pixel (tuiles de 16x16).
import { mulberry } from './rng.js';

export const TS = 16;
const COLS = 16;

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const SHADOW = 'rgba(0,0,0,0.28)';

function speck(c, r, base, cols, n) {
  R(c, 0, 0, 16, 16, base);
  for (let i = 0; i < n; i++) R(c, (r() * 16) | 0, (r() * 16) | 0, 1, 1, cols[(r() * cols.length) | 0]);
}

function crack(c, r, col, len) {
  let x = 2 + ((r() * 12) | 0), y = (r() * 6) | 0;
  for (let i = 0; i < len; i++) {
    R(c, x, y, 1, 1, col);
    y++;
    if (r() < 0.45) x += r() < 0.5 ? -1 : 1;
  }
}

function car(c) {
  R(c, 2, 13, 28, 2, SHADOW);
  R(c, 2, 7, 28, 6, '#7c4129');
  R(c, 8, 3, 14, 5, '#6a3622');
  R(c, 9, 4, 5, 3, '#23282b');
  R(c, 16, 4, 5, 3, '#23282b');
  R(c, 5, 11, 5, 4, '#1c1b1b');
  R(c, 22, 11, 5, 4, '#1c1b1b');
  R(c, 6, 12, 3, 2, '#3a3837');
  R(c, 23, 12, 3, 2, '#3a3837');
  R(c, 29, 8, 1, 2, '#c9c2a0');
  const r = mulberry(4242);
  for (let i = 0; i < 16; i++) R(c, 3 + ((r() * 26) | 0), 7 + ((r() * 5) | 0), 1, 1, r() < 0.5 ? '#9a5a35' : '#4f2a1b');
}

function wallFront(c) {
  R(c, 0, 11, 16, 5, '#5e5a55');
  R(c, 0, 13, 16, 1, '#4f4b47');
  R(c, 5, 11, 1, 2, '#4f4b47');
  R(c, 12, 11, 1, 2, '#4f4b47');
  R(c, 8, 14, 1, 2, '#4f4b47');
}

const defs = [];
const def = (key, opts, draw) => defs.push({ key, solid: !!opts.solid, color: opts.color || null, draw });

// ---------- Sols ----------
for (let i = 0; i < 3; i++) def('dirt' + i, { color: '#6b5540' }, (c, r) => speck(c, r, '#6b5540', ['#5c4836', '#7a6249', '#5c4836'], 26));
for (let i = 0; i < 2; i++) def('crack' + i, { color: '#75614b' }, (c, r) => {
  speck(c, r, '#75614b', ['#67553f', '#826d55'], 14);
  crack(c, r, '#48392b', 9); crack(c, r, '#48392b', 7);
});
for (let i = 0; i < 3; i++) def('grass' + i, { color: '#777040' }, (c, r) => {
  speck(c, r, '#777040', ['#686236', '#857d4a'], 24);
  for (let k = 0; k < 3; k++) R(c, (r() * 15) | 0, (r() * 14) | 0, 1, 2, '#938b54');
});
for (let i = 0; i < 2; i++) def('sand' + i, { color: '#b39860' }, (c, r) => {
  speck(c, r, '#b39860', ['#a68b54', '#c0a66e'], 18);
  for (let k = 0; k < 2; k++) R(c, (r() * 12) | 0, (r() * 16) | 0, 3, 1, '#a68b54');
});
for (let i = 0; i < 2; i++) def('ash' + i, { color: '#575451' }, (c, r) => speck(c, r, '#575451', ['#4b4846', '#65625e', '#3f3d3b'], 30));
for (let i = 0; i < 3; i++) def('road' + i, { color: '#3c3b3f' }, (c, r) => {
  speck(c, r, '#3c3b3f', ['#343337', '#46454a'], 22);
  if (i >= 1) crack(c, r, '#262528', 10);
  if (i === 2) { R(c, 3 + ((r() * 9) | 0), 4 + ((r() * 8) | 0), 1, 2, '#777040'); R(c, 3 + ((r() * 9) | 0), 4 + ((r() * 8) | 0), 2, 1, '#6b5540'); }
});
for (let i = 0; i < 2; i++) def('floor' + i, { color: '#807d78' }, (c, r) => {
  R(c, 0, 0, 16, 16, '#807d78');
  R(c, 0, 0, 16, 1, '#6f6c67'); R(c, 0, 8, 16, 1, '#6f6c67');
  R(c, 0, 0, 1, 16, '#6f6c67'); R(c, 8, 0, 1, 16, '#6f6c67');
  for (let k = 0; k < 6; k++) R(c, (r() * 16) | 0, (r() * 16) | 0, 1, 1, '#8d8a85');
  if (i === 1) { crack(c, r, '#55524e', 9); R(c, 9, 10, 4, 3, '#74716c'); }
});
for (let i = 0; i < 2; i++) def('toxic' + i, { solid: true, color: '#4c7a2e' }, (c, r) => {
  speck(c, r, '#4c7a2e', ['#5f9636', '#3d6425'], 20);
  for (let k = 0; k < 2; k++) R(c, (r() * 14) | 0, (r() * 16) | 0, 2, 1, '#a4d65a');
});
for (let i = 0; i < 2; i++) def('mud' + i, { color: '#4e4a34' }, (c, r) => speck(c, r, '#4e4a34', ['#434029', '#5a563e', '#4c7a2e'], 26));

// ---------- Objets ----------
def('tree0', { solid: true, color: '#3b2d23' }, (c) => {
  R(c, 4, 14, 9, 1, SHADOW);
  R(c, 7, 6, 2, 9, '#3b2d23'); R(c, 6, 13, 4, 2, '#3b2d23');
  R(c, 5, 5, 2, 1, '#3b2d23'); R(c, 4, 3, 1, 2, '#3b2d23');
  R(c, 9, 7, 3, 1, '#3b2d23'); R(c, 11, 5, 1, 2, '#3b2d23');
  R(c, 8, 2, 1, 4, '#3b2d23'); R(c, 9, 1, 1, 2, '#3b2d23');
  R(c, 7, 7, 1, 6, '#4d3b2e');
});
def('tree1', { solid: true, color: '#3b2d23' }, (c) => {
  R(c, 4, 14, 9, 1, SHADOW);
  R(c, 7, 5, 2, 10, '#33271f'); R(c, 6, 13, 4, 2, '#33271f');
  R(c, 9, 4, 2, 1, '#33271f'); R(c, 11, 2, 1, 2, '#33271f');
  R(c, 4, 8, 3, 1, '#33271f'); R(c, 4, 6, 1, 2, '#33271f');
  R(c, 7, 2, 1, 3, '#33271f'); R(c, 6, 1, 1, 2, '#33271f');
  R(c, 10, 9, 2, 1, '#33271f'); R(c, 8, 6, 1, 7, '#463529');
});
def('stump', { solid: true }, (c) => {
  R(c, 4, 14, 8, 1, SHADOW);
  R(c, 5, 9, 6, 5, '#4a382b'); R(c, 5, 8, 6, 2, '#8a6f52'); R(c, 7, 8, 2, 1, '#6e573f');
});
def('rock', { solid: true }, (c) => {
  R(c, 3, 14, 10, 1, SHADOW);
  R(c, 4, 8, 8, 6, '#77736e'); R(c, 5, 6, 6, 2, '#77736e');
  R(c, 5, 7, 3, 1, '#9a9590'); R(c, 4, 13, 8, 1, '#55514d'); R(c, 10, 9, 2, 3, '#66625d');
});
def('rubble', { solid: true }, (c) => {
  R(c, 2, 14, 12, 1, SHADOW);
  R(c, 3, 9, 5, 5, '#7d7973'); R(c, 8, 7, 5, 7, '#6a6661'); R(c, 6, 11, 6, 3, '#8f8b85');
  R(c, 11, 12, 3, 2, '#5a5652'); R(c, 9, 4, 1, 4, '#7a4028'); R(c, 4, 10, 2, 1, '#96928b');
});
def('wall', { solid: true, color: '#a09c95' }, (c, r) => {
  R(c, 0, 0, 16, 11, '#96928b'); R(c, 0, 0, 16, 1, '#a9a59e');
  for (let k = 0; k < 8; k++) R(c, (r() * 16) | 0, 1 + ((r() * 9) | 0), 1, 1, '#88847d');
  wallFront(c);
});
def('wallb', { solid: true, color: '#8a867f' }, (c) => {
  const hts = [7, 9, 6, 4, 5, 8, 10, 9, 6, 5, 7, 9, 8, 5, 4, 6];
  hts.forEach((h, x) => { R(c, x, 11 - h, 1, h, '#96928b'); R(c, x, 11 - h, 1, 1, '#a9a59e'); });
  wallFront(c);
  R(c, 6, 5, 1, 3, '#7a4028');
});
def('carL', { solid: true }, (c) => car(c));
def('carR', { solid: true }, (c) => { c.translate(-16, 0); car(c); });
def('barrel', { solid: true }, (c) => {
  R(c, 4, 14, 8, 1, SHADOW);
  R(c, 5, 5, 6, 9, '#5e6c3b'); R(c, 5, 7, 6, 1, '#3f4927'); R(c, 5, 11, 6, 1, '#3f4927');
  R(c, 5, 4, 6, 2, '#78894c'); R(c, 7, 8, 2, 2, '#d7c94a');
});
def('bush', {}, (c) => {
  R(c, 4, 10, 1, 4, '#8b7b3d'); R(c, 6, 8, 1, 6, '#6f6231'); R(c, 8, 9, 1, 5, '#8b7b3d');
  R(c, 10, 7, 1, 7, '#6f6231'); R(c, 12, 10, 1, 4, '#8b7b3d'); R(c, 5, 9, 1, 1, '#8b7b3d'); R(c, 11, 8, 1, 1, '#8b7b3d');
});
def('tuft', {}, (c) => {
  R(c, 5, 11, 1, 3, '#938b54'); R(c, 7, 10, 1, 4, '#686236'); R(c, 9, 11, 1, 3, '#938b54'); R(c, 11, 12, 1, 2, '#686236');
});
def('cactus', { solid: true }, (c) => {
  R(c, 5, 14, 7, 1, SHADOW);
  R(c, 7, 3, 2, 11, '#5d7747'); R(c, 7, 3, 1, 11, '#718c58');
  R(c, 4, 6, 1, 4, '#5d7747'); R(c, 4, 9, 3, 1, '#5d7747');
  R(c, 11, 5, 1, 4, '#5d7747'); R(c, 9, 8, 3, 1, '#5d7747');
});
def('tent', { solid: true, color: '#c08a3e' }, (c) => {
  R(c, 1, 14, 14, 1, SHADOW);
  for (let y = 3; y <= 13; y++) { const h = Math.round((y - 3) * 0.7) + 1; R(c, 8 - h, y, h * 2, 1, y % 3 ? '#8c6c3e' : '#7a5d34'); }
  for (let y = 8; y <= 13; y++) { const h = Math.round((y - 8) * 0.3) + 1; R(c, 8 - h, y, h * 2, 1, '#2a211a'); }
  R(c, 7, 2, 2, 1, '#3b2d23');
});
def('fire', { solid: true, color: '#f4c542' }, (c) => {
  R(c, 4, 12, 8, 2, '#55514d'); R(c, 5, 11, 6, 1, '#3b2d23');
  R(c, 6, 7, 4, 4, '#e0661f'); R(c, 7, 5, 2, 3, '#e0661f');
  R(c, 7, 8, 2, 3, '#f4c542'); R(c, 7, 6, 1, 2, '#f4c542');
});
def('crate', { solid: true }, (c) => {
  R(c, 3, 14, 10, 1, SHADOW);
  R(c, 3, 5, 10, 9, '#8b6c3e');
  R(c, 3, 5, 10, 1, '#5f4627'); R(c, 3, 13, 10, 1, '#5f4627'); R(c, 3, 5, 1, 9, '#5f4627'); R(c, 12, 5, 1, 9, '#5f4627');
  for (let i = 0; i < 7; i++) R(c, 4 + i, 6 + i, 1, 1, '#5f4627');
});
def('bones', {}, (c) => {
  R(c, 4, 9, 5, 1, '#d9d4c3'); R(c, 3, 8, 1, 3, '#d9d4c3'); R(c, 9, 8, 1, 3, '#d9d4c3');
  R(c, 10, 11, 3, 3, '#d9d4c3'); R(c, 11, 12, 1, 1, '#333333');
});
def('lamp', { solid: true }, (c) => {
  R(c, 5, 14, 6, 1, SHADOW);
  R(c, 7, 3, 2, 12, '#45464a'); R(c, 5, 2, 6, 2, '#55565b'); R(c, 6, 4, 4, 1, '#2a2a2c');
});
def('debris', {}, (c, r) => {
  for (let k = 0; k < 6; k++) R(c, 2 + ((r() * 11) | 0), 3 + ((r() * 10) | 0), 1 + ((r() * 2) | 0), 1, r() < 0.5 ? '#6a6661' : '#8f8b85');
});

def('crateOpen', { solid: true }, (c) => {
  R(c, 3, 14, 10, 1, SHADOW);
  R(c, 3, 7, 10, 7, '#6f5631');
  R(c, 3, 7, 10, 1, '#5f4627'); R(c, 3, 13, 10, 1, '#5f4627'); R(c, 3, 7, 1, 7, '#5f4627'); R(c, 12, 7, 1, 7, '#5f4627');
  R(c, 4, 8, 8, 3, '#2a211a'); R(c, 2, 4, 9, 2, '#8b6c3e'); R(c, 2, 4, 9, 1, '#5f4627');
});

export const TILES = defs;
export const T = {};
defs.forEach((d, i) => { T[d.key] = i; });
export const SOLID_IDS = defs.map((d, i) => (d.solid ? i : -1)).filter((i) => i >= 0);

export function makeTilesCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TS;
  canvas.height = Math.ceil(defs.length / COLS) * TS;
  const ctx = canvas.getContext('2d');
  defs.forEach((d, i) => {
    const x = (i % COLS) * TS, y = ((i / COLS) | 0) * TS;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, TS, TS); ctx.clip();
    ctx.translate(x, y);
    d.draw(ctx, mulberry(1000 + i * 7919));
    ctx.restore();
  });
  return canvas;
}

// ---------- Personnage ----------
const DIRS = ['down', 'up', 'left', 'right'];

export function drawPlayer(c, dir, f) {
  const skin = '#d6a676', hair = '#2a2420', coat = '#7a4a29', coatD = '#5f381e';
  const pants = '#35343f', boot = '#1f1c1a', scarf = '#a5332c', pack = '#4e5b36';
  c.save();
  if (dir === 'right') { c.translate(16, 0); c.scale(-1, 1); }
  R(c, 4, 14, 8, 1, 'rgba(0,0,0,0.3)');
  if (dir === 'down' || dir === 'up') {
    const l = f === 1 ? -1 : 0, r = f === 2 ? -1 : 0;
    R(c, 5, 11, 2, 3 + l, pants); R(c, 9, 11, 2, 3 + r, pants);
    R(c, 5, 13 + l, 2, 1, boot); R(c, 9, 13 + r, 2, 1, boot);
    R(c, 4, 6, 8, 5, coat); R(c, 3, 7, 1, 3, coatD); R(c, 12, 7, 1, 3, coatD);
    R(c, 4, 10, 8, 1, boot);
    R(c, 5, 1, 6, 5, skin);
    if (dir === 'down') {
      R(c, 5, 1, 6, 2, hair); R(c, 5, 3, 1, 1, hair); R(c, 10, 3, 1, 1, hair);
      R(c, 6, 4, 1, 1, '#1a1a1a'); R(c, 9, 4, 1, 1, '#1a1a1a');
      R(c, 5, 6, 6, 1, scarf);
    } else {
      R(c, 5, 1, 6, 4, hair);
      R(c, 5, 7, 6, 4, pack); R(c, 6, 8, 4, 1, '#3c4729');
    }
  } else {
    if (f === 0) { R(c, 6, 11, 3, 3, pants); R(c, 6, 13, 3, 1, boot); }
    else if (f === 1) { R(c, 5, 11, 2, 3, pants); R(c, 9, 11, 2, 2, pants); R(c, 4, 13, 3, 1, boot); R(c, 9, 12, 2, 1, boot); }
    else { R(c, 5, 11, 2, 2, pants); R(c, 9, 11, 2, 3, pants); R(c, 5, 12, 2, 1, boot); R(c, 8, 13, 3, 1, boot); }
    R(c, 5, 6, 6, 5, coat); R(c, 7, 7, 2, 3, coatD); R(c, 10, 6, 2, 4, pack);
    R(c, 5, 10, 6, 1, boot);
    R(c, 5, 1, 6, 5, skin); R(c, 6, 1, 5, 2, hair); R(c, 9, 3, 2, 2, hair);
    R(c, 6, 4, 1, 1, '#1a1a1a'); R(c, 5, 6, 6, 1, scarf);
  }
  c.restore();
}

// ---------- Ennemis ----------
const MOBS = {
  rat(c) {
    R(c, 3, 13, 10, 1, SHADOW);
    R(c, 4, 9, 8, 4, '#6b5a4a'); R(c, 10, 8, 4, 4, '#7a6857'); R(c, 11, 7, 1, 1, '#b08a7a');
    R(c, 12, 9, 1, 1, '#ff4030'); R(c, 1, 11, 3, 1, '#b08a7a'); R(c, 1, 10, 1, 1, '#b08a7a');
    R(c, 5, 13, 1, 1, '#4a3d32'); R(c, 10, 13, 1, 1, '#4a3d32'); R(c, 13, 11, 1, 1, '#ffffff');
  },
  dog(c) {
    R(c, 2, 14, 12, 1, SHADOW);
    R(c, 3, 7, 9, 4, '#5c5148'); R(c, 10, 4, 4, 4, '#665a50'); R(c, 13, 6, 2, 2, '#4a4039');
    R(c, 10, 3, 1, 2, '#3b332d'); R(c, 12, 5, 1, 1, '#ffd040');
    R(c, 3, 11, 2, 3, '#4a4039'); R(c, 9, 11, 2, 3, '#4a4039');
    R(c, 1, 6, 2, 1, '#5c5148'); R(c, 1, 5, 1, 1, '#5c5148'); R(c, 5, 8, 1, 2, '#4a4039'); R(c, 7, 8, 1, 2, '#4a4039');
  },
  raider(c) {
    R(c, 4, 14, 8, 1, SHADOW);
    R(c, 5, 11, 2, 3, '#2b2a2e'); R(c, 9, 11, 2, 3, '#2b2a2e');
    R(c, 4, 6, 8, 5, '#3d3a36'); R(c, 3, 6, 1, 2, '#8a8580'); R(c, 12, 6, 1, 2, '#8a8580'); R(c, 4, 10, 8, 1, '#7a4028');
    R(c, 5, 1, 6, 5, '#2a2420'); R(c, 6, 3, 4, 2, '#8a8580'); R(c, 6, 3, 1, 1, '#ff4030'); R(c, 9, 3, 1, 1, '#ff4030');
    R(c, 13, 4, 1, 8, '#8b6c3e');
  },
  ghoul(c) {
    R(c, 3, 14, 10, 1, SHADOW);
    R(c, 5, 11, 2, 3, '#4d5a44'); R(c, 9, 11, 2, 3, '#4d5a44');
    R(c, 4, 6, 8, 5, '#6f8062'); R(c, 2, 7, 2, 6, '#7d8f6f'); R(c, 12, 7, 2, 6, '#7d8f6f');
    R(c, 5, 1, 6, 5, '#8fa37f'); R(c, 6, 3, 1, 1, '#d8ff5a'); R(c, 9, 3, 1, 1, '#d8ff5a'); R(c, 7, 5, 2, 1, '#2a211a');
    R(c, 6, 8, 1, 1, '#a5332c'); R(c, 9, 9, 1, 1, '#a5332c');
  },
  drone(c) {
    R(c, 4, 14, 8, 1, SHADOW);
    R(c, 3, 5, 10, 6, '#6d7278'); R(c, 5, 3, 6, 2, '#8a9097'); R(c, 7, 7, 2, 2, '#ff4030');
    R(c, 1, 4, 3, 1, '#2a2a2c'); R(c, 12, 4, 3, 1, '#2a2a2c'); R(c, 8, 1, 1, 2, '#2a2a2c');
    R(c, 5, 11, 6, 1, '#45464a'); R(c, 4, 9, 1, 1, '#ffd040');
  },
};

export function buildTextures(scene) {
  scene.textures.addCanvas('tiles', makeTilesCanvas());

  const names = Object.keys(MOBS);
  const mc = document.createElement('canvas');
  mc.width = names.length * 16; mc.height = 16;
  const mctx = mc.getContext('2d');
  const mtex = scene.textures.addCanvas('mobs', mc);
  names.forEach((name, i) => {
    mctx.save();
    mctx.translate(i * 16, 0);
    MOBS[name](mctx);
    mctx.restore();
    mtex.add(name, 0, i * 16, 0, 16, 16);
  });
  mtex.refresh();

  const pc = document.createElement('canvas');
  pc.width = 48; pc.height = 64;
  const ctx = pc.getContext('2d');
  const tex = scene.textures.addCanvas('player', pc);
  DIRS.forEach((dir, row) => {
    for (let f = 0; f < 3; f++) {
      ctx.save();
      ctx.translate(f * 16, row * 16);
      drawPlayer(ctx, dir, f);
      ctx.restore();
      tex.add(dir + f, 0, f * 16, row * 16, 16, 16);
    }
  });
  tex.refresh();
}
