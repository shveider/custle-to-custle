const HP_COLORS = ['#ef4444', '#f59e0b', '#f59e0b', '#22c55e'];
import { GameEvents } from '../core/Events.js';

function hpColor(pct) {
    return pct > 0.5 ? HP_COLORS[3] : pct > 0.25 ? HP_COLORS[2] : pct > 0.1 ? HP_COLORS[1] : HP_COLORS[0];
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export class HUD {
    constructor(game, refs) {
        this.game = game;
        this.refs = refs;
        this._gold = 0;
        this._time = 0;
        this._aiGold = 0;
        this._heroLevel = 1;
        this._heroExp = 0;
        this._heroExpToNext = 100;
        this._playerCastleHp = 0;
        this._playerCastleMaxHp = 0;
        this._aiCastleHp = 0;
        this._aiCastleMaxHp = 0;
        this._dirty = true;
        this._floatingGold = [];

        this._setupListeners();
    }

    get gold() { return this._gold; }
    set gold(v) { this._gold = v; this._dirty = true; }

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
            this._dirty = true;
            this._updateHeroStatsUI();
        });

        this.game.events.on(GameEvents.GOLD, (owner, amount) => {
            if (owner === 'player') this._addFloatingGold(amount);
            this._dirty = true;
        });
        this.game.events.on(GameEvents.GET_GOLD, (owner, cb) => {
            cb(owner === 'player' ? this._gold : this._aiGold);
        });
        this.game.events.on(GameEvents.SPEND_GOLD, (owner, amount) => {
            const key = owner === 'player' ? '_gold' : '_aiGold';
            if (this[key] >= amount) {
                this[key] -= amount;
                this._dirty = true;
                return true;
            }
            return false;
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

    _upgradeHeroStats() {
        const level = this._heroLevel;
        const hp = 300 + (level - 1) * 40;
        const dmg = 40 + (level - 1) * 6;

        const hero = this.game.entities.units.find(u => u.defName === 'hero' && u.owner === 'player' && u.curHp > 0);
        if (hero) {
            const hpGain = hp - hero.maxHp;
            hero.maxHp = hp;
            hero.curHp = Math.min(hp, hero.curHp + hpGain);
            hero.dmg = dmg;
        }

        this._updateHeroStatsUI();
    }

    _updateHeroStatsUI() {
        const level = this._heroLevel;
        const hp = 300 + (level - 1) * 40;
        const dmg = 40 + (level - 1) * 6;
        const spd = 1.0;

        if (this.refs.heroHpStat) this.refs.heroHpStat.textContent = hp;
        if (this.refs.heroDmgStat) this.refs.heroDmgStat.textContent = dmg;
        if (this.refs.heroSpdStat) this.refs.heroSpdStat.textContent = spd;
    }

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

    _updateFloatingGold(dt) {
        for (let i = this._floatingGold.length - 1; i >= 0; i--) {
            const fg = this._floatingGold[i];
            fg.time += dt;
            const progress = fg.time / 1000;
            fg.el.style.transform = `translateY(${-30 * progress}px)`;
            fg.el.style.opacity = 1 - progress;
            if (progress >= 1) {
                fg.el.remove();
                this._floatingGold.splice(i, 1);
            }
        }
    }

    syncCastles() {
        const pc = this.game.entities.getCastle('player');
        const ac = this.game.entities.getCastle('ai');
        if (pc) { this._playerCastleHp = pc.curHp; this._playerCastleMaxHp = pc.maxHp; }
        if (ac) { this._aiCastleHp = ac.curHp; this._aiCastleMaxHp = ac.maxHp; }
    }

    update() {
        this._updateFloatingGold(16.67);
        if (!this._dirty) return;
        this._dirty = false;
        this.syncCastles();

        const refs = this.refs;
        if (refs.goldEl) refs.goldEl.textContent = Math.floor(this._gold);
        if (refs.timeEl) refs.timeEl.textContent = Math.floor(this._time);
        if (refs.aiGoldInfo) refs.aiGoldInfo.textContent = Math.floor(this._aiGold);

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
            if (refs.aiHpText) refs.aiHpText.textContent = Math.max(0, Math.round(this._aiCastleHp));
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
    }
}
