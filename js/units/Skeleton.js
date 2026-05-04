import { Unit } from '../entities/Unit.js';

export class Skeleton extends Unit {
    static STATS = {
        cost: 0,
        hp: 30,
        dmg: 8,
        speed: 0.6,
        range: 40,
        type: 'melee',
        special: {},
        resourceType: 'stamina',
        resourceMax: 50,
        resourceRegenPerSec: 10,
        resourceCostPerAttack: 10,
        attackDelay: 600,
    };

    static create(id, owner, overrides = {}) {
        const stats = { ...this.STATS, ...overrides };
        return new this(id, owner, stats);
    }
}
