import { Entity } from './Entity.js';
import { UnitType, ResourceType } from '../core/UnitTypes.js';

export class Unit extends Entity {
    static STATS = {
        cost: 50,
        hp: 150,
        dmg: 10,
        speed: 0.8,
        range: 50,
        type: UnitType.MELEE,
    };

    static get isRanged() {
        return this.STATS.type === UnitType.RANGED || this.STATS.type === UnitType.SIEGE;
    }

    static get cost() {
        return this.STATS.cost;
    }

    constructor(id, owner, stats) {
        super(id);
        this.isUnit = true;
        this.owner = owner;
        this.defName = this.constructor.name.toLowerCase();
        this.maxHp = stats.hp;
        this.curHp = stats.hp;
        this.dmg = stats.dmg;
        this.speed = stats.speed;
        this.range = stats.range;
        this.unitType = stats.type;
        this.special = stats.special || {};
        this.attackDelay = stats.attackDelay || 800;
        this.lastAttack = 0;

        this.resourceType = stats.resourceType || ResourceType.STAMINA;
        this.resourceMax = stats.resourceMax || 100;
        this.resource = this.resourceMax;
        this.resourceRegenPerSec = stats.resourceRegenPerSec || 10;
        this.resourceCostPerAttack = stats.resourceCostPerAttack || 10;

        this.x = 0;
        this.dir = owner === 'player' ? 1 : -1;

        this._animState = '';
        this._animEnd = 0;
    }

    static create(id, owner, overrides = {}) {
        const stats = { ...this.STATS, ...overrides };
        return new this(id, owner, stats);
    }

    get isAlive() {
        return this.curHp > 0;
    }

    get isRanged() {
        return this.unitType === UnitType.RANGED || this.unitType === UnitType.SIEGE;
    }

    canAttack(gameTimeMs) {
        return gameTimeMs - this.lastAttack >= this.attackDelay;
    }

    hasResource() {
        return this.resource >= this.resourceCostPerAttack;
    }

    spendResource() {
        this.resource = Math.max(0, this.resource - this.resourceCostPerAttack);
    }

    regenResource(effSec) {
        this.resource = Math.min(this.resourceMax, this.resource + this.resourceRegenPerSec * effSec);
    }

    move(effSec, battleLeft, battleRight) {
        const dx = this.dir * this.speed * 60 * effSec;
        this.x = Math.max(battleLeft, Math.min(battleRight, this.x + dx));
    }

    damage(amount) {
        this.curHp = Math.max(0, this.curHp - amount);
    }

    markAttacked(gameTimeMs) {
        this.lastAttack = gameTimeMs;
    }

    triggerAnim(state, durationMs, gameTimeMs) {
        this._animState = state;
        this._animEnd = gameTimeMs + durationMs;
    }

    get animState() {
        return this._animState;
    }
}
