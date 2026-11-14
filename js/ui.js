// Petits composants d'interface. Chaque écran garde ses objets dans scene.items
// et les reconstruit entièrement à chaque changement (simple et sans état caché).

const FONT = 'monospace';

export function clear(scene) {
  for (const o of scene.items || []) o.destroy();
  scene.items = [];
}

export function label(scene, x, y, text, size, color = '#e8dfc8', extra = {}) {
  const t = scene.add.text(x, y, text, { fontFamily: FONT, fontSize: Math.round(size) + 'px', color, ...extra });
  scene.items.push(t);
  return t;
}

export function button(scene, x, y, w, h, text, onTap, disabled = false) {
  const bg = scene.add.rectangle(x, y, w, h, 0x2a2520, 0.95).setOrigin(0)
    .setStrokeStyle(Math.max(2, h * 0.035), 0xc9b98a, disabled ? 0.25 : 0.9);
  const size = Math.min(h * 0.4, (w * 1.5) / Math.max(4, text.length));
  const t = scene.add.text(x + w / 2, y + h / 2, text, {
    fontFamily: FONT, fontSize: Math.round(size) + 'px', color: disabled ? '#756f63' : '#e8dfc8',
  }).setOrigin(0.5);
  if (!disabled) {
    bg.setInteractive();
    // Différé d'une image : le bouton peut être détruit par sa propre action.
    bg.on('pointerdown', () => scene.time.delayedCall(0, onTap));
  }
  scene.items.push(bg, t);
  return bg;
}

export function bar(scene, x, y, w, h, frac, color, text) {
  const f = Math.max(0, Math.min(1, frac));
  const bg = scene.add.rectangle(x, y, w, h, 0x000000, 0.7).setOrigin(0).setStrokeStyle(Math.max(1, h * 0.06), 0xc9b98a, 0.6);
  const fill = scene.add.rectangle(x, y, Math.max(0.001, w * f), h, color).setOrigin(0);
  const t = scene.add.text(x + w / 2, y + h / 2, text, {
    fontFamily: FONT, fontSize: Math.round(Math.min(h * 0.7, (w * 1.5) / Math.max(4, text.length))) + 'px', color: '#ffffff',
  }).setOrigin(0.5);
  scene.items.push(bg, fill, t);
}
