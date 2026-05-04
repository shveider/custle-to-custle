import { Unit } from '../entities/Unit.js';

export class Necromancer extends Unit {
    static STATS = {
        cost: 180,
        hp: 60,
        dmg: 25,
        speed: 0.7,
        range: 200,
        type: 'ranged',
        special: { summon: 0.2, summonOffset: 30 },
        resourceType: 'mana',
        resourceMax: 150,
        resourceRegenPerSec: 10,
        resourceCostPerAttack: 30,
    };
}
