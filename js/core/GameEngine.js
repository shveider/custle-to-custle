import { Castle } from '../entities/Castle.js';
import { GameEvents, EntityEvents } from './Events.js';

export class GameEngine {
    constructor(game, engineConfig) {
        this.game = game;
        this._battleEl = engineConfig.battleEl;
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

        game.events.on(GameEvents.END, (winner) => this._showGameOver(winner));

        game.events.on(GameEvents.HERO_LEVEL_UP, (level) => {
            this._log('Hero leveled up to ' + level + '!');
        });

        this._setupUI(cfg.uiRefs);
    }

    _createCastles() {
        const game = this.game;
        const cfg = game.config;

        const playerCastle = new Castle(
            game.entities.nextId, 'player', cfg.castleHP,
            cfg.playerCastleX, cfg.castleDefense
        );
        game.entities.add(playerCastle);

        const aiCastle = new Castle(
            game.entities.nextId, 'ai', cfg.aiCastleHP,
            cfg.battlefieldWidth - cfg.aiCastleXOffset, cfg.castleDefense
        );
        game.entities.add(aiCastle);
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

            const nearest = game.entities.nearestEnemyTo(u, u.range);
            if (nearest && u.canAttack(gameTimeMs)) {
                game.events.emit(GameEvents.UNIT_ATTACK, u, nearest);
                u.markAttacked(gameTimeMs);
            } else if (!nearest) {
                const castleX = u.owner === 'player' ? game.config.aiCastleX : game.config.playerCastleX;
                const distToCastle = Math.abs(u.x - castleX);

                if (u.isRanged && distToCastle <= u.range && u.canAttack(gameTimeMs)) {
                    game.events.emit(GameEvents.UNIT_ATTACK_CASTLE, u);
                    u.markAttacked(gameTimeMs);
                } else {
                    u.move(effSec, battleLeft, battleRight);

                    if (u.isMelee && ((u.owner === 'player' && u.x >= castleX) || (u.owner === 'ai' && u.x <= castleX))) {
                        const castleOwner = u.owner === 'player' ? 'ai' : 'player';
                        game.damageCastle(castleOwner, u.dmg);
                        this._log((u.owner === 'player' ? '' : 'AI ') + u.defName + ' hit ' + (u.owner === 'player' ? 'AI' : 'your') + ' castle for ' + u.dmg);
                        u.curHp = 0;
                    }
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
