import { Unit } from '../entities/Unit.js';

export class Archer extends Unit {
    static STATS = {
        cost: 100,
        hp: 65,
        dmg: 20,
        speed: 1.0,
        range: 180,
        type: 'ranged',
        special: { piercing: 0.5 },
        resourceType: 'stamina',
        resourceMax: 80,
        resourceRegenPerSec: 12,
        resourceCostPerAttack: 15,
    };
}
