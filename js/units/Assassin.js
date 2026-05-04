import { Unit } from '../entities/Unit.js';

export class Assassin extends Unit {
    static STATS = {
        cost: 150,
        hp: 80,
        dmg: 35,
        speed: 2.2,
        range: 60,
        type: 'melee',
        special: { criticalStrike: 0.3, critMultiplier: 1.8 },
        resourceType: 'stamina',
        resourceMax: 90,
        resourceRegenPerSec: 18,
        resourceCostPerAttack: 18,
    };
}
