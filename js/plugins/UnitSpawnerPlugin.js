import { Castle } from '../entities/Castle.js';
import { Skeleton } from '../units/Skeleton.js';
import { GameEvents, EntityEvents } from '../core/Events.js';

export class UnitSpawnerPlugin {
    constructor(name = 'unitSpawner') {
        this.name = name;
        this._heroCooldown = 0;
        this._heroAvailable = true;
        this._heroRespawn = 0;
        this._aiHeroCooldown = 0;
        this._aiHeroAvailable = true;
        this._aiHeroRespawn = 0;
    }

    init(game) {
        this.game = game;
        this._heroCooldown = 0;
        this._heroAvailable = true;
        this._heroRespawn = 0;
        this._aiHeroCooldown = 0;
        this._aiHeroAvailable = true;
        this._aiHeroRespawn = 0;

        game.events.on(GameEvents.UNIT_SPAWN, (owner, defName, options = {}) => {
            this._spawn(owner, defName, options);
        });

        game.events.on(GameEvents.HERO_DEPLOY, () => {
            this._spawnHero('player');
        });

        game.events.on(GameEvents.UNIT_SUMMON, (owner, defName, options) => {
            this._spawn(owner, defName, options);
        });

        game.entities.events.on(EntityEvents.UNIT_REMOVED, (unit) => {
            this._onUnitRemoved(unit);
        });

        game.events.on(GameEvents.TICK, (dt) => this._update(dt));
    }

    destroy() {
        this._heroCooldown = 0;
        this._heroAvailable = true;
        this._heroRespawn = 0;
        this._aiHeroCooldown = 0;
        this._aiHeroAvailable = true;
        this._aiHeroRespawn = 0;
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
    }

    _spawn(owner, defName, options = {}) {
        if (defName === 'hero') {
            this._spawnHero(owner);
            return;
        }
        if (defName === 'skeleton') {
            this._spawnSkeleton(owner, options.x || 0);
            return;
        }

        const UnitClass = this.game.unitRegistry.get(defName);
        if (!UnitClass) return;

        if (!options.free && this.game.entities.countAlive(owner) >= (this.game.config.maxUnitsPerSide || 80)) return;

        const prefX = owner === 'player'
            ? (options.x || this.game.config.playerCastleX + this.game.config.spawnXOffset)
            : (options.x || this.game.config.aiCastleX - this.game.config.spawnXOffset);

        const unit = UnitClass.create(this.game.entities.nextId, owner);
        unit.x = this.game.entities.resolveUnitOverlap(unit, prefX);

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
            ? (this.game.config.playerCastleX + this.game.config.spawnXOffset)
            : (this.game.config.aiCastleX - this.game.config.spawnXOffset);

        const unit = UnitClass.create(this.game.entities.nextId, owner, {}, level);
        unit.x = this.game.entities.resolveUnitOverlap(unit, prefX);

        if (this.game.entities.units.some(u => u.owner === owner && u.defName === 'hero')) return;

        this.game.entities.add(unit);

        const cd = UnitClass.STATS.cooldown || 60000;
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
