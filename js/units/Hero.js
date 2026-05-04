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
        resourceMax: 120,
        resourceRegenPerSec: 20,
        resourceCostPerAttack: 25,
    };

    static create(id, owner, overrides = {}, heroLevel = 1) {
        const hp = this.STATS.hp + (heroLevel - 1) * 40;
        const dmg = this.STATS.dmg + (heroLevel - 1) * 6;
        const stats = { ...this.STATS, hp, dmg, ...overrides };
        return new this(id, owner, stats);
    }
}
