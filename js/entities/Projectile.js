/**
 * A projectile entity that travels in a straight line until
 * its max distance is reached or it leaves the battlefield.
 *
 * Spawned by `FXSystem.spawnProjectile()` and consumed by
 * `UnitRenderer._renderProjectiles()` each frame.
 */
export class Projectile {
    constructor(id, kind, x, y, dir, speed, maxDistance) {
        this.id = id;
        this.kind = kind;
        this.x = x;
        this.y = y;
        this.dir = dir;
        this.speed = speed;
        this.traveled = 0;
        this.maxDistance = maxDistance;
    }

    /**
     * Advances the projectile by delta time.
     * @param {number} dt - Delta time in milliseconds.
     */
    update(dt) {
        const dxFactor = dt / 1000;
        const dx = this.dir * this.speed * dxFactor;
        this.x += dx;
        this.traveled += Math.abs(dx);
    }

    /** Whether the projectile has traveled its full distance. */
    get isExpired() {
        return this.traveled >= this.maxDistance;
    }

    /** Whether the projectile is outside the battlefield bounds. */
    isOutOfBounds(battlefieldWidth) {
        return this.x < 0 || this.x > battlefieldWidth;
    }
}
