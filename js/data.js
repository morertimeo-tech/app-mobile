// Contenu du jeu : armes, objets, compétences, états, ennemis.

export const WEAPONS = {
  pipe: { name: 'Tuyau rouillé', atk: 2 },
  machete: { name: 'Machette', atk: 4 },
  axe: { name: "Hache d'incendie", atk: 6 },
  blade: { name: 'Lame du Ferrailleur', atk: 8 },
};

export const ITEMS = {
  bandage: { name: 'Bandage', desc: '+15 PV, stoppe le saignement' },
  food: { name: 'Conserve', desc: '+8 PV, +5 énergie' },
  antidote: { name: 'Antidote', desc: 'Soigne poison et irradiation' },
};

export const SKILLS = [
  { id: 'shot', name: 'Tir', lvl: 1, ammo: 1, en: 0 },
  { id: 'heavy', name: 'Coup violent', lvl: 1, ammo: 0, en: 4 },
  { id: 'aid', name: 'Premiers soins', lvl: 3, ammo: 0, en: 5 },
  { id: 'stun', name: 'Coup étourdissant', lvl: 5, ammo: 0, en: 6 },
];

export const STATUS = {
  bleed: { name: 'Saignement', dmg: 2, turns: 3 },
  poison: { name: 'Poison', dmg: 3, turns: 3 },
  rad: { name: 'Irradiation', dmg: 0, turns: 4 },   // attaque réduite de 25 %
  stun: { name: 'Étourdi', dmg: 0, turns: 1 },
};

// Coups ennemis. t: 'atk' | 'guard' | 'heal'. m: multiplicateur de dégâts. w: poids du tirage.
// big: grosse attaque annoncée (se défendre est rentable). st/p: état infligé et sa probabilité.
export const ENEMIES = {
  rat: {
    name: 'Rat mutant', sprite: 'rat', hp: 12, atk: 4, def: 0, spd: 7, xp: 5, scrap: [1, 3],
    moves: [{ n: 'Morsure', t: 'atk', m: 1, w: 3 }, { n: 'Morsure infectée', t: 'atk', m: 0.8, w: 1, st: 'poison', p: 0.4 }],
  },
  dog: {
    name: 'Chien errant', sprite: 'dog', hp: 18, atk: 6, def: 1, spd: 8, xp: 8, scrap: [1, 4],
    moves: [{ n: 'Morsure', t: 'atk', m: 1, w: 3 }, { n: 'Lacération', t: 'atk', m: 0.9, w: 2, st: 'bleed', p: 0.5 }],
  },
  raider: {
    name: 'Pillard', sprite: 'raider', hp: 26, atk: 8, def: 2, spd: 5, xp: 14, scrap: [4, 9],
    moves: [{ n: 'Coup de batte', t: 'atk', m: 1, w: 3 }, { n: 'Tir à bout portant', t: 'atk', m: 1.7, w: 1, big: true }, { n: 'Se protège', t: 'guard', w: 1 }],
  },
  ghoul: {
    name: 'Goule irradiée', sprite: 'ghoul', hp: 34, atk: 9, def: 2, spd: 3, xp: 20, scrap: [2, 6],
    moves: [{ n: 'Griffes', t: 'atk', m: 1, w: 3 }, { n: 'Souffle irradié', t: 'atk', m: 0.6, w: 2, st: 'rad', p: 0.7 }, { n: 'Charge', t: 'atk', m: 1.8, w: 1, big: true }],
  },
  drone: {
    name: 'Drone détraqué', sprite: 'drone', hp: 22, atk: 9, def: 4, spd: 9, xp: 18, scrap: [5, 10],
    moves: [{ n: 'Laser', t: 'atk', m: 1, w: 3 }, { n: 'Surcharge', t: 'atk', m: 1.8, w: 1, big: true }, { n: 'Auto-réparation', t: 'heal', h: 6, w: 1 }],
  },

  // Boss : un par ville. Les phases s'enchaînent quand la vie passe sous le seuil "below".
  sentinel: {
    name: 'Sentinelle K-7', sprite: 'drone', tint: 0x9fd0ff, boss: true, city: 2,
    hp: 80, atk: 10, def: 5, spd: 6, xp: 60, scrap: [30, 40], drop: 'axe',
    phases: [
      { below: 1, moves: [{ n: 'Laser', t: 'atk', m: 1, w: 3 }, { n: 'Balayage', t: 'atk', m: 1.3, w: 1 }] },
      { below: 0.5, msg: 'La Sentinelle active son bouclier et surchauffe !', atk: 1.2,
        moves: [{ n: 'Bouclier', t: 'guard', w: 2 }, { n: 'Surcharge', t: 'atk', m: 1.9, w: 2, big: true }, { n: 'Laser', t: 'atk', m: 1, w: 2 }] },
    ],
  },
  scrapper: {
    name: 'Le Ferrailleur', sprite: 'raider', tint: 0xff9a6a, boss: true, city: 0,
    hp: 100, atk: 11, def: 3, spd: 5, xp: 90, scrap: [40, 55], drop: 'blade',
    phases: [
      { below: 1, moves: [{ n: 'Coup de masse', t: 'atk', m: 1, w: 3 }, { n: 'Tir', t: 'atk', m: 1.5, w: 1, big: true }, { n: 'Se protège', t: 'guard', w: 1 }] },
      { below: 0.6, msg: 'Le Ferrailleur sort sa lame : ses coups font saigner !', atk: 1.15,
        moves: [{ n: 'Entaille', t: 'atk', m: 1, w: 3, st: 'bleed', p: 0.6 }, { n: 'Tir', t: 'atk', m: 1.5, w: 1, big: true }] },
      { below: 0.25, msg: 'Le Ferrailleur entre en rage !', atk: 1.4,
        moves: [{ n: 'Déchaînement', t: 'atk', m: 1.2, w: 2 }, { n: 'Coup fatal', t: 'atk', m: 2, w: 1, big: true }] },
    ],
  },
  mother: {
    name: 'Mère des goules', sprite: 'ghoul', tint: 0xd0ff9a, boss: true, city: 1,
    hp: 130, atk: 12, def: 3, spd: 3, xp: 130, scrap: [50, 70], drop: 'serum',
    phases: [
      { below: 1, moves: [{ n: 'Griffes', t: 'atk', m: 1, w: 3 }, { n: 'Souffle irradié', t: 'atk', m: 0.6, w: 2, st: 'rad', p: 0.8 }] },
      { below: 0.6, msg: 'La Mère des goules se régénère dans la boue toxique !', atk: 1.1,
        moves: [{ n: 'Régénération', t: 'heal', h: 14, w: 2 }, { n: 'Crachat toxique', t: 'atk', m: 0.9, w: 2, st: 'poison', p: 0.7 }, { n: 'Griffes', t: 'atk', m: 1, w: 2 }] },
      { below: 0.3, msg: 'La Mère des goules hurle : frénésie !', atk: 1.35,
        moves: [{ n: 'Frénésie', t: 'atk', m: 1.1, w: 3 }, { n: 'Charge', t: 'atk', m: 1.9, w: 1, big: true }] },
    ],
  },
};

export const BOSSES = ['scrapper', 'mother', 'sentinel'];
