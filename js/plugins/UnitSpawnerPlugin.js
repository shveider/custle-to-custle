import { GameEvents, EntityEvents } from '../core/Events.js';
import { GameBalance } from '../core/GameBalance.js';

export class UnitSpawnerPlugin {
    constructor(name = 'unitSpawner') {
        this.name = name;
        this._heroCooldown = 0;
        this._heroAvailable = true;
        this._heroRespawn = 0;
        this._aiHeroCooldown = 0;
        this._aiHeroAvailable = true;
        this._aiHeroRespawn = 0;
        this._boundHandlers = [];
        this._spawnQueue = [];
        this._spawnDelay = 120; // ms between spawns
        this._spawnTimer = 0;
    }

    init(game) {
        this.game = game;
        this._heroCooldown = 0;
        this._heroAvailable = true;
        this._heroRespawn = 0;
        this._aiHeroCooldown = 0;
        this._aiHeroAvailable = true;
        this._aiHeroRespawn = 0;
        this._spawnQueue = [];
        this._spawnTimer = 0;

        const onSpawn = (owner, defName, options = {}) => {
            this._spawn(owner, defName, options);
        };
        const onHeroDeploy = () => {
            this._spawnHero('player');
        };
        const onSummon = (owner, defName, options) => {
            this._spawn(owner, defName, options);
        };
        const onUnitRemoved = (unit) => {
            this._onUnitRemoved(unit);
        };
        const onTick = (dt) => this._update(dt);

        const gameEvents = game.events;
        const entityEvents = game.entities.events;

        gameEvents.on(GameEvents.UNIT_SPAWN, onSpawn);
        gameEvents.on(GameEvents.HERO_DEPLOY, onHeroDeploy);
        gameEvents.on(GameEvents.UNIT_SUMMON, onSummon);
        gameEvents.on(GameEvents.TICK, onTick);
        entityEvents.on(EntityEvents.UNIT_REMOVED, onUnitRemoved);

        this._boundHandlers = [
            [gameEvents, GameEvents.UNIT_SPAWN, onSpawn],
            [gameEvents, GameEvents.HERO_DEPLOY, onHeroDeploy],
            [gameEvents, GameEvents.UNIT_SUMMON, onSummon],
            [gameEvents, GameEvents.TICK, onTick],
            [entityEvents, EntityEvents.UNIT_REMOVED, onUnitRemoved],
        ];
    }

    destroy() {
        for (const [bus, event, handler] of this._boundHandlers) {
            bus.off(event, handler);
        }
        this._boundHandlers = [];
        this._heroCooldown = 0;
        this._heroAvailable = true;
        this._heroRespawn = 0;
        this._aiHeroCooldown = 0;
        this._aiHeroAvailable = true;
        this._aiHeroRespawn = 0;
        this._spawnQueue = [];
        this._spawnTimer = 0;
    }

    _update(dt) {
        if (this._heroCooldown > 0) {
            this._heroCooldown -= dt;
            if (this._heroCooldown <= 0) this._heroCooldown = 0;
        }

        if (this._heroRespawn > 0) {
            this._heroRespawn -= dt;
            if (this._heroRespawn <= 0) {
                this._heroRespawn = 0;
                this._heroAvailable = true;
                this._heroCooldown = 0;
                this.game.events.emit(GameEvents.HERO_AVAILABLE);
            }
        }

        if (this._aiHeroRespawn > 0) {
            this._aiHeroRespawn -= dt;
            if (this._aiHeroRespawn <= 0) {
                this._aiHeroRespawn = 0;
                this._aiHeroAvailable = true;
                this._aiHeroCooldown = 0;
            }
        }

        if (this._aiHeroCooldown > 0) {
            this._aiHeroCooldown -= dt;
            if (this._aiHeroCooldown <= 0) this._aiHeroCooldown = 0;
        }

        this.game._heroCooldown = this._heroCooldown;
        this.game._heroAvailable = this._heroAvailable;
        this.game._heroRespawn = this._heroRespawn;

        // Process spawn queue with delay
        this._spawnTimer -= dt;
        if (this._spawnTimer <= 0 && this._spawnQueue.length > 0) {
            const spawn = this._spawnQueue.shift();
            this._processSpawn(spawn);
            this._spawnTimer = this._spawnDelay;
        }
    }

    _spawn(owner, defName, options = {}) {
        if (defName === 'hero') {
            this._spawnHero(owner);
            return;
        }
        if (defName === 'skeleton') {
            this._spawnQueue.push({ owner, defName, options, isSkeleton: true });
            return;
        }

        const UnitClass = this.game.unitRegistry.get(defName);
        if (!UnitClass) return;

        if (!options.free && this.game.entities.countAlive(owner) >= (this.game.config.maxUnitsPerSide || 80)) return;

        // Queue spawn request for delayed processing
        this._spawnQueue.push({ owner, defName, options, UnitClass });
    }

    _processSpawn({ owner, defName, options, UnitClass, isSkeleton }) {
        if (isSkeleton) {
            this._spawnSkeleton(owner, options.x || 0);
            return;
        }

        // Use fixed spawn position without overlap resolution
        const prefX = owner === 'player'
            ? (options.x || this.game.config.playerCastleX)
            : (options.x || this.game.config.aiCastleX);

        const unit = UnitClass.create(this.game.entities.nextId, owner);
        unit.x = prefX; // Fixed position, no overlap resolution

        if (unit.special.unique) {
            if (this.game.entities.units.some(u => u.owner === owner && u.defName === defName)) return;
        }

        this.game.entities.add(unit);
        this.game.events.emit(GameEvents.UNIT_SPAWNED, unit);
    }

    _spawnHero(owner) {
        if (owner === 'player' && (!this._heroAvailable || this._heroCooldown > 0)) return;
        if (owner === 'ai' && (!this._aiHeroAvailable || this._aiHeroCooldown > 0)) return;

        const UnitClass = this.game.unitRegistry.get('hero');
        if (!UnitClass) return;

        const level = owner === 'player' ? this.game._hud._heroLevel : 1;
        const prefX = owner === 'player'
            ? (this.game.config.playerCastleX)
            : (this.game.config.aiCastleX);

        const unit = UnitClass.create(this.game.entities.nextId, owner, {}, level);
        unit.x = prefX; // Fixed position, no overlap resolution

        if (this.game.entities.units.some(u => u.owner === owner && u.defName === 'hero')) return;

        this.game.entities.add(unit);

        const cd = GameBalance.hero.deployCooldown || 60000;
        if (owner === 'player') {
            this._heroCooldown = cd;
            this._heroAvailable = false;
        } else {
            this._aiHeroCooldown = cd;
            this._aiHeroAvailable = false;
        }

        this.game.events.emit(GameEvents.UNIT_SPAWNED, unit);
    }

    _spawnSkeleton(owner, x) {
        const SkeletonClass = this.game.unitRegistry.get('skeleton');
        if (!SkeletonClass) return;

        const unit = SkeletonClass.create(this.game.entities.nextId, owner);
        unit.x = x;

        this.game.entities.add(unit);
        this.game.fx.spawnSummonEffect(x);
    }

    _onUnitRemoved(unit) {
        if (unit.defName === 'hero') {
            if (unit.owner === 'player') {
                this._heroAvailable = false;
                this._heroRespawn = 30000;
            } else {
                this._aiHeroAvailable = false;
                this._aiHeroRespawn = 30000;
            }
        }
    }
}
