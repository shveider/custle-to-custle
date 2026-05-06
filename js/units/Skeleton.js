import { Unit } from '../entities/Unit.js';
import { UnitType, ResourceType } from '../core/UnitTypes.js';

export class Skeleton extends Unit {
    static STATS = {
        cost: 0,
        hp: 30,
        dmg: 8,
        speed: 0.6,
        range: 46,
        type: UnitType.MELEE,
        special: {},
        resourceType: ResourceType.STAMINA,
        resourceMax: 50,
        resourceRegenPerSec: 10,
        resourceCostPerAttack: 10,
        attackDelay: 600,
        displayName: 'Skeleton',
        description: 'Undead minion',
        icon: '☠️',
    };

    static create(id, owner, overrides = {}) {
        const stats = { ...this.STATS, ...overrides };
        return new this(id, owner, stats);
    }
}
