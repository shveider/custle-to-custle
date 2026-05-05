import { Unit } from '../entities/Unit.js';
import { UnitType } from '../core/UnitTypes.js'

export class Archer extends Unit {
    static STATS = {
        cost: 100,
        hp: 65,
        dmg: 20,
        speed: 1.0,
        range: 180,
        type: UnitType.RANGED,
        special: { piercing: 0.5 },
        resourceType: 'stamina',
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
