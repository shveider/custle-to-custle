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

    unregister(name) {
        const idx = this._plugins.findIndex(p => p.name === name);
        if (idx !== -1) {
            const plugin = this._plugins[idx];
            if (plugin.destroy) plugin.destroy();
            this._plugins.splice(idx, 1);
        }
    }

    update(dt) {
        for (const plugin of this._plugins) {
            if (plugin.update) plugin.update(dt);
        }
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
