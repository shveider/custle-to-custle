// Use window-scoped references at call time to avoid global const collisions

window.spawnProjectile = function spawnProjectile(kind, originX, dir, maxDistance = 160) {
  const speedByKind = { arrow: 420, bolt: 360, fire: 300 };
  const speed = speedByKind[kind] || 360;
  window.state.projectiles.push({ kind, x: originX, dir, speed, traveled: 0, maxDistance });
}

window.updateProjectiles = function updateProjectiles(dt) {
  const dxFactor = dt / 1000;
  for (const p of window.state.projectiles) {
    const dx = p.dir * p.speed * dxFactor;
    p.x += dx;
    p.traveled += Math.abs(dx);
  }
  window.state.projectiles = window.state.projectiles.filter(p => p.traveled < p.maxDistance && p.x >= 0 && p.x <= window.CONFIG.battlefieldWidth);
}

window.spawnImpact = function spawnImpact(x, kind = 'hit') {
  // kinds: 'hit', 'spark', 'magic'
  const lifeByKind = { hit: 220, spark: 180, magic: 260 };
  const sizeByKind = { hit: 10, spark: 8, magic: 12 };
  const colorByKind = {
    hit: 'radial-gradient(circle, rgba(255,255,255,.9), rgba(255,200,80,.6))',
    spark: 'radial-gradient(circle, rgba(255,255,180,.9), rgba(255,120,0,.6))',
    magic: 'radial-gradient(circle, rgba(210,200,255,.95), rgba(120,80,255,.6))'
  };
  window.state.effects.push({
    type: 'impact',
    x,
    life: lifeByKind[kind] || 200,
    maxLife: lifeByKind[kind] || 200,
    size: sizeByKind[kind] || 10,
    color: colorByKind[kind] || colorByKind.hit
  });
}

window.updateEffects = function updateEffects(dt) {
  for (const e of state.effects) {
    e.life -= dt;
  }
  state.effects = state.effects.filter(e => e.life > 0);
}

// Floating damage numbers
window.spawnDamageNumber = function spawnDamageNumber(x, amount, crit = false) {
  window.state.effects.push({
    type: 'dmg', x, life: 800, maxLife: 800,
    amount, crit
  });
}


