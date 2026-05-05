import { Unit } from '../entities/Unit.js';
import { UnitType } from '../core/UnitTypes.js'

export class Swordsman extends Unit {
    static STATS = {
        cost: 50,
        hp: 150,
        dmg: 10,
        speed: 0.8,
        range: 46,
        type: UnitType.MELEE,
        special: { shieldBlock: 0.2 },
        resourceType: 'stamina',
        resourceMax: 100,
        resourceRegenPerSec: 15,
        resourceCostPerAttack: 16,
        displayName: 'Swordsman',
        description: 'Fast melee infantry',
        abilityDesc: 'Shield Block (20% chance to negate damage)',
        icon: '⚔️',
        abilityIcon: '🛡️',
    };
}
