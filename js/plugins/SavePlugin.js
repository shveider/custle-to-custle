"use strict";
export class SavePlugin {
    constructor(name = 'save') {
        this.name = name;
    }

    init(game) {
        this.game = game;
        this._load();
    }

    update() {
        this._save();
    }

    _save() {
        try {
            const data = {
                heroLevel: this.game._hud._heroLevel,
                heroExp: this.game._hud._heroExp,
                heroExpToNext: this.game._hud._heroExpToNext,
                sfxEnabled: this.game.plugins.get('sfx')?.enabled ?? true,
            };
            localStorage.setItem('ccam_save', JSON.stringify(data));
        } catch (_) { }
    }

    _load() {
        try {
            const raw = localStorage.getItem('ccam_save');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (typeof data.heroLevel === 'number') this.game._hud._heroLevel = data.heroLevel;
            if (typeof data.heroExp === 'number') this.game._hud._heroExp = data.heroExp;
            if (typeof data.heroExpToNext === 'number') this.game._hud._heroExpToNext = data.heroExpToNext;
        } catch (_) { }
    }

    destroy() {
        try { localStorage.removeItem('ccam_save'); } catch (_) { }
    }
}
