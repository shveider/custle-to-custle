import { getWaveCompositions, calcWaveCost, flattenWaveUnits } from './WaveCompositions.js';

const Phase = { IDLE: 'idle', PLANNING: 'planning', ATTACKING: 'attacking', DEFENDING: 'defending' };

const COUNTER_MAP = {
    swordsman: 'archer', archer: 'assassin', mage: 'assassin', supreme: 'assassin',
    tank: 'mage', assassin: 'swordsman', necromancer: 'assassin', giant: 'archer', hero: 'tank',
};

const UNIT_ROLES = {
    swordsman: { role: 'melee', tier: 1 }, archer: { role: 'ranged', tier: 1 },
    mage: { role: 'ranged', tier: 2 }, supreme: { role: 'siege', tier: 3 },
    hero: { role: 'hero', tier: 3 }, tank: { role: 'melee', tier: 2 },
    assassin: { role: 'melee', tier: 2 }, necromancer: { role: 'ranged', tier: 3 }, giant: { role: 'melee', tier: 3 },
};

export class AIManager {
    constructor(game, config = {}) {
        this.game = game;
        this.config = {
            thinkInterval: config.thinkInterval || 600,
            minSpawnScore: config.minSpawnScore || 0.15,
            allUnitTypes: config.allUnitTypes || ['swordsman', 'archer', 'mage', 'supreme', 'hero', 'tank', 'assassin', 'necromancer', 'giant'],
            goldRate: config.goldRate || 17,
            goldRateIncreaseInterval: config.goldRateIncreaseInterval || 30,
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

        this._setupListeners();
    }

    _setupListeners() {
        this.game.events.on('unit:spawn', (owner, defName) => {
            if (owner === 'player') {
                this._recentPlayerSpawns.push(defName);
                if (this._recentPlayerSpawns.length > 5) this._recentPlayerSpawns.shift();
            }
        });

        this.game.events.on('game:tick', (dt) => this.update(dt));

        this.game.events.on('game:restart', () => this._resetState());
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
            if (u.unitType === 'melee' || u.defName === 'hero') aiHasFrontline = true;
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

        if (this._dominantPlayerUnit && COUNTER_MAP[this._dominantPlayerUnit] === unitName) score += 2.0;
        const counterTarget = COUNTER_MAP[unitName];
        if (counterTarget && this.game.entities.countByType('player', counterTarget) > 0) score += 0.8;

        const myRole = UNIT_ROLES[unitName]?.role;
        if (myRole === 'melee' && !ctx.aiHasFrontline) score += 1.5;

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
