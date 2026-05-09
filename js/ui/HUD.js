"use strict";

const HP_COLORS = ['#ef4444', '#f59e0b', '#f59e0b', '#22c55e'];

import { GameEvents } from '../core/Events.js';
import { Hero } from '../units/Hero.js';
import { GameBalance } from '../core/GameBalance.js';

/**
 * @param {number} pct
 * @returns {string}
 */
function hpColor(pct) {
    return pct > 0.5 ? HP_COLORS[3] : pct > 0.25 ? HP_COLORS[2] : pct > 0.1 ? HP_COLORS[1] : HP_COLORS[0];
}

/**
 * @param {number} v
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/** UI controller for player gold, castles, hero stats and timers. */
export class HUD {
    /**
     * @param {import('../core/Game.js').Game} game
     * @param {import('../../js/main.js').UiRefs} refs
     */
    constructor(game, refs) {
        /** @type Game */
        this.game = game;
        /** @type UiRefs */
        this.refs = refs;
        /** @type {number} */
        this._gold = 0;
        /** @type {number} */
        this._time = 0;
        /** @type {number} */
        this._aiGold = 0;
        /** @type {number} */
        this._heroLevel = 1;
        /** @type {number} */
        this._heroExp = 0;
        /** @type {number} */
        this._heroExpToNext = 100;
        /** @type {number} */
        this._playerCastleHp = 0;
        /** @type {number} */
        this._playerCastleMaxHp = 0;
        /** @type {number} */
        this._aiCastleHp = 0;
        /** @type {number} */
        this._aiCastleMaxHp = 0;
        /** @type {number} */
        this._castleLevel = 1;
        /** @type {boolean} */
        this._dirty = true;
        /** @type {Array<{el: HTMLElement, time: number}>} */
        this._floatingGold = [];

        this._setupListeners();
    }

    /** @returns {number} */
    get gold() { return this._gold; }
    /** @param {number} v */
    set gold(v) { this._gold = v; this._dirty = true; }

    /** @private */
    _setupListeners() {
        this.game.events.on(GameEvents.RESTART, () => {
            this._gold = 0;
            this._aiGold = 0;
            this._time = 0;
            this._heroLevel = 1;
            this._heroExp = 0;
            this._heroExpToNext = 100;
            this._playerCastleHp = 0;
            this._playerCastleMaxHp = 0;
            this._aiCastleHp = 0;
            this._aiCastleMaxHp = 0;
            this._castleLevel = 1;
            this._dirty = true;
            this._updateHeroStatsUI();
            this._updateCastleLevelUI();
        });

        this.game.events.on(GameEvents.GOLD, (owner, amount) => {
            if (owner === 'player') {
                this._gold += amount;
                this._addFloatingGold(amount);
            } else {
                this._aiGold += amount;
            }

            this._dirty = true;
        });

        this.game.events.on(GameEvents.GET_GOLD, (owner, cb) => {
            cb(owner === 'player' ? this._gold : this._aiGold);
        });

        this.game.events.on(GameEvents.TICK, () => {
            const rate = this.game.config.goldRate || 11;
            const aiRate = this.game.config.aiGoldRate || 17;
            this._gold += rate / 60;
            this._aiGold += aiRate / 60;
            this._time = this.game.time;
            this._dirty = true;
        });

        this.game.events.on(GameEvents.CASTLE_DAMAGE, (owner, amount) => {
            const castle = this.game.entities.getCastle(owner);
            if (castle) {
                castle.damage(amount);
                this._dirty = true;
            }
        });

        this.game.events.on(GameEvents.HERO_EXP, (amount) => {
            this._heroExp += amount;
            while (this._heroExp >= this._heroExpToNext) {
                this._heroExp -= this._heroExpToNext;
                this._heroLevel++;
                this._heroExpToNext = Math.floor(this._heroExpToNext * 1.4);
                this._upgradeHeroStats();
                this.game.events.emit(GameEvents.HERO_LEVEL_UP, this._heroLevel);
            }
            this._dirty = true;
        });
    }

    /** @private */
    _upgradeHeroStats() {
        const hb = GameBalance.hero;
        const level = this._heroLevel;
        const hp = Hero.STATS.hp + (level - 1) * hb.hpPerLevel;
        const dmg = Hero.STATS.dmg + (level - 1) * hb.dmgPerLevel;
        const speed = Hero.STATS.speed + (level - 1) * hb.speedPerLevel;

        const hero = this.game.entities.units.find(u => u.defName === 'hero' && u.owner === 'player' && u.curHp > 0);
        if (hero) {
            const hpGain = hp - hero.maxHp;
            hero.maxHp = hp;
            hero.curHp = Math.min(hp, hero.curHp + hpGain);
            hero.dmg = dmg;
            hero.speed = speed;
        }

        this._updateHeroStatsUI();
    }

    /** @private */
    _updateHeroStatsUI() {
        const hero =
          this.game.entities.units.find(u => u.defName === 'hero' && u.owner === 'player' && u.curHp > 0)
          || Hero.create(
            'hero-for-stats',
          'player',
            {},
            this._heroLevel,
          )

        if (this.refs.heroHpStat) this.refs.heroHpStat.textContent = hero.maxHp;
        if (this.refs.heroDmgStat) this.refs.heroDmgStat.textContent = hero.dmg;
        if (this.refs.heroSpdStat) this.refs.heroSpdStat.textContent = hero.speed.toFixed(1);
    }

    /**
     * @private
     * @param {number} amount
     */
    _addFloatingGold(amount) {
        if (!this.refs.goldEl) return;
        const rect = this.refs.goldEl.getBoundingClientRect();
        const el = document.createElement('div');
        el.className = 'floating-gold';
        el.textContent = (amount > 0 ? '+' : '') + Math.round(amount);
        el.style.left = rect.left + rect.width / 2 + 'px';
        el.style.top = rect.top + 'px';
        el.style.color = amount > 0 ? '#22c55e' : '#ef4444';
        document.body.appendChild(el);
        this._floatingGold.push({ el, time: 0 });
    }

    /**
     * @private
     * @param {number} dt
     */
    _updateFloatingGold(dt) {
        for (let i = this._floatingGold.length - 1; i >= 0; i--) {
            const fg = this._floatingGold[i];
            fg.time += dt;
            const progress = fg.time / 1000;
            fg.el.style.transform = `translateY(${-30 * progress}px)`;
            fg.el.style.opacity = (1 - progress).toString();
            if (progress >= 1) {
                fg.el.remove();
                this._floatingGold.splice(i, 1);
            }
        }
    }

    /** Sync castle HP from EntityManager. */
    syncCastles() {
        const pc = this.game.entities.getCastle('player');
        const ac = this.game.entities.getCastle('ai');
        if (pc) { this._playerCastleHp = pc.curHp; this._playerCastleMaxHp = pc.maxHp; }
        if (ac) { this._aiCastleHp = ac.curHp; this._aiCastleMaxHp = ac.maxHp; }
    }

    /** Refresh UI elements if dirty. */
    update() {
        this._updateFloatingGold(16.67);
        if (!this._dirty) return;
        this._dirty = false;
        this.syncCastles();

        const refs = this.refs;

        if (refs.goldEl) refs.goldEl.textContent = Math.floor(this._gold).toString();
        if (refs.timeEl) refs.timeEl.textContent = Math.floor(this._time).toString();
        if (refs.aiGoldInfo) refs.aiGoldInfo.textContent = Math.floor(this._aiGold).toString();

        if (refs.playerHpBar && this._playerCastleMaxHp > 0) {
            const pct = clamp(this._playerCastleHp / this._playerCastleMaxHp, 0, 1);
            refs.playerHpBar.style.width = (pct * 100) + '%';
            refs.playerHpBar.style.background = hpColor(pct);
            if (refs.playerHpText) refs.playerHpText.textContent = Math.max(0, Math.round(this._playerCastleHp));
        }

        if (refs.aiHpBar && this._aiCastleMaxHp > 0) {
            const pct = clamp(this._aiCastleHp / this._aiCastleMaxHp, 0, 1);
            refs.aiHpBar.style.width = (pct * 100) + '%';
            refs.aiHpBar.style.background = hpColor(pct);
            if (refs.aiHpText) refs.aiHpText.textContent = Math.max(0, Math.round(this._aiCastleHp)).toString();
        }

        if (refs.castlePlayer) {
            const ppct = this._playerCastleMaxHp > 0 ? this._playerCastleHp / this._playerCastleMaxHp : 1;
            refs.castlePlayer.classList.toggle('damaged', ppct < 0.5 && ppct >= 0.25);
            refs.castlePlayer.classList.toggle('critical', ppct < 0.25);
        }

        if (refs.castleAi) {
            const apct = this._aiCastleMaxHp > 0 ? this._aiCastleHp / this._aiCastleMaxHp : 1;
            refs.castleAi.classList.toggle('damaged', apct < 0.5 && apct >= 0.25);
            refs.castleAi.classList.toggle('critical', apct < 0.25);
        }

        if (refs.heroLevelEl) refs.heroLevelEl.textContent = this._heroLevel;
        if (refs.heroExpText) refs.heroExpText.textContent = Math.floor(this._heroExp) + '/' + this._heroExpToNext;
        if (refs.heroXpBar) refs.heroXpBar.style.width = clamp(this._heroExp / this._heroExpToNext * 100, 0, 100) + '%';

        this._updateCastleLevelUI();
    }

    /** @returns {number} */
    get castleLevel() { return this._castleLevel; }

    /** @returns {number|null} */
    get castleUpgradeCost() {
        const cfg = GameBalance.castleLevels;
        if (this._castleLevel >= cfg.maxLevel) return null;
        return Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, this._castleLevel - 1));
    }

    /** @returns {boolean} */
    tryUpgradeCastle() {
        const cost = this.castleUpgradeCost;
        if (cost === null) return false;
        if (this._gold < cost) return false;
        this._gold -= cost;
        this._castleLevel++;
        this._dirty = true;
        this.game.events.emit(GameEvents.CASTLE_LEVEL_UP, this._castleLevel, cost);
        return true;
    }

    /** @private */
    _updateCastleLevelUI() {
        const refs = this.refs;
        if (refs.castleLevelEl) refs.castleLevelEl.textContent = this._castleLevel;
        const cost = this.castleUpgradeCost;
        if (refs.castleUpgradeBtn) {
            if (cost === null) {
                refs.castleUpgradeBtn.textContent = 'MAX';
                refs.castleUpgradeBtn.disabled = true;
                refs.castleUpgradeBtn.classList.add('maxed');
            } else {
                refs.castleUpgradeBtn.textContent = 'Upgrade (' + cost + 'g)';
                refs.castleUpgradeBtn.disabled = this._gold < cost;
                refs.castleUpgradeBtn.classList.toggle('disabled', this._gold < cost);
                refs.castleUpgradeBtn.classList.remove('maxed');
            }
        }
    }
}
