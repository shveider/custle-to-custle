import { GameEvents } from '../core/Events.js';

const aiFlip = 'scaleX(-1)';
const noFlip = '';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function createUnitDOM(unit, assetRegistry) {
    const el = document.createElement('div');
    el.className = 'unit ' + unit.defName + (unit.owner === 'ai' ? ' ai-unit' : '');

    const sprite = document.createElement('div');
    sprite.className = 'unit-sprite';
    sprite.innerHTML = assetRegistry.getSVG(unit.defName, unit.owner);
    el.appendChild(sprite);

    const badge = document.createElement('div');
    badge.className = 'unit-badge';
    el.appendChild(badge);

    const hpBar = document.createElement('div');
    hpBar.className = 'unit-hpbar';
    const hpFill = document.createElement('div');
    hpFill.className = 'unit-hpfilled';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);

    const rsBar = document.createElement('div');
    rsBar.className = 'unit-rsbar';
    const rsFill = document.createElement('div');
    rsFill.className = 'unit-rsfilled';
    rsBar.appendChild(rsFill);
    el.appendChild(rsBar);

    el._badge = badge;
    el._hpFill = hpFill;
    el._hpBar = hpBar;
    el._rsFill = rsFill;
    el._rsBar = rsBar;

    const shadow = document.createElement('div');
    shadow.className = 'unit-shadow';
    if (unit.defName === 'giant') shadow.classList.add('shadow-large');
    if (unit.defName === 'skeleton') shadow.classList.add('shadow-small');
    el._shadow = shadow;

    return el;
}

const HP_COLORS = ['#ef4444', '#f59e0b', '#f59e0b', '#22c55e'];
function hpColorFast(pct) {
    return pct > 0.5 ? HP_COLORS[3] : pct > 0.25 ? HP_COLORS[2] : pct > 0.1 ? HP_COLORS[1] : HP_COLORS[0];
}

export class UnitRenderer {
    constructor(game, battleEl, assetRegistry) {
        this.game = game;
        this.battle = battleEl;
        this.assetRegistry = assetRegistry;
        this._elementPools = new Map();
        this._projectilePools = new Map();
        this._effectPools = new Map();

        this.game.events.on(GameEvents.RESTART, () => this.destroy());
    }

    render() {
        const units = this.game.entities.units.filter(u => u.curHp > 0 || u.animState === 'dying');
        const activeIds = new Set();
        const halfUnit = this.game.config.unitSize / 2;

        for (const u of units) {
            activeIds.add(u.id);
            let el = this._elementPools.get(u.id);
            if (!el) {
                el = createUnitDOM(u, this.assetRegistry);
                this._elementPools.set(u.id, el);
            }

            const flip = u.owner === 'ai' ? aiFlip : noFlip;
            el.style.left = (u.x - halfUnit) + 'px';
            el._badge.textContent = Math.max(0, Math.round(u.curHp)).toString();
            el._badge.style.transform = flip;
            const hpPct = clamp(u.curHp / u.maxHp, 0, 1);
            el._hpFill.style.width = (hpPct * 100) + '%';
            el._hpFill.style.background = hpColorFast(hpPct);
            el._hpBar.style.transform = flip;
            el._rsFill.style.width = clamp(u.resource / u.resourceMax * 100, 0, 100) + '%';
            el._rsFill.style.background = u.resourceType === 'mana' ? '#60a5fa' : '#f59e0b';
            el._rsBar.style.transform = flip;

            const anim = u.animState;
            el.classList.toggle('attacking', anim === 'attacking');
            el.classList.toggle('hit', anim === 'hit');
            el.classList.toggle('dying', anim === 'dying');

            if (el.parentNode !== this.battle) this.battle.appendChild(el);

            const shadow = el._shadow;
            shadow.style.left = (u.x - 18) + 'px';
            if (shadow.parentNode !== this.battle) this.battle.appendChild(shadow);
        }

        for (const [id, el] of this._elementPools) {
            if (!activeIds.has(id)) {
                if (el._shadow && el._shadow.parentNode) el._shadow.parentNode.removeChild(el._shadow);
                if (el.parentNode) el.parentNode.removeChild(el);
                this._elementPools.delete(id);
            }
        }

        this._renderProjectiles();
        this._renderEffects();
    }

    _renderProjectiles() {
        const activeKeys = new Set();
        for (let i = 0; i < this.game.fx.projectiles.length; i++) {
            const p = this.game.fx.projectiles[i];
            const key = 'p' + i;
            activeKeys.add(key);

            let el = this._projectilePools.get(key);
            if (!el) {
                el = document.createElement('div');
                el.className = 'projectile ' + p.kind;
                this._projectilePools.set(key, el);
                this.battle.appendChild(el);
            }
            el.style.left = (p.x - 4) + 'px';
            el.style.bottom = '100px';
        }
        this._cleanupPool(this._projectilePools, activeKeys);
    }

    _renderEffects() {
        const activeKeys = new Set();

        for (let i = 0; i < this.game.fx.effects.length; i++) {
            const fx = this.game.fx.effects[i];
            const key = 'e' + i;
            activeKeys.add(key);

            let el = this._effectPools.get(key);
            if (!el) {
                el = document.createElement('div');
                this._effectPools.set(key, el);
                this.battle.appendChild(el);
            }

            const t = 1 - fx.progress;

            if (fx.type === 'impact') {
                el.className = fx.crit ? 'impact crit' : 'impact';
                el.style.left = (fx.x - fx.size / 2) + 'px';
                el.style.bottom = '100px';
                el.style.width = fx.size + 'px';
                el.style.height = fx.size + 'px';
                el.style.background = fx.color;
                el.style.transform = 'scale(' + (0.6 + 0.8 * t) + ')';
                el.style.opacity = clamp(1 - t, 0, 1);
            } else if (fx.type === 'chain-lightning') {
                el.className = 'chain-lightning';
                el.style.left = Math.min(fx.x, fx.targetX) + 'px';
                el.style.bottom = '110px';
                const w = Math.abs(fx.targetX - fx.x);
                const op = clamp(1 - t * 1.5, 0, 1);
                el.innerHTML = '<svg width="' + (w + 20) + '" height="40"><path d="M10,20 Q' + (w*0.2) + ',5 ' + (w*0.4) + ',20 T' + (w*0.7) + ',20 T' + (w+10) + ',20" fill="none" stroke="#00d0ff" stroke-width="3" opacity="' + op + '"/><path d="M10,20 Q' + (w*0.25) + ',10 ' + (w*0.45) + ',20 T' + (w*0.75) + ',20 T' + (w+10) + ',20" fill="none" stroke="#fff" stroke-width="1.5" opacity="' + op + '"/></svg>';
            } else if (fx.type === 'shield-block') {
                el.className = 'shield-block-effect';
                el.style.left = (fx.x - 20) + 'px';
                el.style.bottom = '96px';
            } else if (fx.type === 'summon') {
                el.className = 'summon-effect';
                el.style.left = (fx.x - 15) + 'px';
                el.style.bottom = '95px';
            } else if (fx.type === 'area-attack') {
                el.className = 'area-attack-effect';
                el.style.left = (fx.x - fx.radius) + 'px';
                el.style.bottom = '90px';
                el.style.width = (fx.radius * 2) + 'px';
                el.style.height = (fx.radius * 2) + 'px';
            } else if (fx.type === 'dmg') {
                el.textContent = Math.round(fx.amount);
                el.style.position = 'absolute';
                el.style.left = fx.x + 'px';
                el.style.bottom = (100 + t * 38) + 'px';
                el.style.pointerEvents = 'none';
                el.style.color = fx.crit ? '#ffd166' : '#fff';
                el.style.textShadow = fx.crit ? '0 1px 3px rgba(0,0,0,.65),0 0 8px rgba(255,200,0,0.6)' : '0 1px 3px rgba(0,0,0,.65)';
                el.style.fontWeight = '700';
                el.style.fontSize = fx.crit ? '17px' : '14px';
                el.style.opacity = clamp(1 - t, 0, 1);
                el.style.letterSpacing = fx.crit ? '1px' : '';
            }
        }

        this._cleanupPool(this._effectPools, activeKeys);
    }

    _cleanupPool(pool, activeKeys) {
        for (const [key, el] of pool) {
            if (!activeKeys.has(key)) {
                if (el.parentNode) el.parentNode.removeChild(el);
                pool.delete(key);
            }
        }
    }

    destroy() {
        for (const [, el] of this._elementPools) {
            if (el._shadow && el._shadow.parentNode) el._shadow.parentNode.removeChild(el._shadow);
            if (el.parentNode) el.parentNode.removeChild(el);
        }
        this._elementPools.clear();

        for (const [, el] of this._projectilePools) {
            if (el.parentNode) el.parentNode.removeChild(el);
        }
        this._projectilePools.clear();

        for (const [, el] of this._effectPools) {
            if (el.parentNode) el.parentNode.removeChild(el);
        }
        this._effectPools.clear();
    }
}
