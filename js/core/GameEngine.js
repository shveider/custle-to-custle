"use strict";
import { Castle } from '../entities/Castle.js';
import { GameEvents } from './Events.js';
import { GameBalance } from './GameBalance.js';

export class GameEngine {
    constructor(game, engineConfig) {
        this.game = game;
        this._logEl = engineConfig.logEl;
        this._unitClasses = engineConfig.unitClasses;
    }

    bootstrap() {
        const game = this.game;
        const cfg = game.config;

        this._createCastles();
        this._registerUnits();

        const defense = cfg.castleDefenseSystem;
        const hud = cfg.hud;
        const renderer = cfg.unitRenderer;
        const roster = cfg.unitRoster;
        const cards = cfg.cardDeck;

        game.events.on(GameEvents.TICK, (dt, time) => {
            this._updateUnits(dt, time * 1000);
            defense.update(time * 1000);

            const dead = game.entities.units.filter(u => u.curHp <= 0 && !u._animEnd);
            for (const u of dead) {
                u.triggerAnim('dying', 400, time * 1000);
            }

            this._checkWinCondition();

            renderer.render();
            hud.update();
            cards.update();
            roster.update();
        });

        game.events.on(GameEvents.UNIT_ATTACK, (attacker) => {
            attacker.triggerAnim('attacking', 250, this.game.time * 1000);
        });

        game.events.on(GameEvents.UNIT_HEAL, (healer) => {
            healer.triggerAnim('attacking', 250, this.game.time * 1000);
        });

        game.events.on(GameEvents.COMBAT_HIT, (attacker, target) => {
            target.triggerAnim('hit', 150, this.game.time * 1000);
        });

        game.events.on(GameEvents.EVENT_LOG, (msg) => this._log(msg));

        game.events.on(GameEvents.UNIT_KILLED, (attacker, target) => {
            this._log((attacker.isCastle ? 'Castle' : attacker.owner) + ' killed ' + target.defName);
        });

        game.events.on(GameEvents.COMBAT_CASTLE_HIT, (attacker, castleOwner, dmg) => {
            this._log((attacker.owner === 'player' ? '' : 'AI ') + attacker.defName + ' bombarded castle for ' + dmg);
        });

        game.events.on(GameEvents.COMBAT_BLOCKED, (target) => {
            this._log(target.owner + ' ' + target.defName + ' blocked the attack!');
        });

        game.events.on(GameEvents.COMBAT_CRIT, (attacker, target, dmg) => {
            this._log(attacker.defName + ' critical strike for ' + Math.round(dmg) + '!');
        });

        game.events.on(GameEvents.COMBAT_HEAL, (healer, targets, amount) => {
            this._log(healer.owner + ' healer restored ' + amount + ' HP to ' + targets.length + ' ally(s)');
        });

        game.events.on(GameEvents.END, (winner) => this._showGameOver(winner));

        game.events.on(GameEvents.HERO_LEVEL_UP, (level) => {
            this._log('Hero leveled up to ' + level + '!');
        });

        game.events.on(GameEvents.CASTLE_LEVEL_UP, (level) => {
            this._log('Castle upgraded to level ' + level + '!');
            this._applyCastleLevelBonuses(level);
        });

        game.events.on(GameEvents.AI_PHASE_CHANGE, (phase) => {
            const phaseEl = document.getElementById('ai-phase');
            if (phaseEl) phaseEl.textContent = phase;
        });

        // Initialize AI phase display
        const initPhaseEl = document.getElementById('ai-phase');
        if (initPhaseEl) initPhaseEl.textContent = 'planning';

        this._setupUI(cfg.uiRefs);
    }

    _createCastles() {
        const game = this.game;
        const cfg = game.config;
        const castleLevel = game._hud ? game._hud.castleLevel : 1;
        const cl = GameBalance.castleLevels;

        const playerMaxHp = cfg.castleHP + (castleLevel - 1) * cl.hpPerLevel;
        const playerCastle = new Castle(
            game.entities.nextId, 'player', playerMaxHp,
            cfg.playerCastleX, {
                ...cfg.castleDefense,
                defenseDamage: cfg.castleDefense.defenseDamage + (castleLevel - 1) * cl.defenseDamagePerLevel,
                defenseRange: cfg.castleDefense.defenseRange + (castleLevel - 1) * cl.defenseRangePerLevel,
            }
        );
        game.entities.add(playerCastle);

        const aiCastle = new Castle(
            game.entities.nextId, 'ai', cfg.aiCastleHP,
            cfg.battlefieldWidth - cfg.aiCastleXOffset, cfg.castleDefense
        );
        game.entities.add(aiCastle);
    }

    _applyCastleLevelBonuses(level) {
        const cl = GameBalance.castleLevels;
        const castle = this.game.entities.getCastle('player');
        if (!castle) return;

        const hpBonus = cl.hpPerLevel;
        const dmgBonus = cl.defenseDamagePerLevel;
        const rangeBonus = cl.defenseRangePerLevel;

        castle.maxHp += hpBonus;
        castle.curHp = Math.min(castle.maxHp, castle.curHp + hpBonus);
        castle.defenseDamage += dmgBonus;
        castle.defenseRange += rangeBonus;
    }

    _registerUnits() {
        const reg = this.game.unitRegistry;
        for (const [key, cls] of this._unitClasses) {
            reg.register(key, cls);
        }
    }

    _updateUnits(dt, gameTimeMs) {
        const game = this.game;
        const effSec = dt / 1000;
        const battleLeft = game.config.playerCastleX + 20;
        const battleRight = game.config.aiCastleX - 20;

        const units = game.entities.units.slice();
        for (const u of units) {
            if (u._animEnd && gameTimeMs >= u._animEnd) {
                if (u.curHp <= 0) {
                    game.entities.remove(u);
                    continue;
                }
                u._animState = '';
                u._animEnd = 0;
            }

            if (u.curHp <= 0) continue;

            u.regenResource(effSec);

            // Healers emit heal events when allies are in range and need healing
            if (u.isHealer) {
                const alliesNeedHeal = game.entities.units.filter(a =>
                    a.owner === u.owner &&
                    a.id !== u.id &&
                    a.curHp > 0 &&
                    a.curHp < a.maxHp &&
                    Math.abs(a.x - u.x) < u.range
                );
                if (alliesNeedHeal.length > 0 && u.canHeal(gameTimeMs) && u.hasHealResource()) {
                    game.events.emit(GameEvents.UNIT_HEAL, u);
                    u.markAttacked(gameTimeMs);
                } else if (alliesNeedHeal.length === 0) {
                    // Move toward the front-most ally (furthest ahead) to stay near front line
                    const alliesAhead = game.entities.units.filter(a =>
                        a.owner === u.owner &&
                        a.id !== u.id &&
                        a.curHp > 0 &&
                        (u.owner === 'player' ? a.x > u.x : a.x < u.x)
                    );
                    if (alliesAhead.length > 0) {
                        const furthestAlly = alliesAhead.reduce((furthest, a) => {
                            return (u.owner === 'player' ? a.x > furthest.x : a.x < furthest.x) ? a : furthest;
                        });
                        const distToFront = Math.abs(furthestAlly.x - u.x);
                        // Move if front line is beyond healing range
                        if (distToFront > u.range) {
                            u.move(effSec, battleLeft, battleRight);
                        }
                    }
                }
                continue;
            }

            const nearest = game.entities.nearestEnemyTo(u, u.range);
            if (nearest && u.canAttack(gameTimeMs)) {
                game.events.emit(GameEvents.UNIT_ATTACK, u, nearest);
                u.markAttacked(gameTimeMs);
            } else if (!nearest) {
                const castleX = u.owner === 'player' ? game.config.aiCastleX : game.config.playerCastleX;
                const distToCastle = Math.abs(u.x - castleX);

                if (distToCastle <= u.range && u.canAttack(gameTimeMs)) {
                    game.events.emit(GameEvents.UNIT_ATTACK_CASTLE, u);
                    u.markAttacked(gameTimeMs);
                } else {
                    u.move(effSec, battleLeft, battleRight);
                }
            }
        }
    }

    _checkWinCondition() {
        const pc = this.game.entities.getCastle('player');
        const ac = this.game.entities.getCastle('ai');

        if (pc && pc.curHp <= 0) this.game.end('ai');
        else if (ac && ac.curHp <= 0) this.game.end('player');
    }

    _setupUI(refs) {
        if (refs.btnPause) {
            refs.btnPause.addEventListener('click', () => {
                const paused = this.game.togglePause();
                refs.btnPause.textContent = paused ? 'Resume' : 'Pause';
            });
        }

        if (refs.btnSpeed) {
            refs.btnSpeed.addEventListener('click', () => {
                const s = this.game.speedMultiplier === 1 ? 2 : 1;
                this.game.setSpeed(s);
                refs.btnSpeed.textContent = 'Speed: ' + s + 'x';
            });
        }

        if (refs.btnReset) {
            refs.btnReset.addEventListener('click', () => {
                try { localStorage.removeItem('ccam_save'); } catch (_) {}
                this.game.restart();
            });
        }

        this.game.events.on(GameEvents.RESTART, () => {
            this._createCastles();
            this._registerUnits();
        });

        if (refs.volumeSlider) {
            refs.volumeSlider.addEventListener('input', () => {
                const sfx = this.game.plugins.get('sfx');
                if (sfx) {
                    sfx.volume = refs.volumeSlider.value / 100;
                    sfx.enabled = refs.volumeSlider.value > 0;
                }
            });
        }

        if (refs.castleUpgradeBtn) {
            refs.castleUpgradeBtn.addEventListener('click', () => {
                const hud = this.game._hud;
                if (hud && hud.tryUpgradeCastle()) {
                    this._addFloatingText(refs.castleUpgradeBtn, 'Castle upgraded!');
                }
            });
        }
    }

    _addFloatingText(targetEl, text) {
        if (!targetEl) return;
        const rect = targetEl.getBoundingClientRect();
        const el = document.createElement('div');
        el.className = 'floating-gold';
        el.textContent = text;
        el.style.left = rect.left + rect.width / 2 + 'px';
        el.style.top = rect.top + 'px';
        el.style.color = '#f59e0b';
        el.style.fontSize = '12px';
        document.body.appendChild(el);
        let time = 0;
        const anim = () => {
            time += 16;
            const progress = time / 1000;
            el.style.transform = `translateY(${-30 * progress}px)`;
            el.style.opacity = (1 - progress).toString();
            if (progress < 1) requestAnimationFrame(anim);
            else el.remove();
        };
        requestAnimationFrame(anim);
    }

    _log(msg) {
        if (!this._logEl) return;
        const p = document.createElement('div');
        p.className = 'log-entry';
        if (/died|defeat|fell|killed/i.test(msg)) p.classList.add('log-kill');
        else if (/victory|destroyed|leveled up/i.test(msg)) p.classList.add('log-level');
        else if (/castle|bombarded/i.test(msg)) p.classList.add('log-castle');
        else if (/^player|^your/i.test(msg)) p.classList.add('log-player');
        p.textContent = msg;
        this._logEl.prepend(p);
        if (this._logEl.childElementCount > 200) this._logEl.removeChild(this._logEl.lastChild);
    }

    _showGameOver(winner) {
        const overlay = document.getElementById('game-over-overlay');
        const title = document.getElementById('game-over-title');
        const msg = document.getElementById('game-over-msg');

        if (winner === 'ai') {
            title.textContent = 'Defeat!';
            title.className = 'defeat';
            msg.textContent = 'Your castle has fallen. Try again!';
            this._log('Defeat! Your castle fell.');
        } else {
            title.textContent = 'Victory!';
            title.className = 'victory';
            msg.textContent = 'The enemy castle lies in ruin!';
            this._log('Victory! Enemy castle destroyed.');
        }

        if (overlay) overlay.style.display = 'flex';

        const btn = document.getElementById('btn-play-again');
        if (btn) {
            btn.onclick = () => {
                overlay.style.display = 'none';
                try { localStorage.removeItem('ccam_save'); } catch (_) {}
                this.game.restart();
            };
        }
    }
}
