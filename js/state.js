window.state = {
  gold: 1000,
  aiGold: 800,
  time: 0,
  playerHP: 1000,
  aiHP: 2000,
  units: [],
  projectiles: [],
  effects: [],
  nextId: 1,
  heroLevel: 1,
  heroExp: 0,
  heroExpToNext: 100,
  heroActive: true,
  heroRespawnTimer: 0,
  ended: false,
  // settings
  paused: false,
  speedMultiplier: 1,
  sfxEnabled: true
};

window.getScaledHeroDef = function getScaledHeroDef(baseDef, level) {
  const hp = baseDef.hp + (level - 1) * 40;
  const dmg = baseDef.dmg + (level - 1) * 6;

  return { ...baseDef, hp, dmg };
}

window.spawnUnit = function spawnUnit(owner, defName) {
  const baseDef = window.UNIT_DEFS[defName];
  const id = state.nextId++;
  const x = owner === 'player' ? 60 : (window.CONFIG.battlefieldWidth - 60);
  const dir = owner === 'player' ? 1 : -1;
  let def = { ...baseDef, special: baseDef.special ? { ...baseDef.special } : undefined };

  if (defName === 'hero' && owner === 'player') {
    def = getScaledHeroDef(def, state.heroLevel);
  }

  const unit = {
    id,
    owner,
    defName,
    def,
    x,
    dir,
    curHp: def.hp,
    lastAttack: 0,
    attackDelay: (def.special && def.special.attackDelay) ? def.special.attackDelay : 800,
    nextAttackTime: 0,
    resourceType: (def.resource && def.resource.type) || 'stamina',
    resourceMax: (def.resource && def.resource.max) || 100,
    resource: (def.resource && def.resource.max) || 100,
    resourceRegenPerSec: (def.resource && def.resource.regenPerSec) || 10,
    resourceCostPerAttack: (def.resource && def.resource.costPerAttack) || 10
  };

  if (def.special && def.special.unique) {
    if (state.units.some(u => u.owner === owner && u.defName === 'hero')) return null;
  }
  state.units.push(unit);

  return unit;
}

window.removeUnitById = function removeUnitById(id) {
  const unit = state.units.find(u => u.id === id);
  state.units = state.units.filter(u => u.id !== id);
  if (unit && unit.defName === 'hero' && unit.owner === 'player') {
    state.heroActive = false;
    state.heroRespawnTimer = 30000;
  }
}

// Persistence
window.saveProgress = function saveProgress() {
  try {
    const data = {
      heroLevel: state.heroLevel,
      heroExp: state.heroExp,
      heroExpToNext: state.heroExpToNext,
      sfxEnabled: state.sfxEnabled
    };
    localStorage.setItem('ccam_save', JSON.stringify(data));
  } catch (_) { }
}

window.loadProgress = function loadProgress() {
  try {
    const raw = localStorage.getItem('ccam_save');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.heroLevel === 'number') state.heroLevel = data.heroLevel;
    if (typeof data.heroExp === 'number') state.heroExp = data.heroExp;
    if (typeof data.heroExpToNext === 'number') state.heroExpToNext = data.heroExpToNext;
    if (typeof data.sfxEnabled === 'boolean') state.sfxEnabled = data.sfxEnabled;
  } catch (_) { }
}


