import { getWaveCompositions, calcWaveCost, flattenWaveUnits } from './WaveCompositions.js';
import { GameEvents } from '../core/Events.js';
import { UnitType } from '../core/UnitTypes.js';

const Phase = { IDLE: 'idle', PLANNING: 'planning', ATTACKING: 'attacking', DEFENDING: 'defending' };

export class AIManager {
    constructor(game, config = {}) {
        this.game = game;
        this.config = {
            thinkInterval: config.thinkInterval || 600,
            minSpawnScore: config.minSpawnScore || 0.15,
            allUnitTypes: config.allUnitTypes || ['swordsman', 'archer', 'mage', 'supreme', 'hero', 'tank', 'assassin', 'necromancer', 'giant'],
            goldRate: config.goldRate,
        };

        this._timeAccumulator = 0;
        this._gameTime = 0;
        this._recentPlayerSpawns = [];
        this._dominantPlayerUnit = null;
        this._phase = Phase.IDLE;
        this._plannedWave = null;
        this._waveSpawnIndex = 0;
        this._lastWaveSpawnTime = 0;
        this._compositions = getWaveCompositions();

        this._counterMap = this._buildCounterMap();
        this._unitRoles = this._buildUnitRoles();

        this._setupListeners();
    }

    _buildCounterMap() {
        const counterMap = {};
        const unitRegistry = this.game.unitRegistry;
        if (!unitRegistry) return counterMap;

        for (const key of unitRegistry.keys()) {
            const UnitClass = unitRegistry.get(key);
            if (UnitClass.STATS?.type === UnitType.RANGED) {
                counterMap[key] = 'assassin';
            } else if (key === 'hero') {
                counterMap[key] = 'tank';
            } else if (key === 'tank') {
                counterMap[key] = 'mage';
            } else if (key === 'giant') {
                counterMap[key] = 'archer';
            } else {
                counterMap[key] = 'archer';
            }
        }
        return counterMap;
    }

    _buildUnitRoles() {
        const unitRoles = {};
        const unitRegistry = this.game.unitRegistry;
        if (!unitRegistry) return unitRoles;

        for (const key of unitRegistry.keys()) {
            const UnitClass = unitRegistry.get(key);
            const stats = UnitClass.STATS;
            if (!stats) continue;

            let tier = 1;
            if (stats.cost >= 300) tier = 3;
            else if (stats.cost >= 150) tier = 2;

            unitRoles[key] = {
                role: stats.type,
                tier: tier,
            };
        }
        return unitRoles;
    }

    _setupListeners() {
        this.game.events.on(GameEvents.UNIT_SPAWN, (owner, defName) => {
            if (owner === 'player') {
                this._recentPlayerSpawns.push(defName);
                if (this._recentPlayerSpawns.length > 5) this._recentPlayerSpawns.shift();
            }
        });

        this.game.events.on(GameEvents.TICK, (dt) => this.update(dt));

        this.game.events.on(GameEvents.RESTART, () => this._resetState());
    }

    _resetState() {
        this._timeAccumulator = 0;
        this._gameTime = 0;
        this._recentPlayerSpawns = [];
        this._dominantPlayerUnit = null;
        this._phase = Phase.IDLE;
        this._plannedWave = null;
        this._waveSpawnIndex = 0;
        this._lastWaveSpawnTime = 0;
    }

    update(dt) {
        this._timeAccumulator += dt;
        this._gameTime += dt / 1000;
        if (this._timeAccumulator < this.config.thinkInterval) return;
        this._timeAccumulator = 0;

        const gold = this.game.getGold('ai');
        if (gold <= 0 && this._phase !== Phase.DEFENDING) return;

        const ctx = this._computeContext();

        if (this._trySpawnHero(ctx, gold)) return;

        const phase = this._decidePhase(ctx, gold);
        this._phase = phase;

        switch (phase) {
            case Phase.DEFENDING: this._executeDefend(ctx, gold); break;
            case Phase.ATTACKING: this._executeAttackWave(ctx, gold); break;
            case Phase.PLANNING: this._executeAttackWave(ctx, gold); break;
            case Phase.IDLE: this._tryIdleSkirmish(ctx, gold); break;
        }
    }

    _computeContext() {
        const entities = this.game.entities;
        const aiUnits = entities.findByOwner('ai');
        const playerUnits = entities.findByOwner('player');
        const aiCastle = entities.getCastle('ai');
        const playerCastle = entities.getCastle('player');

        let nearestEnemyX = 0;
        let nearestAiX = this.game.config.battlefieldWidth;
        let aiHasFrontline = false;
        let aiHeroAlive = false;

        for (const u of playerUnits) {
            if (u.x > nearestEnemyX) nearestEnemyX = u.x;
        }
        for (const u of aiUnits) {
            if (u.x < nearestAiX) nearestAiX = u.x;
            if (u.unitType === UnitType.MELEE || u.defName === 'hero') aiHasFrontline = true;
            if (u.defName === 'hero') aiHeroAlive = true;
        }

        if (this._recentPlayerSpawns.length > 0) {
            const counts = {};
            for (const s of this._recentPlayerSpawns) counts[s] = (counts[s] || 0) + 1;
            let maxC = 0;
            this._dominantPlayerUnit = null;
            for (const k in counts) {
                if (counts[k] > maxC) { maxC = counts[k]; this._dominantPlayerUnit = k; }
            }
        }

        return {
            aiUnitCount: entities.countAlive('ai'),
            playerUnitCount: entities.countAlive('player'),
            enemyNearCastle: nearestEnemyX > (this.game.config.battlefieldWidth - 350),
            aiCastleHpPct: aiCastle ? aiCastle.hpPercent : 1,
            aiHasFrontline,
            aiHeroAlive,
            nearestEnemyX,
            nearestAiX,
            battleLineX: (nearestEnemyX + nearestAiX) / 2,
        };
    }

    _scoreUnit(unitName, ctx) {
        const UnitClass = this.game.unitRegistry.get(unitName);
        if (!UnitClass) return -10;
        const s = UnitClass.STATS;
        const attacksPerSec = 1000 / (s.attackDelay || 800);
        const dps = s.dmg * attacksPerSec;
        const effectiveHP = s.hp / (s.speed < 0.7 ? 0.9 : 1);

        let score = (dps * 0.5 + effectiveHP * 0.3) / Math.max(s.cost, 1);
        score += (s.range / 100) * 0.15;

        if (this._dominantPlayerUnit && this._counterMap[this._dominantPlayerUnit] === unitName) score += 2.0;
        const counterTarget = this._counterMap[unitName];
        if (counterTarget && this.game.entities.countByType('player', counterTarget) > 0) score += 0.8;

        const myRole = this._unitRoles[unitName]?.role;
        if (myRole === UnitType.MELEE && !ctx.aiHasFrontline) score += 1.5;

        if (ctx.enemyNearCastle) {
            if (unitName === 'tank' || unitName === 'giant') score += 3.0;
            else if (unitName === 'swordsman') score += 1.5;
        }

        if (ctx.aiCastleHpPct < 0.3) {
            if (unitName === 'tank') score += 4.0;
            else if (unitName === 'giant') score += 2.5;
        }

        if (unitName === 'hero') score += ctx.aiHeroAlive ? -15 : this._gameTime * 0.04;

        return score;
    }

    _decidePhase(ctx, gold) {
        if (ctx.enemyNearCastle) return Phase.DEFENDING;

        if (ctx.aiUnitCount === 0 && this._phase === Phase.ATTACKING) {
            if (this.game.time * 1000 - this._lastWaveSpawnTime > 5000 && gold < 100) {
                this._phase = Phase.IDLE;
                this._plannedWave = null;
            }
        }

        if (this._phase === Phase.ATTACKING && this._plannedWave) {
            const totalUnits = this._plannedWave.units.reduce((s, u) => s + u.count, 0);
            if (this._waveSpawnIndex >= totalUnits) {
                this._phase = Phase.IDLE;
                this._plannedWave = null;
            } else if (ctx.aiUnitCount > ctx.playerUnitCount + 1 && ctx.battleLineX > this.game.config.battlefieldWidth * 0.5) {
                return Phase.ATTACKING;
            }
        }

        if (this._phase === Phase.ATTACKING) {
            if (ctx.aiUnitCount === 0 && gold < 200) {
                this._phase = Phase.IDLE;
                this._plannedWave = null;
            }
            return Phase.ATTACKING;
        }

        if (ctx.aiUnitCount > 0 && ctx.battleLineX > this.game.config.battlefieldWidth * 0.55) {
            if (ctx.aiUnitCount >= ctx.playerUnitCount || ctx.playerUnitCount <= 1) return Phase.ATTACKING;
        }

        const wave = this._evaluateWave(ctx, gold);
        if (wave) {
            if (!this._plannedWave || this._plannedWave.name !== wave.name) {
                this._plannedWave = wave;
                this._waveSpawnIndex = 0;
            }
            return Phase.PLANNING;
        }

        return Phase.IDLE;
    }

    _evaluateWave(ctx, gold) {
        let best = null;
        let bestScore = -1;

        for (const comp of this._compositions) {
            if (this._gameTime < comp.minTime) continue;

            const cost = calcWaveCost(comp, this.game.unitRegistry);
            if (gold < cost * 0.5) continue;

            let waveScore = 0;
            let viable = true;
            for (const u of comp.units) {
                const s = this._scoreUnit(u.type, ctx);
                if (s < -1) { viable = false; break; }
                waveScore += s * u.count;
            }
            if (!viable) continue;
            if (gold >= cost) waveScore += 3;
            waveScore += comp.units.length * 0.5;
            if (ctx.enemyNearCastle) waveScore += 2;

            if (waveScore > bestScore) {
                bestScore = waveScore;
                best = { ...comp, totalCost: cost };
            }
        }

        return bestScore > 0 ? best : null;
    }

    _executeAttackWave(ctx, gold) {
        if (!this._plannedWave) {
            const wave = this._evaluateWave(ctx, gold);
            if (wave) {
                this._plannedWave = wave;
                this._waveSpawnIndex = 0;
                this._lastWaveSpawnTime = 0;
            } else {
                this._phase = Phase.IDLE;
                return;
            }
        }

        const now = this.game.time * 1000;
        if (now - this._lastWaveSpawnTime < 200) return;

        const allUnits = flattenWaveUnits(this._plannedWave);
        if (this._waveSpawnIndex >= allUnits.length) {
            this._phase = Phase.IDLE;
            this._plannedWave = null;
            return;
        }

        const nextType = allUnits[this._waveSpawnIndex];
        const UnitClass = this.game.unitRegistry.get(nextType);
        const cost = UnitClass ? UnitClass.STATS.cost : 50;

        if (gold >= cost) {
            this.game.spawnUnit('ai', nextType);
            this._waveSpawnIndex++;
            this._lastWaveSpawnTime = now;
        } else if (ctx.aiUnitCount === 0 && gold < cost * 0.5) {
            this._phase = Phase.IDLE;
            this._plannedWave = null;
        }
    }

    _executeDefend(ctx, gold) {
        const scoredUnits = [];
        for (const name of this.config.allUnitTypes) {
            scoredUnits.push({ name, score: this._scoreUnit(name, ctx), cost: this.game.unitRegistry.get(name)?.STATS.cost || 50 });
        }
        scoredUnits.sort((a, b) => b.score - a.score);

        let spawns = 0;
        let remaining = gold;
        for (const u of scoredUnits) {
            if (u.name === 'hero' || u.cost > remaining || u.score <= 0 || spawns >= 3) continue;
            this.game.spawnUnit('ai', u.name);
            remaining -= u.cost;
            spawns++;
        }
    }

    _tryIdleSkirmish(ctx, gold) {
        if (ctx.aiUnitCount >= 3) return;
        if (gold < 60) return;

        const cheapUnits = ['swordsman', 'archer'];
        for (const name of cheapUnits) {
            const UnitClass = this.game.unitRegistry.get(name);
            if (UnitClass && gold >= UnitClass.STATS.cost) {
                this.game.spawnUnit('ai', name);
                return;
            }
        }
    }

    _trySpawnHero(ctx, gold) {
        if (ctx.aiHeroAlive) return false;
        if (gold >= this.game.unitRegistry.get('hero')?.STATS.cost || 0) {
            const score = this._scoreUnit('hero', ctx);
            if (score > this.config.minSpawnScore) {
                this.game.spawnUnit('ai', 'hero');
                return true;
            }
        }
        return false;
    }
}
