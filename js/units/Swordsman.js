import { Unit } from '../entities/Unit.js';
import { UnitType, ResourceType, SpecialAbility } from '../core/UnitTypes.js';

export class Swordsman extends Unit {
    static STATS = {
        cost: 50,
        hp: 150,
        dmg: 10,
        speed: 0.8,
        range: 46,
        attackDelay: 800,
        type: UnitType.MELEE,
        special: { [SpecialAbility.SHIELD_BLOCK]: 0.2 },
        resourceType: ResourceType.STAMINA,
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
