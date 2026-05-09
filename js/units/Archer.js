"use strict";
import { Unit } from '../entities/Unit.js';
import { UnitType, ResourceType, SpecialAbility } from '../core/UnitTypes.js';

export class Archer extends Unit {
    static STATS = {
        cost: 100,
        hp: 65,
        dmg: 20,
        speed: 1.0,
        range: 160,
        attackDelay: 1000,
        type: UnitType.RANGED,
        special: { [SpecialAbility.PIERCING]: 0.5 },
        resourceType: ResourceType.STAMINA,
        resourceMax: 80,
        resourceRegenPerSec: 12,
        resourceCostPerAttack: 15,
        displayName: 'Archer',
        description: 'Versatile ranged attacker',
        abilityDesc: 'Piercing (+50% damage vs Hero units)',
        icon: '🏹',
        projectileKind: 'arrow',
        impactKind: 'hit',
        abilityIcon: '🎯',
    };
}
