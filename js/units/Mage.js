import { Unit } from '../entities/Unit.js';
import { UnitType, ResourceType, SpecialAbility } from '../core/UnitTypes.js';

export class Mage extends Unit {
    static STATS = {
        cost: 120,
        hp: 50,
        dmg: 40,
        speed: 2,
        range: 170,
        type: UnitType.RANGED,
        special: { [SpecialAbility.CHAIN]: 0.5, chainRange: 120 },
        resourceType: ResourceType.MANA,
        resourceMax: 110,
        resourceRegenPerSec: 13,
        resourceCostPerAttack: 20,
        displayName: 'Mage',
        description: 'Powerful spellcaster',
        abilityDesc: 'Chain Lightning (50% damage to nearby enemies)',
        icon: '🔮',
        projectileKind: 'bolt',
        impactKind: 'magic',
        abilityIcon: '⚡',
    };
}
