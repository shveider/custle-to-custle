"use strict";
import { EventBus } from './EventBus.js';
import { EntityEvents } from './Events.js';

export class EntityManager {
    constructor() {
        this.events = new EventBus();
        this._entities = new Map();
        this._units = new Map();
        this._castles = new Map();
        this._nextId = 1;
    }

    get nextId() {
        return this._nextId++;
    }

    add(entity) {
        if (this._entities.has(entity.id)) {
            console.warn(`EntityManager.add: duplicate ID ${entity.id} (existing=${this._entities.get(entity.id).constructor.name}, new=${entity.constructor.name})`);
        }

        this._entities.set(entity.id, entity);

        if (entity.isUnit) {
            this._units.set(entity.id, entity);
        } else if (entity.isCastle) {
            this._castles.set(entity.id, entity);
        }

        this.events.emit(EntityEvents.ADDED, entity);
        if (entity.isUnit) this.events.emit(EntityEvents.UNIT_ADDED, entity);
        if (entity.isCastle) this.events.emit(EntityEvents.CASTLE_ADDED, entity);
    }

    remove(entity) {
        if (!entity || !this._entities.has(entity.id)) return;

        const wasUnit = entity.isUnit;
        const wasCastle = entity.isCastle;

        this._entities.delete(entity.id);
        if (wasUnit) this._units.delete(entity.id);
        if (wasCastle) this._castles.delete(entity.id);

        if (wasUnit) this.events.emit(EntityEvents.UNIT_REMOVED, entity);
        if (wasCastle) this.events.emit(EntityEvents.CASTLE_REMOVED, entity);
        this.events.emit(EntityEvents.REMOVED, entity);
    }

    get units() {
        return Array.from(this._units.values());
    }

    get castles() {
        return Array.from(this._castles.values());
    }

    findByOwner(owner) {
        const result = [];
        for (const u of this._units.values()) {
            if (u.owner === owner) result.push(u);
        }
        return result;
    }

    findEnemy(owner) {
        const result = [];
        for (const u of this._units.values()) {
            if (u.owner !== owner && u.curHp > 0) result.push(u);
        }
        return result;
    }

    countAlive(owner) {
        let count = 0;
        for (const u of this._units.values()) {
            if (u.owner === owner && u.curHp > 0) count++;
        }
        return count;
    }

    getCastle(owner) {
        for (const c of this._castles.values()) {
            if (c.owner === owner) return c;
        }
        return null;
    }

    nearestEnemyTo(entity, range = Infinity) {
        let nearest = null;
        let nearestDist = range;

        for (const u of this._units.values()) {
            if (u.owner === entity.owner || u.curHp <= 0) continue;
            const dist = Math.abs(u.x - entity.x);
            if (dist <= range && dist < nearestDist) {
                nearest = u;
                nearestDist = dist;
            }
        }

        return nearest;
    }

    nearestEnemyToCastle(castle, range = Infinity) {
        let nearest = null;
        let nearestDist = range;

        for (const u of this._units.values()) {
            if (u.owner === castle.owner || u.curHp <= 0) continue;
            const dist = Math.abs(u.x - castle.x);
            if (dist <= range && dist < nearestDist) {
                nearest = u;
                nearestDist = dist;
            }
        }

        return nearest;
    }

    destroy() {
        this._entities.clear();
        this._units.clear();
        this._castles.clear();
        this.events.clear();
    }
}
