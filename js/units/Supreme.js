import { Unit } from '../entities/Unit.js';

export class Supreme extends Unit {
    static STATS = {
        cost: 200,
        hp: 50,
        dmg: 80,
        speed: 0.35,
        range: 320,
        type: 'siege',
        special: { siege: true, castleBonus: 3.0, line: true, lineRange: 320, attackDelay: 2400 },
        resourceType: 'mana',
        resourceMax: 120,
        resourceRegenPerSec: 8,
        resourceCostPerAttack: 40,
    };
}
