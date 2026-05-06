import { Unit } from '../entities/Unit.js';
import { UnitType, ResourceType, SpecialAbility } from '../core/UnitTypes.js';

export class Tank extends Unit {
    static STATS = {
        cost: 200,
        hp: 1000,
        dmg: 5,
        speed: 0.5,
        range: 48,
        type: UnitType.MELEE,
        special: { [SpecialAbility.SHIELD_BLOCK]: 0.8 },
        resourceType: ResourceType.STAMINA,
        resourceMax: 150,
        resourceRegenPerSec: 30,
        resourceCostPerAttack: 35,
        displayName: 'Tank',
        description: 'Heavy armored defender',
        abilityDesc: 'Shield Block (80% chance to negate damage)',
        icon: '🛡️',
        abilityIcon: '🛡️',
    };
}
