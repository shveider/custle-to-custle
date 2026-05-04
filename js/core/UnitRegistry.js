export class UnitRegistry {
    constructor() {
        this._registry = new Map();
    }

    register(key, UnitClass) {
        this._registry.set(key.toLowerCase(), UnitClass);
    }

    get(key) {
        return this._registry.get(key.toLowerCase());
    }

    has(key) {
        return this._registry.has(key.toLowerCase());
    }

    keys() {
        return Array.from(this._registry.keys());
    }

    getAll() {
        return new Map(this._registry);
    }

    clear() {
        this._registry.clear();
    }
}
