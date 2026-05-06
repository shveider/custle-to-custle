import { GameEvents } from '../core/Events.js';

/** @constant {number} Total height of the game field canvas in pixels */
const FIELD_H = 460;
/** @constant {number} Height of the ground section in pixels */
const GROUND_H = 80;
/** @constant {number} Y-coordinate where unit feet rest (FIELD_H - GROUND_H) */
const GROUND_Y = FIELD_H - GROUND_H; // 380 — y where unit feet rest

/**
 * Clamps a value between lower and upper bounds
 * @param {number} v - Value to clamp
 * @param {number} lo - Lower bound
 * @param {number} hi - Upper bound
 * @returns {number} Clamped value
 */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Returns HP bar color based on remaining HP percentage
 * @param {number} pct - HP percentage (0 to 1)
 * @returns {string} CSS color string for the HP bar
 */
function hpColor(pct) {
    if (pct > 0.5) return '#22c55e';
    if (pct > 0.25) return '#f59e0b';
    return pct > 0.1 ? '#f59e0b' : '#ef4444';
}

/**
 * Returns width and height for a given unit type
 * @param {string} defName - Unit definition name
 * @returns {[number, number]} [width, height] of the unit in pixels
 */
function unitDims(defName) {
    if (defName === 'giant') return [62, 62];
    if (defName === 'skeleton') return [38, 38];
    return [52, 52];
}

/**
 * Draws a rounded rectangle on the canvas, with fallback for older contexts
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {number} r - Border radius
 */
function roundRect(ctx, x, y, w, h, r) {
    if (w <= 0 || h <= 0) return;
    const safeR = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, safeR);
    } else {
        ctx.moveTo(x + safeR, y);
        ctx.lineTo(x + w - safeR, y);
        ctx.arcTo(x + w, y, x + w, y + safeR, safeR);
        ctx.lineTo(x + w, y + h - safeR);
        ctx.arcTo(x + w, y + h, x + w - safeR, y + h, safeR);
        ctx.lineTo(x + safeR, y + h);
        ctx.arcTo(x, y + h, x, y + h - safeR, safeR);
        ctx.lineTo(x, y + safeR);
        ctx.arcTo(x, y, x + safeR, y, safeR);
        ctx.closePath();
    }
}

/** @constant {Object.<string, {color: string, blur: number, pulse: boolean}>} Static glow effect properties per unit type */
const UNIT_GLOW = {
    mage:        { color: 'rgba(80,100,255,0.3)',   blur: 4, pulse: false },
    supreme:     { color: 'rgba(140,80,255,0.4)',   blur: 5, pulse: false },
    assassin:    { color: 'rgba(200,50,80,0.25)',   blur: 4, pulse: false },
    necromancer: { color: 'rgba(100,40,180,0.35)',  blur: 5, pulse: false },
    giant:       { color: 'rgba(120,80,30,0.3)',    blur: 6, pulse: false },
};

/**
 * Renders all game visuals (units, projectiles, effects) to a canvas using the Canvas 2D API
 * @class
 * @param {Object} game - Game instance providing entities, fx, events, and game state
 * @param {HTMLCanvasElement} canvas - Target canvas element for rendering
 * @param {import('../ui/UnitAssetRegistry.js').UnitAssetRegistry} assetRegistry - Registry for unit SVG assets
 */
export class CanvasRenderer {
    /**
     * @param {Object} game - Game instance
     * @param {HTMLCanvasElement} canvas - Target canvas
     * @param {import('../ui/UnitAssetRegistry.js').UnitAssetRegistry} assetRegistry - Unit asset registry
     */
    constructor(game, canvas, assetRegistry) {
        /** @private @type {Object} Game instance */
        this.game = game;
        /** @private @type {HTMLCanvasElement} Target canvas element */
        this.canvas = canvas;
        /** @private @type {CanvasRenderingContext2D} Canvas 2D rendering context */
        this.ctx = canvas.getContext('2d');
        /** @private @type {import('../ui/UnitAssetRegistry.js').UnitAssetRegistry} Unit asset registry */
        this.assetRegistry = assetRegistry;
        /** @private @type {Map<string, HTMLImageElement|'loading'>} Cache for loaded unit images, keyed by "unitKey_owner" */
        this._imgs = new Map();

        canvas.width = 3000;
        canvas.height = FIELD_H;

        this._preloadAllImages();
        game.events.on(GameEvents.RESTART, () => { /* image cache survives restart */ });
    }

    /**
     * Preloads all unit SVG images for both player and AI owners
     * @private
     */
    _preloadAllImages() {
        const keys = ['swordsman','archer','mage','tank','assassin','necromancer','giant','supreme','hero','skeleton','healer'];
        for (const k of keys) {
            this._loadImg(k, 'player');
            this._loadImg(k, 'ai');
        }
    }

    /**
     * Loads and caches a unit's SVG image for a given owner
     * @private
     * @param {string} unitKey - Unit definition key (e.g., 'archer', 'mage')
     * @param {string} owner - Unit owner ('player' or 'ai')
     */
    _loadImg(unitKey, owner) {
        const cacheKey = unitKey + '_' + owner;
        if (this._imgs.has(cacheKey)) return;
        this._imgs.set(cacheKey, 'loading');
        const img = new Image();
        const svgStr = this.assetRegistry.getSVG(unitKey, owner);
        img.onload = () => this._imgs.set(cacheKey, img);
        img.src = 'data:image/svg+xml,' + encodeURIComponent(svgStr);
    }

    /**
     * Retrieves a cached unit image, or null if not yet loaded
     * @private
     * @param {string} unitKey - Unit definition key
     * @param {string} owner - Unit owner ('player' or 'ai')
     * @returns {HTMLImageElement|null} Loaded image or null
     */
    _getImg(unitKey, owner) {
        const v = this._imgs.get(unitKey + '_' + owner);
        return (v && v !== 'loading') ? v : null;
    }

    /**
     * Main render loop — clears the canvas and draws all units, projectiles, and effects
     */
    render() {
        const ctx = this.ctx;
        const now = performance.now();
        const gameTimeMs = this.game.time * 1000;

        ctx.clearRect(0, 0, 3000, FIELD_H);

        const units = this.game.entities.units.filter(u => u.curHp > 0 || u.animState === 'dying');
        for (const u of units) this._drawUnit(ctx, u, now, gameTimeMs);
        for (const p of this.game.fx.projectiles) this._drawProjectile(ctx, p);
        for (const fx of this.game.fx.effects) this._drawEffect(ctx, fx);
    }

    // ─── Unit rendering ───────────────────────────────────────────────────────

    /**
     * Draws a single unit with animation, glow, shadow, HP bar, and resource bar
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Object} u - Unit object with properties: defName, animState, id, _animEnd, curHp, maxHp, x, owner, resource, resourceMax, resourceType
     * @param {number} now - Current timestamp from performance.now()
     * @param {number} gameTimeMs - Current game time in milliseconds
     */
    _drawUnit(ctx, u, now, gameTimeMs) {
        const [w, h] = unitDims(u.defName);
        const halfW = w / 2;
        const anim = u.animState;

        // ── Compute animation modifiers ──
        let yOff = 0;
        let scale = 1;
        let alpha = 1;
        let brightness = 1;
        let saturation = 1;

        if (!anim) {
            // Idle bob — each unit offset by id to desync
            yOff = Math.sin(now / 900 * Math.PI + u.id * 0.7) * 2;
        } else if (anim === 'attacking') {
            const t = 1 - clamp((u._animEnd - gameTimeMs) / 250, 0, 1); // 0→1 over duration
            scale = 1 + 0.15 * Math.sin(t * Math.PI);
        } else if (anim === 'hit') {
            brightness = 2.5;
            saturation = 0;
        } else if (anim === 'dying') {
            const t = 1 - clamp((u._animEnd - gameTimeMs) / 400, 0, 1); // 0=start,1=end
            // Match CSS: scale 1→1.1 at t=0.5, then 1.1→0; opacity 1→0.6→0
            scale = t < 0.5 ? (1 + 0.1 * (t / 0.5)) : (1.1 * (1 - (t - 0.5) / 0.5));
            alpha = clamp(1 - t, 0, 1);
            brightness = 1 + 2 * t;
        }

        const drawX = u.x - halfW;
        const drawY = GROUND_Y - h + yOff;
        const img = this._getImg(u.defName, u.owner);

        ctx.save();
        ctx.globalAlpha = alpha;

        if (brightness !== 1 || saturation !== 1) {
            ctx.filter = `brightness(${brightness}) saturate(${saturation})`;
        }

        // Glow effects
        if (u.defName === 'hero') {
            const pulse = (Math.sin(now / 1000 * Math.PI) + 1) / 2; // 0→1
            ctx.shadowColor = u.owner === 'ai' ? 'rgba(255,60,40,0.8)' : 'rgba(255,215,0,0.8)';
            ctx.shadowBlur = 6 + pulse * 8;
        } else if (UNIT_GLOW[u.defName]) {
            const g = UNIT_GLOW[u.defName];
            ctx.shadowColor = g.color;
            ctx.shadowBlur = g.blur;
        }

        if (u.owner === 'ai') {
            // Flip horizontally around unit center
            ctx.translate(drawX + w, drawY);
            ctx.scale(-scale, scale);
            if (img) ctx.drawImage(img, 0, 0, w, h);
            else this._drawFallback(ctx, 0, 0, w, h, u.owner);
        } else {
            ctx.translate(drawX + halfW, drawY + h / 2);
            ctx.scale(scale, scale);
            ctx.translate(-halfW, -h / 2);
            if (img) ctx.drawImage(img, 0, 0, w, h);
            else this._drawFallback(ctx, 0, 0, w, h, u.owner);
        }

        ctx.restore();

        // Shadow ellipse below unit (not affected by unit transforms)
        this._drawShadow(ctx, u.x, GROUND_Y + 4, u.defName);

        // HP bar (just below ground level)
        const hpPct = clamp(u.curHp / u.maxHp, 0, 1);
        const barW = w - 6;
        const barX = u.x - halfW + 3;
        const barY = GROUND_Y + 3;

        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        roundRect(ctx, barX, barY, barW, 4, 2);
        ctx.fill();

        if (hpPct > 0) {
            ctx.fillStyle = hpColor(hpPct);
            roundRect(ctx, barX, barY, barW * hpPct, 4, 2);
            ctx.fill();
        }

        // Resource bar
        if (u.resourceMax > 0) {
            const rsPct = clamp(u.resource / u.resourceMax, 0, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.14)';
            roundRect(ctx, barX, barY + 5, barW, 3, 1);
            ctx.fill();
            if (rsPct > 0) {
                ctx.fillStyle = u.resourceType === 'mana' ? '#60a5fa' : '#f59e0b';
                roundRect(ctx, barX, barY + 5, barW * rsPct, 3, 1);
                ctx.fill();
            }
        }

        // HP badge (number above unit)
        const hpText = Math.max(0, Math.round(u.curHp)).toString();
        ctx.font = '10px Inter, Arial, sans-serif';
        const textW = ctx.measureText(hpText).width;
        const badgeX = u.x - halfW + 2;
        const badgeTop = GROUND_Y - h - 15;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        roundRect(ctx, badgeX, badgeTop, textW + 6, 13, 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(hpText, badgeX + 3, badgeTop + 10);
    }

    /**
     * Draws an elliptical shadow beneath a unit
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {number} cx - Center x-coordinate
     * @param {number} y - Y-coordinate (ground level)
     * @param {string} defName - Unit definition name
     */
    _drawShadow(ctx, cx, y, defName) {
        let rx = 18, ry = 4;
        if (defName === 'giant')    { rx = 24; ry = 5; }
        if (defName === 'skeleton') { rx = 12; ry = 2.5; }
        const grad = ctx.createRadialGradient(cx, y, 0, cx, y, rx);
        grad.addColorStop(0, 'rgba(0,0,0,0.45)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draws a fallback circle when a unit image fails to load
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {number} x - Left position
     * @param {number} y - Top position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} owner - Unit owner ('player' or 'ai')
     */
    _drawFallback(ctx, x, y, w, h, owner) {
        ctx.fillStyle = owner === 'ai' ? '#e84858' : '#4a9eff';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // ─── Projectile rendering ─────────────────────────────────────────────────

    /**
     * Draws a projectile (arrow, bolt, fire, or lightning) on the canvas
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Object} p - Projectile object with properties: kind, x, dir, targetX
     */
    _drawProjectile(ctx, p) {
        const y = GROUND_Y - 35; // visual height: 10px above ground
        ctx.save();

        switch (p.kind) {
            case 'arrow': {
                ctx.shadowColor = 'rgba(220,160,80,0.6)';
                ctx.shadowBlur = 6;
                ctx.translate(p.x - 4, y - 3);
                if (p.dir < 0) { ctx.scale(-1, 1); ctx.translate(-22, 0); }
                const g = ctx.createLinearGradient(0, 0, 22, 0);
                g.addColorStop(0, '#4a2a10');
                g.addColorStop(0.5, '#c89840');
                g.addColorStop(1, '#f0d080');
                ctx.fillStyle = g;
                roundRect(ctx, 0, 0, 22, 6, 3); ctx.fill();
                // Arrowhead
                ctx.fillStyle = '#e0b060';
                ctx.beginPath();
                ctx.moveTo(22, 0); ctx.lineTo(28, 3); ctx.lineTo(22, 6);
                ctx.closePath(); ctx.fill();
                break;
            }
            case 'bolt': {
                ctx.shadowColor = 'rgba(140,80,255,0.9)';
                ctx.shadowBlur = 14;
                const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, 7);
                g.addColorStop(0, '#ffffff');
                g.addColorStop(0.4, '#b080ff');
                g.addColorStop(1, '#6030e0');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(p.x, y, 7, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'fire': {
                ctx.shadowColor = 'rgba(255,120,0,0.9)';
                ctx.shadowBlur = 14;
                const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, 7);
                g.addColorStop(0, '#ffffe0');
                g.addColorStop(0.4, '#ff8800');
                g.addColorStop(1, '#cc3300');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(p.x, y, 7, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'lightning': {
                ctx.shadowColor = 'rgba(0,200,255,0.95)';
                ctx.shadowBlur = 16;
                const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, 9);
                g.addColorStop(0, '#ffffff');
                g.addColorStop(0.4, '#80ffff');
                g.addColorStop(1, '#00c0ff');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(p.x, y, 9, 0, Math.PI * 2); ctx.fill();
                break;
            }
        }

        ctx.restore();
    }

    // ─── Effect rendering ─────────────────────────────────────────────────────

    /**
     * Draws a visual effect (impact, chain-lightning, shield-block, summon, area-attack, or dmg)
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Object} fx - Effect object with properties: type, progress, x, targetX, size, crit, amount, radius
     */
    _drawEffect(ctx, fx) {
        const t = 1 - fx.progress; // 0 = fresh, 1 = expired
        ctx.save();

        switch (fx.type) {
            case 'impact': {
                const s = 0.6 + 0.8 * t;
                ctx.globalAlpha = clamp(1 - t, 0, 1);
                ctx.translate(fx.x, GROUND_Y - 100);
                ctx.scale(s, s);
                const r = fx.size / 2;
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                if (fx.crit) {
                    g.addColorStop(0, 'rgba(255,240,180,0.95)');
                    g.addColorStop(1, 'rgba(255,200,0,0.4)');
                    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
                } else {
                    g.addColorStop(0, 'rgba(255,255,200,0.9)');
                    g.addColorStop(1, 'rgba(255,200,80,0.3)');
                    ctx.shadowColor = 'rgba(255,200,80,0.4)'; ctx.shadowBlur = 8;
                }
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
                break;
            }

            case 'chain-lightning': {
                ctx.globalAlpha = clamp(1 - t * 1.5, 0, 1);
                const y = GROUND_Y - 110;
                const dx = fx.targetX - fx.x;
                // Outer cyan beam
                ctx.strokeStyle = '#00d0ff'; ctx.lineWidth = 3;
                ctx.shadowColor = '#00d0ff'; ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(fx.x, y);
                ctx.quadraticCurveTo(fx.x + dx * 0.2, y - 15, fx.x + dx * 0.4, y);
                ctx.quadraticCurveTo(fx.x + dx * 0.6, y + 15, fx.targetX, y);
                ctx.stroke();
                // Inner white beam
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 3;
                ctx.beginPath();
                ctx.moveTo(fx.x, y);
                ctx.quadraticCurveTo(fx.x + dx * 0.25, y - 10, fx.x + dx * 0.45, y);
                ctx.quadraticCurveTo(fx.x + dx * 0.65, y + 10, fx.targetX, y);
                ctx.stroke();
                break;
            }

            case 'shield-block': {
                const prog = 1 - t;
                ctx.globalAlpha = clamp(1 - prog, 0, 1);
                ctx.translate(fx.x, GROUND_Y - 116);
                ctx.scale(0.5 + prog, 0.5 + prog);
                ctx.strokeStyle = 'rgba(100,180,255,0.7)';
                ctx.lineWidth = Math.max(1, 3 - prog * 2);
                ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
                break;
            }

            case 'summon': {
                const prog = 1 - t;
                ctx.globalAlpha = clamp((1 - prog) * 0.7, 0, 1);
                ctx.translate(fx.x, GROUND_Y - 110);
                ctx.scale(prog * 2, prog * 2);
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
                g.addColorStop(0, 'rgba(80,200,80,0.6)');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
                break;
            }

            case 'area-attack': {
                const prog = 1 - t;
                ctx.globalAlpha = clamp(1 - prog, 0, 1);
                ctx.translate(fx.x, GROUND_Y - 90);
                ctx.scale(0.3 + prog * 1.7, 0.3 + prog * 1.7);
                ctx.strokeStyle = 'rgba(255,120,0,0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, fx.radius, 0, Math.PI * 2); ctx.stroke();
                break;
            }

            case 'dmg': {
                ctx.globalAlpha = clamp(1 - t, 0, 1);
                const yFloat = GROUND_Y - 100 - t * 38;
                ctx.font = `700 ${fx.crit ? 17 : 14}px Inter, Arial, sans-serif`;
                ctx.fillStyle = fx.crit ? '#ffd166' : '#fff';
                ctx.shadowColor = fx.crit ? 'rgba(255,200,0,0.6)' : 'rgba(0,0,0,0.65)';
                ctx.shadowBlur = fx.crit ? 8 : 3;
                ctx.fillText(String(Math.round(fx.amount)), fx.x, yFloat);
                break;
            }
        }

        ctx.restore();
    }

    /**
     * Cleans up cached images when the renderer is no longer needed
     */
    destroy() {
        this._imgs.clear();
    }
}
