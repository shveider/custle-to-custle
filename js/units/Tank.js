import { Unit } from '../entities/Unit.js';

export class Tank extends Unit {
    static STATS = {
        cost: 200,
        hp: 1000,
        dmg: 5,
        speed: 0.5,
        range: 90,
        type: 'melee',
        special: { shieldBlock: 0.8 },
        resourceType: 'stamina',
        resourceMax: 150,
        resourceRegenPerSec: 30,
        resourceCostPerAttack: 35,
    };
}
