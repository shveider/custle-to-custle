import { Projectile } from '../entities/Projectile.js';
import { Effect } from '../entities/Effect.js';
import { GameEvents } from '../core/Events.js';

const PROJECTILE_SPEED = { arrow: 420, bolt: 360, fire: 300, lightning: 500, firebeam: 1500 };
const IMPACT_LIFE = { hit: 220, spark: 180, magic: 260, lightning: 200, shield: 240, summon: 300, heal: 280 };
const IMPACT_SIZE = { hit: 10, spark: 8, magic: 12, lightning: 14, shield: 16, summon: 18, heal: 12 };
const IMPACT_COLOR = {
    hit: 'radial-gradient(circle, rgba(255,255,255,.9), rgba(255,200,80,.6))',
    spark: 'radial-gradient(circle, rgba(255,255,180,.9), rgba(255,120,0,.6))',
    magic: 'radial-gradient(circle, rgba(210,200,255,.95), rgba(120,80,255,.6))',
    lightning: 'radial-gradient(circle, rgba(255,255,255,.95), rgba(0,200,255,.7))',
    shield: 'radial-gradient(circle, rgba(100,180,255,.8), rgba(60,120,220,.4))',
    summon: 'radial-gradient(circle, rgba(80,255,80,.7), rgba(40,180,40,.3))',
    heal: 'radial-gradient(circle, rgba(180,255,180,.9), rgba(80,220,120,.5))',
};

/**
 * Manages all visual effects in the game, including projectiles,
 * impact particles, damage numbers, and special ability VFX.
 *
 * Each frame, the FX system updates active projectiles and effects,
 * removing those whose lifetime has expired. Spawns are consumed by
 * `UnitRenderer` which maps them to DOM elements via object pooling.
 *
 * @class FXSystem
 * @example
 *   const fx = new FXSystem(game);
 *   fx.spawnProjectile('bolt', 100, 345, 1, 170);
 *   fx.spawnImpact(150, 'magic');
 *   fx.spawnDamageNumber(150, 42, false);
 */
export class FXSystem {
    constructor(game) {
        this.game = game;

        /**
         * @type {Projectile[]}
         */
        this.projectiles = [];

        /**
         * @type {Effect[]}
         */
        this.effects = [];
        this._nextProjId = 1;
        this._setupListeners();
    }

    _setupListeners() {
        this.game.events.on(GameEvents.TICK, (dt) => this.update(dt));
        this.game.events.on(GameEvents.RESTART, () => {
            this.clear();
            this._nextProjId = 1;
            this.game.events.on(GameEvents.TICK, (dt) => this.update(dt));
        });
    }

    /**
     * Advances all active projectiles and effects by the given delta time.
     * Removes expired entities (lifetime depleted or out of bounds).
     * @param {number} dt - Delta time in milliseconds.
     */
    update(dt) {
        for (const p of this.projectiles) p.update(dt);
        this.projectiles = this.projectiles.filter(p => !p.isExpired && !p.isOutOfBounds(this.game.config.battlefieldWidth));

        for (const e of this.effects) e.update(dt);
        this.effects = this.effects.filter(e => !e.isExpired);
    }

    /**
     * Spawns a flying projectile that travels in one direction.
     * @param {string} kind - Projectile type ('arrow' | 'bolt' | 'fire' | 'lightning').
     * @param {number} x - Spawn position (world X coordinate).
     * @param {number} y - Spawn position (world Y coordinate).
     * @param {number} dir - Travel direction (1 = right, -1 = left).
     * @param {number} maxDistance - Maximum travel distance in pixels before expiry.
     */
    spawnProjectile(kind, x, y, dir, maxDistance) {
        const speed = PROJECTILE_SPEED[kind] || 360;
        this.projectiles.push(new Projectile(this._nextProjId++, kind, x, y, dir, speed, maxDistance));
    }

    /**
     * Spawns a radial impact effect at the given position.
     * @param {number} x - World X coordinate.
     * @param {string} [kind='hit'] - Impact type ('hit' | 'spark' | 'magic' | 'lightning' | 'shield' | 'summon' | 'heal').
     * @param {boolean} [crit=false] - Whether this is a critical hit (triggers extra burst animation).
     */
    spawnImpact(x, kind = 'hit', crit = false) {
        this.effects.push(new Effect('impact', x, {
            life: IMPACT_LIFE[kind] || 220,
            size: IMPACT_SIZE[kind] || 10,
            color: IMPACT_COLOR[kind] || IMPACT_COLOR.hit,
            crit,
        }));
    }

    /**
     * Spawns a chain lightning beam between two points.
     * @param {number} originX - Start X coordinate.
     * @param {number} targetX - End X coordinate.
     */
    spawnChainLightning(originX, targetX) {
        this.effects.push(new Effect('chain-lightning', originX, {
            targetX, life: 250,
        }));
    }

    /**
     * Spawns a shield block visual effect.
     * @param {number} x - World X coordinate.
     */
    spawnShieldBlock(x) {
        this.effects.push(new Effect('shield-block', x, { life: 350 }));
    }

    /**
     * Spawns a summon burst effect (used by Necromancer).
     * @param {number} x - World X coordinate.
     */
    spawnSummonEffect(x) {
        this.effects.push(new Effect('summon', x, { life: 500 }));
    }

    /**
     * Spawns an area attack circle effect.
     * @param {number} x - Center X coordinate.
     * @param {number} radius - Radius of the area effect in pixels.
     */
    spawnAreaAttack(x, radius) {
        this.effects.push(new Effect('area-attack', x, { radius, life: 400 }));
    }

    /**
     * Spawns a floating damage number.
     * @param {number} x - World X coordinate.
     * @param {number} amount - Damage value to display.
     * @param {boolean} crit - Whether this is a critical hit (golden, larger text).
     */
    spawnDamageNumber(x, amount, crit) {
        this.effects.push(new Effect('dmg', x, {
            amount, crit, life: 800,
        }));
    }

    /**
     * Clears all active projectiles and effects. Called on game restart.
     */
    clear() {
        this.projectiles = [];
        this.effects = [];
    }
}
