// Encapsulate to avoid polluting the global lexical env with duplicate const/let
(function () {
  // Fixed timestep with speed and pause
  const FIXED_DT = 1000 / 60;
  let accumulator = 0;

  function step(dt) {
    const state = window.state;
    const CONFIG = window.CONFIG;
    const clamp = window.clamp;
    const log = window.log;
    const aiThink = window.aiThink;
    const attack = window.attack;
    const attackCastle = window.attackCastle;
    const removeUnitById = window.removeUnitById;
    const updateProjectiles = window.updateProjectiles;
    const updateEffects = window.updateEffects;
    const renderUnits = window.renderUnits;
    const updateHUD = window.updateHUD;

    if (state.paused) return;
    const eff = (state.speedMultiplier || 1);
    const effDt = dt * eff;

    state.gold = state.gold + (CONFIG.goldRate * (effDt / 1000));
    state.aiGold = state.aiGold + (CONFIG.aiGoldRate * (effDt / 1000));
    state.time += effDt / 1000;

    const heroOnField = state.units.some(u => u.owner === 'player' && u.defName === 'hero');
    if (!state.heroActive && !heroOnField && state.heroRespawnTimer > 0) {
      state.heroRespawnTimer -= dt;
      if (state.heroRespawnTimer <= 0) { state.heroActive = true; log('Hero is available again'); }
    }

    aiThink(effDt);

    for (const u of state.units.slice()) {
      // regen per tick
      if (u.resource < u.resourceMax && u.resourceRegenPerSec > 0) {
        u.resource = clamp(u.resource + u.resourceRegenPerSec * (effDt / 1000), 0, u.resourceMax);
      }
      const speed = u.def.speed * 60 * (effDt / 1000);
      const range = u.def.range || 60;
      const enemies = state.units.filter(o => o.owner !== u.owner);
      const inFront = enemies.find(e => (u.dir === 1 && e.x > u.x && e.x - u.x <= range) || (u.dir === -1 && u.x > e.x && u.x - e.x <= range));
      if (inFront) {
        if (state.time * 1000 - u.lastAttack > u.attackDelay) {
          attack(u, inFront);
          u.lastAttack = state.time * 1000;
        }
      } else {
        if (u.owner === 'player') {
          const aiCastleX = CONFIG.battlefieldWidth - 40;
          const distToAiCastle = aiCastleX - u.x;
          // Ranged: hold position when in castle range and attack
          if (u.def.type !== 'melee' && distToAiCastle <= range) {
            if (state.time * 1000 - u.lastAttack > u.attackDelay) {
              attackCastle(u);
              u.lastAttack = state.time * 1000;
            }
          } else {
            // Move forward otherwise
            u.x += u.dir * speed;
            // Melee reach check
            if (u.def.type === 'melee' && u.x >= aiCastleX) {
              state.aiHP -= u.def.dmg;
              log(`${u.defName} hit AI castle for ${u.def.dmg}`);
              removeUnitById(u.id);
              continue;
            }
            // Clamp so units don't leave battlefield
            u.x = clamp(u.x, 0, aiCastleX);
          }
        } else {
          const playerCastleX = 40;
          const distToPlayerCastle = u.x - playerCastleX;
          if (u.def.type !== 'melee' && distToPlayerCastle <= range) {
            if (state.time * 1000 - u.lastAttack > u.attackDelay) {
              attackCastle(u);
              u.lastAttack = state.time * 1000;
            }
          } else {
            u.x += u.dir * speed;
            if (u.def.type === 'melee' && u.x <= playerCastleX) {
              state.playerHP -= u.def.dmg;
              log(`AI ${u.defName} hit your castle for ${u.def.dmg}`);
              removeUnitById(u.id);
              continue;
            }
            u.x = clamp(u.x, playerCastleX, CONFIG.battlefieldWidth);
          }
        }
      }
      if (u.curHp <= 0) {
        removeUnitById(u.id);
      }
    }

    updateProjectiles(effDt);
    updateEffects && updateEffects(effDt);

    if (state.playerHP <= 0 || state.aiHP <= 0) {
      endGame();
    }

    renderUnits();
    updateHUD();
  }

  window.startGame = function startGame() {
    const UNIT_DEFS = window.UNIT_DEFS;
    const state = window.state;
    const log = window.log;
    const sfx = window.sfx;
    const spawnUnit = window.spawnUnit;
    const initBattlefield = window.initBattlefield;
    const updateHUD = window.updateHUD;
    const renderUnits = window.renderUnits;
    const gainHeroExp = window.gainHeroExp;

    initBattlefield();
    if (sfx && sfx.spawn) sfx.spawn();
    updateHUD();
    renderUnits();

    let last = performance.now();
    function loop(now) {
      const dt = now - last; last = now; accumulator += dt;
      while (accumulator >= FIXED_DT) { step(FIXED_DT); accumulator -= FIXED_DT; }
      if (!state.ended) requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    document.querySelectorAll('.card').forEach(c => {
      c.addEventListener('click', () => {
        const def = c.dataset.unit;
        const cost = UNIT_DEFS[def].cost;
        if (def === 'hero' && !state.heroActive) { log('Hero on cooldown'); return; }
        if (state.gold >= cost) {
          state.gold -= cost;
          spawnUnit('player', def);
          gainHeroExp(Math.round(cost * 0.05));
          if (sfx && sfx.spawn) sfx.spawn();
        } else { log('Not enough gold'); }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'g') { state.gold += 1000; }
      if (e.key === 'k') { state.aiHP -= 200; }
    });
  }

  function endGame() {
    const state = window.state;
    const log = window.log;
    const sfx = window.sfx;
    state.ended = true;
    try { localStorage.removeItem('ccam_save'); } catch (_) { }

    const overlay = document.getElementById('game-over-overlay');
    const title   = document.getElementById('game-over-title');
    const msg     = document.getElementById('game-over-msg');

    if (state.playerHP <= 0) {
      log('Defeat! Your castle fell.');
      if (sfx && sfx.defeat) sfx.defeat();
      if (overlay && title && msg) {
        title.textContent = 'Defeat!';
        title.className   = 'defeat';
        msg.textContent   = 'Your castle has fallen. Try again!';
        overlay.style.display = 'flex';
      }
    } else {
      log('Victory! Enemy castle destroyed.');
      if (sfx && sfx.victory) sfx.victory();
      if (overlay && title && msg) {
        title.textContent = 'Victory!';
        title.className   = 'victory';
        msg.textContent   = 'The enemy castle lies in ruin!';
        overlay.style.display = 'flex';
      }
    }
  }
})();


