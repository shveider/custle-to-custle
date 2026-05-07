/**
 * A visual effect entity with a finite lifetime (e.g. impacts,
 * damage numbers, chain lightning, summon bursts).
 *
 * Effects have no movement — they stay at their spawn position and
 * fade out over time. Spawned by `FXSystem` and consumed by
 * `UnitRenderer._renderEffects()` each frame.
 */
export class Effect {
    constructor(type, x, cfg) {
        this.type = type;
        this.x = x;
        this.life = cfg.life || 200;
        this.maxLife = this.life;
        this.size = cfg.size || 10;
        this.color = cfg.color || '';
        this.crit = cfg.crit || false;
        this.isHeal = cfg.isHeal || false;
        this.targetX = cfg.targetX || 0;
        this.y = cfg.y || 100;
        this.amount = cfg.amount || 0;
        this.radius = cfg.radius || 60;
    }

    /** Remaining lifetime as a fraction of max (1.0 = fresh, 0.0 = expired). */
    get progress() {
        return this.life / this.maxLife;
    }

    /** Alpha value for rendering (clamped to non-negative). */
    get alpha() {
        return Math.max(0, this.progress);
    }

    /**
     * Decrements remaining lifetime.
     * @param {number} dt - Delta time in milliseconds.
     */
    update(dt) {
        this.life -= dt;
    }

    /** Whether the effect has fully expired. */
    get isExpired() {
        return this.life <= 0;
    }
}
