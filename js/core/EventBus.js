"use strict";
export class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    on(event, fn, ctx = null) {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        this._listeners.get(event).push({ fn, ctx });
    }

    off(event, fn) {
        if (!this._listeners.has(event)) return;
        const list = this._listeners.get(event);
        this._listeners.set(event, list.filter(l => l.fn !== fn));
    }

    emit(event, ...args) {
        if (!this._listeners.has(event)) return;
        for (const { fn, ctx } of this._listeners.get(event)) {
            fn.apply(ctx, args);
        }
    }

    clear() {
        this._listeners.clear();
    }
}
