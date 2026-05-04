import { EventBus } from './EventBus.js';

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
        this._entities.set(entity.id, entity);

        if (entity.isUnit) {
            this._units.set(entity.id, entity);
        } else if (entity.isCastle) {
            this._castles.set(entity.id, entity);
        }

        this.events.emit('entity:added', entity);
        if (entity.isUnit) this.events.emit('unit:added', entity);
        if (entity.isCastle) this.events.emit('castle:added', entity);
    }

    remove(entity) {
        if (!entity || !this._entities.has(entity.id)) return;

        const wasUnit = entity.isUnit;
        const wasCastle = entity.isCastle;

        this._entities.delete(entity.id);
        if (wasUnit) this._units.delete(entity.id);
        if (wasCastle) this._castles.delete(entity.id);

        if (wasUnit) this.events.emit('unit:removed', entity);
        if (wasCastle) this.events.emit('castle:removed', entity);
        this.events.emit('entity:removed', entity);
    }

    getById(id) {
        return this._entities.get(id);
    }

    get unitCount() {
        return this._units.size;
    }

    get castleCount() {
        return this._castles.size;
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

    findAlive(owner) {
        const result = [];
        for (const u of this._units.values()) {
            if (u.owner === owner && u.curHp > 0) result.push(u);
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

    findEnemyAlive(owner) {
        return this.findEnemy(owner);
    }

    countByOwner(owner) {
        let count = 0;
        for (const u of this._units.values()) {
            if (u.owner === owner) count++;
        }
        return count;
    }

    countAlive(owner) {
        let count = 0;
        for (const u of this._units.values()) {
            if (u.owner === owner && u.curHp > 0) count++;
        }
        return count;
    }

    countByType(owner, defName) {
        let count = 0;
        for (const u of this._units.values()) {
            if (u.owner === owner && u.defName === defName) count++;
        }
        return count;
    }

    getCastle(owner) {
        for (const c of this._castles.values()) {
            if (c.owner === owner) return c;
        }
        return null;
    }

    inRange(x, range, owner) {
        const result = [];
        for (const u of this._units.values()) {
            if (u.owner !== owner && u.curHp > 0 && Math.abs(u.x - x) <= range) {
                result.push(u);
            }
        }
        return result;
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

    resolveUnitOverlap(unit, preferredX, minGap = 28) {
        let x = preferredX;
        let attempts = 0;
        const dir = unit.dir;

        while (attempts < 8) {
            let blocked = false;
            for (const u of this._units.values()) {
                if (u === unit || !u.isUnit || u.curHp <= 0) continue;
                if (Math.abs(u.x - x) < minGap) {
                    blocked = true;
                    break;
                }
            }
            if (!blocked) break;
            x += dir * (minGap + 4);
            attempts++;
        }

        return x;
    }

    destroy() {
        this._entities.clear();
        this._units.clear();
        this._castles.clear();
        this.events.clear();
    }
}
