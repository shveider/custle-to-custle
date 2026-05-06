import { Unit } from '../entities/Unit.js';
import { UnitType, ResourceType, SpecialAbility } from '../core/UnitTypes.js';

export class Necromancer extends Unit {
    static STATS = {
        cost: 180,
        hp: 60,
        dmg: 25,
        speed: 0.7,
        range: 200,
        type: UnitType.RANGED,
        special: { [SpecialAbility.SUMMON]: 0.2, summonOffset: 30 },
        resourceType: ResourceType.MANA,
        resourceMax: 150,
        resourceRegenPerSec: 10,
        resourceCostPerAttack: 30,
        displayName: 'Necromancer',
        description: 'Dark summoner',
        abilityDesc: 'Summon Skeleton (20% chance on attack)',
        icon: '💀',
        projectileKind: 'fire',
        impactKind: 'magic',
        abilityIcon: '💀',
    };
}
