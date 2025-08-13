window.refs = {
  goldEl: document.getElementById('gold'),
  timeEl: document.getElementById('time'),
  battle: document.getElementById('battle'),
  logEl: document.getElementById('log'),
  playerHpBar: document.getElementById('player-hp'),
  aiHpBar: document.getElementById('ai-hp'),
  aiGoldInfo: document.getElementById('ai-gold'),
  heroLevelEl: document.getElementById('hero-level'),
  heroExpText: document.getElementById('hero-exp-text'),
  heroXpBar: document.getElementById('hero-xp-bar'),
  heroHpStat: document.getElementById('hero-hp-stat'),
  heroDmgStat: document.getElementById('hero-dmg-stat'),
  heroSpdStat: document.getElementById('hero-spd-stat')
};

window.initBattlefield = function initBattlefield() {
  refs.battle.style.width = window.CONFIG.battlefieldWidth + 'px';
  refs.battle.style.height = '385px';
}

window.log = function log(msg) {
  const p = document.createElement('div');
  p.textContent = msg;
  refs.logEl.prepend(p);
  if (refs.logEl.childElementCount > 200) refs.logEl.removeChild(refs.logEl.lastChild);
}

window.clamp = function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

window.updateHUD = function updateHUD() {
  refs.goldEl.textContent = Math.floor(state.gold);
  refs.timeEl.textContent = Math.floor(state.time);
  refs.playerHpBar.style.width = clamp(state.playerHP / window.CONFIG.castleHP * 100, 0, 100) + '%';
  refs.aiGoldInfo.innerHTML = Math.floor(state.aiGold);
  refs.aiHpBar.style.width = clamp(state.aiHP / window.CONFIG.castleHP * 100, 0, 100) + '%';
  refs.heroLevelEl.textContent = state.heroLevel;
  refs.heroExpText.textContent = `${Math.floor(state.heroExp)}/${state.heroExpToNext}`;
  refs.heroXpBar.style.width = clamp(state.heroExp / state.heroExpToNext * 100, 0, 100) + '%';

  // Update hero stats based on current level
  const heroDef = window.getScaledHeroDef ? window.getScaledHeroDef(window.UNIT_DEFS.hero, state.heroLevel) : window.UNIT_DEFS.hero;
  refs.heroHpStat.textContent = Math.round(heroDef.hp);
  refs.heroDmgStat.textContent = Math.round(heroDef.dmg);
  refs.heroSpdStat.textContent = heroDef.speed.toFixed(1);

  updateCardStates();
}

window.updateCardStates = function updateCardStates() {
  document.querySelectorAll('.card').forEach(card => {
    const unitKey = card.dataset.unit;
    const cost = window.UNIT_DEFS ? window.UNIT_DEFS[unitKey].cost : 0;
    let canAfford = state.gold >= cost;
    let available = true;
    if (unitKey === 'hero') available = state.heroActive;
    if (!canAfford || !available) card.classList.add('cool'); else card.classList.remove('cool');
  });
}

window.renderUnits = function renderUnits() {
  refs.battle.innerHTML = '';
  for (const u of state.units) {
    const el = document.createElement('div');
    el.className = `unit ${u.defName}` + (u.defName === 'hero' ? ' hero' : '');
    el.style.left = (u.x - window.CONFIG.unitSize / 2) + 'px';
    el.style.bottom = '80px';
    el.innerHTML = renderUnitInner(u);
    // badges with numeric HP and resource
    const hpBadge = document.createElement('div');
    hpBadge.style.position = 'absolute';
    hpBadge.style.top = '-14px';
    hpBadge.style.left = '2px';
    hpBadge.style.padding = '0 3px';
    hpBadge.style.borderRadius = '3px';
    hpBadge.style.fontSize = '10px';
    hpBadge.style.lineHeight = '12px';
    hpBadge.style.background = 'rgba(0,0,0,0.45)';
    hpBadge.style.color = '#fff';
    hpBadge.style.zIndex = '3';
    hpBadge.textContent = String(Math.max(0, Math.round(u.curHp)));

    const rsBadge = document.createElement('div');
    rsBadge.style.position = 'absolute';
    rsBadge.style.top = '-14px';
    rsBadge.style.right = '2px';
    rsBadge.style.padding = '0 3px';
    rsBadge.style.borderRadius = '3px';
    rsBadge.style.fontSize = '10px';
    rsBadge.style.lineHeight = '12px';
    rsBadge.style.background = u.resourceType === 'mana' ? 'rgba(96,165,250,0.35)' : 'rgba(245,158,11,0.35)';
    rsBadge.style.color = '#fff';
    rsBadge.style.zIndex = '3';
    // add inline HUD bars (HP + resource)
    const hp = document.createElement('div');
    hp.className = 'bar hp';
    hp.style.width = '42px';
    hp.style.height = '4px';
    hp.style.position = 'absolute';
    hp.style.bottom = '-6px';
    hp.style.left = '3px';
    hp.style.background = 'rgba(255,255,255,0.25)';
    hp.style.borderRadius = '3px';
    const hpFill = document.createElement('div');
    hpFill.style.height = '100%';
    hpFill.style.width = Math.max(0, Math.min(100, (u.curHp / u.def.hp) * 100)) + '%';
    hpFill.style.background = '#22c55e';
    hpFill.style.borderRadius = '3px';
    hp.appendChild(hpFill);

    const rs = document.createElement('div');
    rs.className = 'bar rs';
    rs.style.width = '42px';
    rs.style.height = '3px';
    rs.style.position = 'absolute';
    rs.style.bottom = '-11px';
    rs.style.left = '3px';
    rs.style.background = 'rgba(255,255,255,0.2)';
    rs.style.borderRadius = '3px';
    const rsFill = document.createElement('div');
    rsFill.style.height = '100%';
    rsFill.style.width = Math.max(0, Math.min(100, (u.resource / u.resourceMax) * 100)) + '%';
    rsFill.style.background = (u.resourceType === 'mana') ? '#60a5fa' : '#f59e0b';
    rsFill.style.borderRadius = '3px';
    rs.appendChild(rsFill);

    el.appendChild(hpBadge);
    el.appendChild(rsBadge);
    el.appendChild(hp);
    el.appendChild(rs);
    refs.battle.appendChild(el);
  }
  // render projectiles
  for (const p of state.projectiles) {
    const el = document.createElement('div');
    el.className = `projectile ${p.kind}`;
    el.style.left = (p.x - 4) + 'px';
    el.style.bottom = (80 + 18) + 'px';
    refs.battle.appendChild(el);
  }
  // render effects
  for (const fx of state.effects) {
    if (fx.type === 'impact') {
      const el = document.createElement('div');
      const t = 1 - (fx.life / fx.maxLife);
      const scale = 0.6 + 0.8 * t;
      const opacity = 1 - t;
      el.className = 'impact';
      el.style.left = (fx.x - fx.size / 2) + 'px';
      el.style.bottom = (80 + 20) + 'px';
      el.style.width = fx.size + 'px';
      el.style.height = fx.size + 'px';
      el.style.background = fx.color;
      el.style.transform = `scale(${scale})`;
      el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
      refs.battle.appendChild(el);
    } else if (fx.type === 'dmg') {
      const t = 1 - (fx.life / fx.maxLife);
      const el = document.createElement('div');
      el.textContent = String(Math.round(fx.amount));
      el.style.position = 'absolute';
      el.style.left = (fx.x) + 'px';
      el.style.bottom = (80 + 20 + t * 36) + 'px';
      el.style.pointerEvents = 'none';
      el.style.color = fx.crit ? '#ffd166' : '#ffffff';
      el.style.textShadow = '0 1px 2px rgba(0,0,0,.6)';
      el.style.fontWeight = '700';
      el.style.fontSize = fx.crit ? '16px' : '14px';
      el.style.opacity = String(1 - t);
      refs.battle.appendChild(el);
    }
  }
}

function renderUnitInner(u) {
  switch (u.defName) {
    case 'swordsman':
      return '<span class="icon">S</span><span class="weapon sword swing"></span>';
    case 'archer':
      return '<span class="icon">A</span><span class="weapon bow draw"></span>';
    case 'mage':
      return '<span class="icon">M</span><span class="weapon staff glow"></span>';
    case 'supreme':
      return '<span class="icon">Σ</span><span class="weapon crystal"></span>';
    case 'hero':
      return '<span class="icon">H</span><span class="weapon blade swing"></span>';
    default:
      return u.owner === 'player' ? (u.defName[0] || '').toUpperCase() : (u.defName[0] || '');
  }
}


