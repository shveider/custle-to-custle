import { Unit } from '../entities/Unit.js';
import { UnitType } from '../core/UnitTypes.js';

export class Healer extends Unit {
    static STATS = {
        cost: 150,
        hp: 100,
        dmg: 0, // No enemy damage
        speed: 0.8,
        range: 150, // Healing radius
        type: UnitType.RANGED,
        special: {
            healSplash: true,
            healAmount: 25,
            healInterval: 1000,
            resourceCostPerHeal: 20
        },
        resourceType: 'mana',
        resourceMax: 160,
        resourceRegenPerSec: 15,
        displayName: 'Healer',
        description: 'Splash heals multiple ally units in range',
        abilityDesc: 'Splash Heal (12 HP to allies in 100 range)',
        icon: '💚',
        projectileKind: 'none',
        impactKind: 'heal',
        abilityIcon: '✨',
    };

    constructor(id, owner, stats) {
        super(id, owner, stats);
        this.isHealer = true;
    }

    canHeal(gameTimeMs) {
        return gameTimeMs - this.lastAttack >= this.special.healInterval;
    }

    getHealResourceCost() {
        return this.special.resourceCostPerHeal;
    }

    hasHealResource() {
        return this.resource >= this.getHealResourceCost();
    }

    spendHealResource() {
        this.resource = Math.max(0, this.resource - this.getHealResourceCost());
    }
}
