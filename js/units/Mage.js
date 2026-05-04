import { Unit } from '../entities/Unit.js';

export class Mage extends Unit {
    static STATS = {
        cost: 120,
        hp: 50,
        dmg: 40,
        speed: 2,
        range: 170,
        type: 'ranged',
        special: { chain: 0.5, chainRange: 120 },
        resourceType: 'mana',
        resourceMax: 110,
        resourceRegenPerSec: 13,
        resourceCostPerAttack: 20,
    };
}
