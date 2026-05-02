window.refs = {
  goldEl:       document.getElementById('gold'),
  timeEl:       document.getElementById('time'),
  battle:       document.getElementById('battle'),
  logEl:        document.getElementById('log'),
  playerHpBar:  document.getElementById('player-hp'),
  aiHpBar:      document.getElementById('ai-hp'),
  playerHpText: document.getElementById('player-hp-text'),
  aiHpText:     document.getElementById('ai-hp-text'),
  aiGoldInfo:   document.getElementById('ai-gold'),
  heroLevelEl:  document.getElementById('hero-level'),
  heroExpText:  document.getElementById('hero-exp-text'),
  heroXpBar:    document.getElementById('hero-xp-bar'),
  heroHpStat:   document.getElementById('hero-hp-stat'),
  heroDmgStat:  document.getElementById('hero-dmg-stat'),
  heroSpdStat:  document.getElementById('hero-spd-stat'),
  castlePlayer: document.getElementById('castle-player'),
  castleAi:     document.getElementById('castle-ai'),
};

window.initBattlefield = function initBattlefield() {
  refs.battle.style.width  = window.CONFIG.battlefieldWidth + 'px';
  refs.battle.style.height = '420px';
};

window.clamp = function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); };

window.log = function log(msg) {
  const p = document.createElement('div');
  p.className = 'log-entry';
  // colour-code by content
  if (/died|defeat|fell/i.test(msg))              p.classList.add('log-kill');
  else if (/victory|destroyed/i.test(msg))         p.classList.add('log-level');
  else if (/leveled up/i.test(msg))                p.classList.add('log-level');
  else if (/castle|bombarded/i.test(msg))          p.classList.add('log-castle');
  else if (/^player /i.test(msg))                  p.classList.add('log-player');
  p.textContent = msg;
  refs.logEl.prepend(p);
  if (refs.logEl.childElementCount > 200) refs.logEl.removeChild(refs.logEl.lastChild);
};

function hpColor(pct) {
  return pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
}

window.updateHUD = function updateHUD() {
  const state   = window.state;
  const CONFIG  = window.CONFIG;

  refs.goldEl.textContent  = Math.floor(state.gold);
  refs.timeEl.textContent  = Math.floor(state.time);
  refs.aiGoldInfo.textContent = Math.floor(state.aiGold);

  // Player castle HP
  const playerPct = clamp(state.playerHP / CONFIG.castleHP, 0, 1);
  refs.playerHpBar.style.width      = (playerPct * 100) + '%';
  refs.playerHpBar.style.background = hpColor(playerPct);
  if (refs.playerHpText) refs.playerHpText.textContent = Math.max(0, Math.round(state.playerHP));

  // AI castle HP (starts at 2000, CONFIG.castleHP = 1000 → track separately)
  const aiMax  = 2000;
  const aiPct  = clamp(state.aiHP / aiMax, 0, 1);
  refs.aiHpBar.style.width      = (aiPct * 100) + '%';
  refs.aiHpBar.style.background = hpColor(aiPct);
  if (refs.aiHpText) refs.aiHpText.textContent = Math.max(0, Math.round(state.aiHP));

  // Castle damage classes
  if (refs.castlePlayer) {
    refs.castlePlayer.classList.toggle('damaged',  playerPct < 0.5 && playerPct >= 0.25);
    refs.castlePlayer.classList.toggle('critical', playerPct < 0.25);
  }
  if (refs.castleAi) {
    refs.castleAi.classList.toggle('damaged',  aiPct < 0.5 && aiPct >= 0.25);
    refs.castleAi.classList.toggle('critical', aiPct < 0.25);
  }

  // Hero panel
  refs.heroLevelEl.textContent = state.heroLevel;
  refs.heroExpText.textContent = `${Math.floor(state.heroExp)}/${state.heroExpToNext}`;
  refs.heroXpBar.style.width   = clamp(state.heroExp / state.heroExpToNext * 100, 0, 100) + '%';

  const heroDef = window.getScaledHeroDef
    ? window.getScaledHeroDef(window.UNIT_DEFS.hero, state.heroLevel)
    : window.UNIT_DEFS.hero;
  refs.heroHpStat.textContent  = Math.round(heroDef.hp);
  refs.heroDmgStat.textContent = Math.round(heroDef.dmg);
  refs.heroSpdStat.textContent = heroDef.speed.toFixed(1);

  updateCardStates();
};

window.updateCardStates = function updateCardStates() {
  document.querySelectorAll('.card').forEach(card => {
    const unitKey = card.dataset.unit;
    if (!unitKey || !window.UNIT_DEFS) return;
    const cost      = window.UNIT_DEFS[unitKey].cost;
    const canAfford = window.state.gold >= cost;
    const available = unitKey === 'hero' ? window.state.heroActive : true;
    if (!canAfford || !available) card.classList.add('cool');
    else                          card.classList.remove('cool');
  });
};

// Emoji map for unit types
const UNIT_ICONS = {
  swordsman:   '⚔️',
  archer:      '🏹',
  mage:        '🔮',
  supreme:     '✨',
  hero:        '⭐',
  tank:        '🛡️',
  assassin:    '🗡️',
  necromancer: '💀',
  giant:       '🗿',
  skeleton:    '☠️',
};

window.renderUnits = function renderUnits() {
  const battle = refs.battle;
  battle.innerHTML = '';

  for (const u of window.state.units) {
    const el = document.createElement('div');
    el.className = 'unit ' + u.defName + (u.owner === 'ai' ? ' ai-unit' : '');
    el.style.left = (u.x - window.CONFIG.unitSize / 2) + 'px';

    // Emoji icon
    const icon = document.createElement('span');
    icon.textContent = UNIT_ICONS[u.defName] || u.defName[0].toUpperCase();
    el.appendChild(icon);

    // HP number badge
    const badge = document.createElement('div');
    badge.className = 'unit-badge';
    badge.textContent = Math.max(0, Math.round(u.curHp));
    if (u.owner === 'ai') badge.style.transform = 'scaleX(-1)'; // un-flip text for AI units
    el.appendChild(badge);

    // HP bar
    const hpBar = document.createElement('div');
    hpBar.className = 'unit-hpbar';
    const hpFill = document.createElement('div');
    hpFill.className = 'unit-hpfill';
    const hpPct = clamp(u.curHp / u.def.hp, 0, 1);
    hpFill.style.width      = (hpPct * 100) + '%';
    hpFill.style.background = hpColor(hpPct);
    hpBar.appendChild(hpFill);
    if (u.owner === 'ai') hpBar.style.transform = 'scaleX(-1)';
    el.appendChild(hpBar);

    // Resource bar
    const rsBar = document.createElement('div');
    rsBar.className = 'unit-rsbar';
    const rsFill = document.createElement('div');
    rsFill.className = 'unit-rsfill';
    rsFill.style.width      = clamp(u.resource / u.resourceMax * 100, 0, 100) + '%';
    rsFill.style.background = u.resourceType === 'mana' ? '#60a5fa' : '#f59e0b';
    rsBar.appendChild(rsFill);
    if (u.owner === 'ai') rsBar.style.transform = 'scaleX(-1)';
    el.appendChild(rsBar);

    battle.appendChild(el);
  }

  // Projectiles
  for (const p of window.state.projectiles) {
    const el = document.createElement('div');
    el.className = 'projectile ' + p.kind;
    el.style.left   = (p.x - 4) + 'px';
    el.style.bottom = (80 + 20) + 'px';
    battle.appendChild(el);
  }

  // Effects
  for (const fx of window.state.effects) {
    if (fx.type === 'impact') {
      const t   = 1 - (fx.life / fx.maxLife);
      const el  = document.createElement('div');
      el.className     = 'impact';
      el.style.left    = (fx.x - fx.size / 2) + 'px';
      el.style.bottom  = (80 + 20) + 'px';
      el.style.width   = fx.size + 'px';
      el.style.height  = fx.size + 'px';
      el.style.background = fx.color;
      el.style.transform  = `scale(${0.6 + 0.8 * t})`;
      el.style.opacity    = String(clamp(1 - t, 0, 1));
      battle.appendChild(el);
    } else if (fx.type === 'dmg') {
      const t  = 1 - (fx.life / fx.maxLife);
      const el = document.createElement('div');
      el.textContent       = String(Math.round(fx.amount));
      el.style.position    = 'absolute';
      el.style.left        = fx.x + 'px';
      el.style.bottom      = (80 + 20 + t * 38) + 'px';
      el.style.pointerEvents = 'none';
      el.style.color       = fx.crit ? '#ffd166' : '#ffffff';
      el.style.textShadow  = '0 1px 3px rgba(0,0,0,.65)';
      el.style.fontWeight  = '700';
      el.style.fontSize    = fx.crit ? '17px' : '14px';
      el.style.opacity     = String(clamp(1 - t, 0, 1));
      battle.appendChild(el);
    }
  }
};
