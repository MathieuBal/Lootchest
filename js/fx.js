// Visual effects: particles, screen shake, floating damage numbers.

export function spawnParticles(color, x, y, count = 18, options = {}) {
  const { minSpeed = 80, maxSpeed = 220, size = 8, gravity = 200 } = options;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 40;
    const dur = 600 + Math.random() * 400;
    const finalY = dy + gravity * (dur / 1000);
    p.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px;
      width: ${size}px; height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size}px ${color};
      pointer-events: none; z-index: 150;
    `;
    document.body.appendChild(p);
    p.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${finalY}px) scale(0.2)`, opacity: 0 },
      ],
      { duration: dur, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' }
    ).onfinish = () => p.remove();
  }
}

export function explodeFromElement(el, color, count = 24, options) {
  const rect = el.getBoundingClientRect();
  spawnParticles(color, rect.left + rect.width / 2, rect.top + rect.height / 2, count, options);
}

export function screenShake(intensity = 6, duration = 250) {
  const root = document.documentElement;
  const start = Date.now();
  function tick() {
    const elapsed = Date.now() - start;
    if (elapsed >= duration) {
      root.style.transform = '';
      return;
    }
    const decay = 1 - elapsed / duration;
    const dx = (Math.random() - 0.5) * 2 * intensity * decay;
    const dy = (Math.random() - 0.5) * 2 * intensity * decay;
    root.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(tick);
  }
  tick();
}

export function floatingDamage(value, x, y, type = 'normal') {
  const el = document.createElement('div');
  el.className = `floating-damage ${type}`;
  el.textContent = (type === 'heal' ? '+' : '-') + Math.round(value);
  el.style.cssText = `
    position: fixed; left: ${x}px; top: ${y}px;
    pointer-events: none; z-index: 160;
    transform: translate(-50%, 0);
  `;
  document.body.appendChild(el);
  const driftX = (Math.random() - 0.5) * 40;
  el.animate(
    [
      { transform: 'translate(-50%, 0) scale(0.6)', opacity: 1 },
      { transform: `translate(calc(-50% + ${driftX}px), -30px) scale(1.2)`, opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${driftX}px), -90px) scale(1)`, opacity: 0 },
    ],
    { duration: 1000, easing: 'cubic-bezier(0.34, 1.4, 0.5, 1)' }
  ).onfinish = () => el.remove();
}

export function floatingText(text, x, y, color = '#fff') {
  const el = document.createElement('div');
  el.className = 'floating-damage';
  el.textContent = text;
  el.style.cssText = `
    position: fixed; left: ${x}px; top: ${y}px;
    color: ${color}; pointer-events: none; z-index: 160;
    transform: translate(-50%, 0);
  `;
  document.body.appendChild(el);
  el.animate(
    [
      { transform: 'translate(-50%, 0) scale(0.8)', opacity: 1 },
      { transform: 'translate(-50%, -80px) scale(1)', opacity: 0 },
    ],
    { duration: 1100, easing: 'ease-out' }
  ).onfinish = () => el.remove();
}
