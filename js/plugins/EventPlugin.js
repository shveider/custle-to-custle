import { EventBanner } from '../ui/EventBanner.js';

export class EventPlugin {
    constructor(name = 'events', registry = []) {
        this.name = name;
        this.registry = registry;
        this.triggered = new Set();
        this.pendingSpawns = [];
        this.nextSpawnTime = 0;
        this.banner = new EventBanner();
    }

    init(game) {
        this.game = game;
        game.events.on('game:tick', (dt) => this.update(dt));
    }

    update(dt) {
        this._checkTriggers();
        this._processPendingSpawns();
    }

    _checkTriggers() {
        for (const evt of this.registry) {
            if (this.triggered.has(evt.id)) continue;

            const trig = evt.trigger;
            let shouldFire = false;

            if (trig.type === 'time') {
                shouldFire = this.game.time >= trig.value;
            } else if (trig.type === 'castle_hp_below') {
                const castle = this.game.entities.getCastle(trig.owner);
                if (castle) {
                    shouldFire = castle.hpPercent <= trig.value;
                }
            }

            if (shouldFire) {
                this.triggered.add(evt.id);
                this._execute(evt);
            }
        }
    }

    _execute(evt) {
        if (evt.title) this.game.events.emit('event:log', evt.title);
        if (evt.message) this.game.events.emit('event:log', evt.message);
        if (evt.title && evt.message) this.banner.show(evt.title, evt.message);

        const action = evt.action;
        if (action.type === 'spawn_wave') {
            const queue = [];
            for (const u of action.units) {
                for (let i = 0; i < u.count; i++) {
                    queue.push({ owner: action.owner, name: u.name, free: !!action.free });
                }
            }
            for (let i = queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue[i], queue[j]] = [queue[j], queue[i]];
            }
            this.pendingSpawns = queue;
            this.nextSpawnTime = this.game.time * 1000;
        } else if (action.type === 'gold_bonus') {
            this.game._hud[action.owner === 'player' ? 'gold' : 'aiGold'] += action.amount;
        } else if (action.type === 'heal_castle') {
            const castle = this.game.entities.getCastle(action.owner);
            if (castle) castle.heal(action.amount);
        }
    }

    _processPendingSpawns() {
        if (this.pendingSpawns.length === 0) return;

        const now = this.game.time * 1000;
        if (now < this.nextSpawnTime) return;

        const next = this.pendingSpawns.shift();
        this.game.spawnUnit(next.owner, next.name);

        if (this.pendingSpawns.length > 0) {
            this.nextSpawnTime = now + 500;
        }
    }

    destroy() {
        this.triggered.clear();
        this.pendingSpawns = [];
    }
}
