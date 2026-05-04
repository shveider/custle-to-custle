import { Unit } from '../entities/Unit.js';

export class Swordsman extends Unit {
    static STATS = {
        cost: 50,
        hp: 150,
        dmg: 10,
        speed: 0.8,
        range: 50,
        type: 'melee',
        special: { shieldBlock: 0.2 },
        resourceType: 'stamina',
        resourceMax: 100,
        resourceRegenPerSec: 15,
        resourceCostPerAttack: 16,
    };
}
