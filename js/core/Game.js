"use strict";
import { EventBus } from './EventBus.js';
import { EntityManager } from './EntityManager.js';
import { PluginManager } from './PluginManager.js';
import { GameEvents } from './Events.js';

export class Game {
    constructor(config) {
        this.config = config;
        this.events = new EventBus();
        this.entities = new EntityManager();
        this.plugins = new PluginManager(this);
        this.running = false;
        this.paused = false;
        this.ended = false;
        this.time = 0;
        this.speedMultiplier = 1;
        this._accumulator = 0;
        this._lastTime = 0;
        this._fixedDt = config.fixedDt || 1000 / 60;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.ended = false;
        this._lastTime = performance.now();
        this.events.emit(GameEvents.START);
        this._loop();
    }

    stop() {
        this.running = false;
        this.events.emit(GameEvents.STOP);
    }

    restart() {
        this.running = false;
        this.entities.destroy();
        this.entities = new EntityManager();
        this.time = 0;
        this.paused = false;
        this.ended = false;
        this.speedMultiplier = 1;
        this._accumulator = 0;
        this._lastTime = performance.now();

        this.plugins.all.forEach(p => {
            if (p.destroy) p.destroy();
        });

        this.events.emit(GameEvents.RESTART);

        this.plugins.all.forEach(p => {
            if (p.init) p.init(this);
        });

        this.start();
    }

    togglePause() {
        this.paused = !this.paused;
        this.events.emit(GameEvents.PAUSE, this.paused);
        return this.paused;
    }

    setSpeed(multiplier) {
        this.speedMultiplier = Math.max(1, Math.min(4, multiplier));
        this.events.emit(GameEvents.SPEED, this.speedMultiplier);
    }

    end(winner) {
        if (this.ended) return;
        this.ended = true;
        this.events.emit(GameEvents.END, winner);
        setTimeout(() => this.stop(), 100);
    }

    addGold(owner, amount) {
        this.events.emit(GameEvents.GOLD, owner, amount);
    }

    getGold(owner) {
        let gold = 0;
        this.events.emit(GameEvents.GET_GOLD, owner, (value) => { gold = value; });
        return gold;
    }

    spawnUnit(owner, defName, options = {}) {
        this.events.emit(GameEvents.UNIT_SPAWN, owner, defName, options);
    }

    damageCastle(owner, amount) {
        this.events.emit(GameEvents.CASTLE_DAMAGE, owner, amount);
    }

    _loop(now) {
        if (!this.running) return;

        const timestamp = now || performance.now();
        const dt = timestamp - this._lastTime;
        this._lastTime = timestamp;

        this._accumulator += Math.min(dt, 100);

        while (this._accumulator >= this._fixedDt) {
            if (!this.paused && !this.ended) {
                this._update(this._fixedDt);
            }
            this._accumulator -= this._fixedDt;
        }

        if (!this.ended) {
            requestAnimationFrame((t) => this._loop(t));
        }
    }

    _update(fixedDt) {
        const effDt = fixedDt * this.speedMultiplier;
        this.time += effDt / 1000;

        this.events.emit(GameEvents.TICK, effDt, this.time);
    }
}
