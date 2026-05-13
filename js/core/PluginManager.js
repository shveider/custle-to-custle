"use strict";
export class PluginManager {
    constructor(game) {
        this.game = game;
        this._plugins = [];
    }

    register(plugin) {
        this._plugins.push(plugin);
        if (plugin.init) plugin.init(this.game);
        return this;
    }

    destroy() {
        for (const plugin of this._plugins) {
            if (plugin.destroy) plugin.destroy();
        }
        this._plugins = [];
    }

    get(name) {
        return this._plugins.find(p => p.name === name);
    }

    get all() {
        return [...this._plugins];
    }
}
