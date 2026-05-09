"use strict";
import { GameEvents } from '../core/Events.js';

export class CardDeck {
    constructor(game, hud) {
        this.game = game;
        this.hud = hud;
        this._cards = new Map();
        this._setupCards();
        this._setupKeys();
    }

    _setupCards() {
        document.querySelectorAll('.card').forEach(c => {
            const unitKey = c.dataset.unit;
            if (!unitKey) return;

            this._cards.set(unitKey, c);

            c.addEventListener('click', () => this._spawn(unitKey));
            c.addEventListener('mouseenter', (e) => this._showTooltip(e, unitKey));
            c.addEventListener('mouseleave', () => this._hideTooltip());
        });
    }

    _showTooltip(e, unitKey) {
        if (unitKey === 'hero') return;

        const UnitClass = this.game.unitRegistry.get(unitKey);
        if (!UnitClass) return;

        const s = UnitClass.STATS;
        const desc = s?.description || '';
        const abilityDesc = s?.abilityDesc || '';
        const abilityIcon = s?.abilityIcon || '⚡';

        let el = document.getElementById('card-tooltip');
        if (!el) {
            el = document.createElement('div');
            el.id = 'card-tooltip';
            document.body.appendChild(el);
        }

        el.innerHTML = `
            <div class="tooltip-name">${s?.displayName || UnitClass.name}</div>
            <div class="tooltip-desc">${desc}</div>
            <div class="tooltip-stats">
                <span>HP: ${s.hp}</span>
                <span>DMG: ${s.dmg}</span>
                <span>SPD: ${s.speed}</span>
                <span>RNG: ${s.range}</span>
                <span>Cost: ${s.cost}</span>
            </div>
            <div class="tooltip-ability">${abilityIcon} ${abilityDesc}</div>
        `;
        el.classList.add('visible');

        const rect = e.target.getBoundingClientRect();
        const tooltipWidth = 240;
        let left = rect.left + rect.width / 2;
        if (left - tooltipWidth / 2 < 8) left = tooltipWidth / 2 + 8;
        if (left + tooltipWidth / 2 > window.innerWidth - 8) left = window.innerWidth - tooltipWidth / 2 - 8;
        el.style.left = left + 'px';
        el.style.top = rect.top - 12 + 'px';
        el.style.transform = 'translate(-50%, -100%)';
    }

    _hideTooltip() {
        const el = document.getElementById('card-tooltip');
        if (el) el.classList.remove('visible');
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
