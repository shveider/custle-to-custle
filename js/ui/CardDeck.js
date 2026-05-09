"use strict";
import { GameEvents } from '../core/Events.js';
import { GameBalance } from '../core/GameBalance.js';

export class CardDeck {
    constructor(game, hud) {
        this.game = game;
        this.hud = hud;
        this._cards = new Map();
        this._setupCards();
        this._setupKeys();

        const initialLevel = this.game._hud ? this.game._hud.castleLevel : 1;
        this._updateTooltips(initialLevel);

        this.game.events.on(GameEvents.CASTLE_LEVEL_UP, (level) => this._updateTooltips(level));
        this.game.events.on(GameEvents.RESTART, () => this._updateTooltips(1));
    }

    _setupCards() {
        document.querySelectorAll('.card').forEach(c => {
            const unitKey = c.dataset.unit;
            if (!unitKey) return;

            this._cards.set(unitKey, c);

            c.addEventListener('click', () => this._spawn(unitKey));
        });
    }

    _updateTooltips(castleLevel) {
        const cl = GameBalance.castleLevels;
        const hpBoost = 1 + (castleLevel - 1) * cl.unitHpBoostPerLevel;
        const dmgBoost = 1 + (castleLevel - 1) * cl.unitDmgBoostPerLevel;

        for (const [key, card] of this._cards) {
            if (key === 'hero') continue;
            const UnitClass = this.game.unitRegistry.get(key);
            if (!UnitClass) continue;
            const s = UnitClass.STATS;

            const hpEl = card.querySelector('.tooltip-hp');
            const dmgEl = card.querySelector('.tooltip-dmg');
            if (hpEl) hpEl.textContent = Math.floor(s.hp * hpBoost);
            if (dmgEl) dmgEl.textContent = Math.floor(s.dmg * dmgBoost);
        }
    }

    _setupKeys() {
        const keyMap = {
            '1': 'swordsman', '2': 'archer', '3': 'mage', '4': 'tank',
            '5': 'supreme', '6': 'hero', '7': 'necromancer', '8': 'giant',
            '9': 'healer',
        };
        window.addEventListener('keydown', (e) => {
            if (e.key === 'g') { this.game._hud.gold += 1000; }
            if (e.key === 'k') { this.game.damageCastle('ai', 200); }
            const unit = keyMap[e.key];
            if (unit) this._spawn(unit);
        });
    }

    _spawn(unitKey) {
        if (unitKey === 'hero') {
            this.game.events.emit(GameEvents.HERO_DEPLOY);
            return;
        }

        const UnitClass = this.game.unitRegistry.get(unitKey);
        if (!UnitClass) return;

        const cost = UnitClass.STATS.cost;
        const gold = this.game._hud.gold;
        if (gold >= cost) {
            this.game._hud.gold -= cost;
            this.game.spawnUnit('player', unitKey);
            this.game.events.emit(GameEvents.HERO_EXP, Math.round(cost * 0.05));
        }
    }

    update() {
        for (const [key, card] of this._cards) {
            if (key === 'hero') {
                const ready = !this.game._heroCooldown && this.game._heroAvailable;
                card.classList.toggle('cool', !ready);
                const costEl = card.querySelector('.cost');
                if (costEl) {
                    if (this.game._heroCooldown > 0) costEl.textContent = Math.ceil(this.game._heroCooldown / 1000) + 's';
                    else if (!this.game._heroAvailable) costEl.textContent = Math.ceil(this.game._heroRespawn / 1000) + 's';
                    else costEl.textContent = 'FREE';
                }
            } else {
            const UnitClass = this.game.unitRegistry.get(key);
            const cost = UnitClass ? UnitClass.STATS.cost : 999;
            const gold = this.hud ? this.hud.gold : (this.game._hud ? this.game._hud.gold : 0);
            const canAfford = gold >= cost;
            card.classList.toggle('cool', !canAfford);
            }
        }
    }
}
