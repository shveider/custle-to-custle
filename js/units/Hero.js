import { Unit } from '../entities/Unit.js';

export class Hero extends Unit {
    static STATS = {
        cost: 0,
        hp: 300,
        dmg: 40,
        speed: 1.0,
        range: 90,
        type: 'hero',
        special: { unique: true },
        resourceType: 'stamina',
        resourceMax: 125,
        resourceRegenPerSec: 20,
        resourceCostPerAttack: 25,
    };

    static create(id, owner, overrides = {}, heroLevel = 1) {
        const hp = this.STATS.hp + (heroLevel - 1) * 50;
        const dmg = this.STATS.dmg + (heroLevel - 1) * 8;
        const resourceMax = this.STATS.resourceMax + (heroLevel - 1);
        const speed = this.STATS.speed + (heroLevel - 1) * 0.1;
        const stats = { ...this.STATS, hp, dmg, resourceMax, speed, ...overrides };
        return new this(id, owner, stats);
    }
}
