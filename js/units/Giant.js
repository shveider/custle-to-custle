import { Unit } from '../entities/Unit.js';
import { UnitType } from '../core/UnitTypes.js'

export class Giant extends Unit {
    static STATS = {
        cost: 350,
        hp: 800,
        dmg: 60,
        speed: 0.4,
        range: 60,
        type: UnitType.MELEE,
        special: { area: 0.5, areaRadius: 60, areaMultiplier: 0.6 },
        resourceType: 'stamina',
        resourceMax: 180,
        resourceRegenPerSec: 12,
        resourceCostPerAttack: 45,
        displayName: 'Giant',
        description: 'Massive melee powerhouse',
        abilityDesc: 'Area Attack (50% chance, 60px radius)',
        icon: '🗿',
        impactKind: 'spark',
        abilityIcon: '💥',
    };
}
