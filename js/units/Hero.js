"use strict";
import { Unit } from '../entities/Unit.js';
import { UnitType, ResourceType, SpecialAbility } from '../core/UnitTypes.js';
import { GameBalance } from '../core/GameBalance.js';

export class Hero extends Unit {
    static STATS = {
        cost: 0,
        hp: 300,
        dmg: 40,
        speed: 1.0,
        range: 60,
        attackDelay: 900,
        type: UnitType.HERO,
        special: { [SpecialAbility.UNIQUE]: true },
        resourceType: ResourceType.STAMINA,
        resourceMax: 125,
        resourceRegenPerSec: 20,
        resourceCostPerAttack: 25,
        displayName: 'Hero',
        description: 'Unique leveling champion',
        abilityDesc: 'Gains HP and DMG with each level up',
        icon: '⭐',
        abilityIcon: '⭐',
    };

    static create(id, owner, overrides = {}, heroLevel = 1) {
        const hb = GameBalance.hero;
        const hp = this.STATS.hp + (heroLevel - 1) * hb.hpPerLevel;
        const dmg = this.STATS.dmg + (heroLevel - 1) * hb.dmgPerLevel;
        const resourceMax = this.STATS.resourceMax + (heroLevel - 1) * hb.resourceMaxPerLevel;
        const speed = this.STATS.speed + (heroLevel - 1) * hb.speedPerLevel;
        const stats = { ...this.STATS, hp, dmg, resourceMax, speed, ...overrides };
        return new this(id, owner, stats);
    }
}
