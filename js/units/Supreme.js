import { Unit } from '../entities/Unit.js';
import { UnitType } from '../core/UnitTypes.js'

export class Supreme extends Unit {
    static STATS = {
        cost: 200,
        hp: 50,
        dmg: 80,
        speed: 0.35,
        range: 300,
        type: UnitType.SIEGE,
        special: { siege: true, castleBonus: 3.0, line: true, lineRange: 320, attackDelay: 2400 },
        resourceType: 'mana',
        resourceMax: 120,
        resourceRegenPerSec: 8,
        resourceCostPerAttack: 40,
        displayName: 'Supreme',
        description: 'Long-range siege unit',
        abilityDesc: 'Line Attack & 3x damage vs castles',
        icon: '✨',
        projectileKind: 'bolt',
        impactKind: 'magic',
        abilityIcon: '🌟',
    };
}
