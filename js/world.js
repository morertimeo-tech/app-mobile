// Génération du monde. La graine est fixe : le monde est identique à chaque lancement,
// ce qui permet de placer plus tard des quêtes et des lieux à des endroits précis.
import { T } from './tiles.js';
import { fbm, hash2 } from './rng.js';

export const W = 256, H = 256;
export const SEED = 1337;

export const BIOME = { TOXIC: 0, MUD: 1, DESERT: 2, WASTE: 3, PLAIN: 4, FOREST: 5, ASH: 6, CAMP: 7, CITY: 16 };
const NAMES = ['Marais toxique', 'Berges boueuses', 'Désert', 'Terres arides', 'Plaine morte', 'Forêt morte', 'Champ de cendres', 'Camp des rescapés'];

const CX = W >> 1, CY = H >> 1;
export const CITIES = [
  { name: 'Ruines de Port-Gris', x: CX + 52, y: CY - 34, r: 24 },
  { name: 'Ruines de Valmort', x: CX - 62, y: CY + 48, r: 20 },
  { name: 'Station Kessel', x: CX - 24, y: CY - 78, r: 14 },
];

export function biomeName(id) {
  return id >= BIOME.CITY ? CITIES[id - BIOME.CITY].name : NAMES[id];
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function generate(seed = SEED) {
  const ground = new Int16Array(W * H);
  const objects = new Int16Array(W * H).fill(-1);
  const biome = new Uint8Array(W * H);

  const pick = (base, n, x, y) => T[base + ((hash2(x, y, seed + 7) * n) | 0)];
  const clearObj = (i) => {
    if (objects[i] === T.carL && objects[i + 1] === T.carR) objects[i + 1] = -1;
    if (objects[i] === T.carR && objects[i - 1] === T.carL) objects[i - 1] = -1;
    objects[i] = -1;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const r = hash2(x, y, seed + 3);
      const edge = Math.max(Math.abs(x - CX) / CX, Math.abs(y - CY) / CY);
      const dc = Math.hypot(x - CX, y - CY);

      let e = (fbm(x / 44, y / 44, seed) - 0.5) * 2.4 + 0.5 - smooth(0.88, 1, edge) * 1.2;
      e = Math.max(e, 0.6 * (1 - smooth(8, 16, dc)));
      for (const c of CITIES) e = Math.max(e, 0.5 * (1 - smooth(c.r, c.r + 6, Math.hypot(x - c.x, y - c.y))));
      const m = (fbm(x / 60 + 300, y / 60 + 300, seed + 1) - 0.5) * 2.4 + 0.5;
      const a = (fbm(x / 36 + 700, y / 36 + 700, seed + 2) - 0.5) * 2.4 + 0.5;

      let b;
      if (e < 0.14) b = BIOME.TOXIC;
      else if (e < 0.19) b = BIOME.MUD;
      else if (a > 0.86) b = BIOME.ASH;
      else if (m < 0.08) b = BIOME.DESERT;
      else if (m < 0.29) b = BIOME.WASTE;
      else if (m < 0.52) b = BIOME.PLAIN;
      else b = BIOME.FOREST;

      let city = -1;
      if (b !== BIOME.TOXIC) {
        for (let k = 0; k < CITIES.length; k++) {
          const c = CITIES[k];
          const wob = (fbm(x / 9, y / 9, seed + 20 + k) - 0.5) * 10;
          if (Math.hypot(x - c.x, y - c.y) < c.r + wob) { city = k; break; }
        }
      }

      const taken = objects[i] !== -1; // moitié droite d'une épave déjà posée
      const put = (key) => { if (!taken) objects[i] = T[key]; };
      const putCar = () => {
        if (!taken && x < W - 2) { objects[i] = T.carL; objects[i + 1] = T.carR; }
      };

      if (city >= 0) {
        b = BIOME.CITY + city;
        const c = CITIES[city];
        const lx = (((x - c.x) % 12) + 12) % 12, ly = (((y - c.y) % 12) + 12) % 12;
        const bx = Math.floor((x - c.x) / 12), by = Math.floor((y - c.y) / 12);
        if (lx < 2 || ly < 2) {
          ground[i] = pick('road', 3, x, y);
          if (r < 0.015) putCar(); else if (r < 0.05) put('debris'); else if (r < 0.058) put('rubble');
        } else {
          const u = lx - 2, v = ly - 2;
          const kind = hash2(bx, by, seed + 11);
          if (kind < 0.6) {
            if (u >= 1 && u <= 8 && v >= 1 && v <= 8) {
              ground[i] = pick('floor', 2, x, y);
              const isEdge = u === 1 || u === 8 || v === 1 || v === 8;
              const door = v === 8 && (u === 4 || u === 5);
              if (isEdge) {
                if (door) { /* entrée */ } else if (r < 0.12) put('debris'); else if (r < 0.35) put('wallb'); else put('wall');
              } else if (r < 0.05) put('crate'); else if (r < 0.08) put('barrel'); else if (r < 0.12) put('rubble'); else if (r < 0.17) put('debris');
            } else {
              ground[i] = r < 0.5 ? T.floor1 : pick('dirt', 3, x, y);
              if (r < 0.025) put('lamp'); else if (r < 0.08) put('debris');
            }
          } else if (kind < 0.85) {
            ground[i] = r < 0.6 ? pick('dirt', 3, x, y) : pick('crack', 2, x, y);
            if (r < 0.09) put('rubble'); else if (r < 0.2) put('debris'); else if (r < 0.22) put('tree0'); else if (r < 0.27) put('bush');
          } else {
            ground[i] = pick('road', 3, x, y);
            if (r < 0.06) putCar(); else if (r < 0.08) put('barrel');
          }
        }
      } else {
        switch (b) {
          case BIOME.TOXIC:
            ground[i] = pick('toxic', 2, x, y);
            break;
          case BIOME.MUD:
            ground[i] = pick('mud', 2, x, y);
            if (r < 0.015) put('barrel'); else if (r < 0.05) put('tuft'); else if (r < 0.06) put('bones');
            break;
          case BIOME.DESERT:
            ground[i] = pick('sand', 2, x, y);
            if (r < 0.015) put('cactus'); else if (r < 0.025) put('rock'); else if (r < 0.033) put('bones'); else if (r < 0.05) put('bush');
            break;
          case BIOME.WASTE:
            ground[i] = r > 0.7 ? pick('crack', 2, x, y) : pick('dirt', 3, x, y);
            if (r < 0.02) put('rock'); else if (r < 0.03) put('tree0'); else if (r < 0.05) put('bush');
            else if (r < 0.055) put('bones'); else if (r < 0.06) put('rubble'); else if (r < 0.062) putCar();
            break;
          case BIOME.PLAIN:
            ground[i] = pick('grass', 3, x, y);
            if (r < 0.08) put('tuft'); else if (r < 0.1) put('tree1'); else if (r < 0.13) put('bush'); else if (r < 0.135) put('rock');
            break;
          case BIOME.FOREST:
            ground[i] = pick('grass', 3, x, y);
            if (r < 0.11) put('tree0'); else if (r < 0.22) put('tree1'); else if (r < 0.25) put('stump'); else if (r < 0.3) put('tuft');
            break;
          default: // cendres
            ground[i] = pick('ash', 2, x, y);
            if (r < 0.03) put('stump'); else if (r < 0.04) put('rock'); else if (r < 0.05) put('bones'); else if (r < 0.07) put('tree1');
        }
      }
      biome[i] = b;
    }
  }

  // Vieilles routes reliant le camp aux ruines : elles guident le joueur
  // et garantissent que chaque ville est accessible à pied.
  for (const c of CITIES) {
    const dx = c.x - CX, dy = c.y - CY;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    const steps = Math.ceil(len * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const wob = Math.sin(t * Math.PI * 3) * 7 * Math.sin(t * Math.PI);
      const px = Math.round(CX + dx * t + nx * wob), py = Math.round(CY + dy * t + ny * wob);
      for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) {
        const x = px + ox, y = py + oy;
        if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
        const i = y * W + x;
        if (biome[i] >= BIOME.CITY) continue;
        ground[i] = hash2(x, y, seed + 31) < 0.5 ? T.road2 : T.road1;
        clearObj(i);
        if (biome[i] === BIOME.TOXIC || biome[i] === BIOME.MUD) biome[i] = BIOME.WASTE;
      }
    }
  }

  // Camp de départ, posé à la main au centre de la carte.
  for (let y = CY - 6; y <= CY + 6; y++) for (let x = CX - 6; x <= CX + 6; x++) {
    const d = Math.hypot(x - CX, y - CY);
    if (d > 6.5) continue;
    const i = y * W + x;
    biome[i] = BIOME.CAMP;
    if (d <= 5) { clearObj(i); ground[i] = pick('dirt', 3, x, y); }
  }
  const place = (dx, dy, key) => { objects[(CY + dy) * W + CX + dx] = T[key]; };
  place(0, -1, 'fire');
  place(-3, -2, 'tent'); place(3, -2, 'tent'); place(-3, 2, 'tent');
  place(3, 2, 'crate'); place(4, 2, 'crate'); place(-4, 0, 'barrel');

  return { ground, objects, biome, spawn: { x: CX, y: CY + 1 }, camp: { x: CX, y: CY } };
}
