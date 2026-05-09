"use strict";
import { Entity } from './Entity.js';

export class Castle extends Entity {
    constructor(id, owner, maxHp, x, cfg = {}) {
        super(id);
        this.isCastle = true;
        this.owner = owner;
        this.maxHp = maxHp;
        this.curHp = maxHp;
        this.x = x;

        this.defenseRange = cfg.defenseRange || 360;
        this.defenseDamage = cfg.defenseDamage || 35;
        this.defenseAttackDelay = cfg.defenseAttackDelay || 1300;
        this.defenseProjectileKind = cfg.defenseProjectileKind || 'bolt';
        this.lastDefenseAttack = 0;
    }

    get hpPercent() {
        return this.curHp / this.maxHp;
    }

    damage(amount) {
        this.curHp = Math.max(0, this.curHp - amount);
        return this.curHp;
    }

    heal(amount) {
        this.curHp = Math.min(this.maxHp, this.curHp + amount);
        return this.curHp;
    }

    get isAlive() {
        return this.curHp > 0;
    }

    canAttack(gameTimeMs) {
        return gameTimeMs - this.lastDefenseAttack >= this.defenseAttackDelay;
    }

    markAttacked(gameTimeMs) {
        this.lastDefenseAttack = gameTimeMs;
    }
}
