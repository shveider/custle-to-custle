import { getWaveCompositions, calcWaveCost, flattenWaveUnits } from './WaveCompositions.js'
import { GameEvents } from '../core/Events.js'
import { UnitType } from '../core/UnitTypes.js'

const Phase = {PLANNING: 'planning', ATTACKING: 'attacking', DEFENDING: 'defending'}

const THREAT_WEIGHTS = {
  low:    {dps: 0.4, ehp: 0.2, eff: 0.4},
  medium: {dps: 0.5, ehp: 0.3, eff: 0.2},
  high:   {dps: 0.3, ehp: 0.5, eff: 0.2},
}

export class AIManager {
  constructor(game, config = {}) {
    if (!config.thinkInterval || !config.minSpawnScore) {
      throw new Error('AIManager requires thinkInterval and minSpawnScore config')
    }

    this.game = game
    this.config = {
      thinkInterval: config.thinkInterval,
      minSpawnScore: config.minSpawnScore,
      availableUnitTypes: ['swordsman', 'archer', 'mage', 'supreme', 'hero', 'tank', 'assassin', 'necromancer', 'giant'],
      goldRate: config.goldRate,
    }

    this._elapsedTime = 0
    this._totalGameTime = 0
    this._recentPlayerSpawns = []
    this._playerUnitCounts = {}
    this._mostFrequentlySpawnedUnit = null
    this._currentPhase = Phase.PLANNING
    this._plannedWave = null
    this._currentWaveSpawnIndex = 0
    this._lastWaveSpawnTimestamp = 0
    this._previousGoldAmount = 0
    this._goldHoardingDuration = 0
    this._aggressionMultiplier = 1
    this._waveCompositions = getWaveCompositions()

    this._counterUnitMap = this._buildCounterMap()
    this._unitRoleInfo = this._buildUnitRoles()

    this._setupListeners()
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  _buildCounterMap() {
    const counterMap = {}
    const reg = this.game.unitRegistry
    if (!reg) return counterMap

    for (const key of reg.keys()) {
      const stats = reg.get(key).STATS
      if (!stats) continue
      if (stats.type === UnitType.RANGED) counterMap[key] = 'assassin'
      else if (key === 'hero')            counterMap[key] = 'tank'
      else if (key === 'tank')            counterMap[key] = 'mage'
      else if (key === 'giant')           counterMap[key] = 'archer'
      else if (key === 'assassin')        counterMap[key] = 'swordsman'
      else if (key === 'necromancer')     counterMap[key] = 'assassin'
      else                                counterMap[key] = 'archer'
    }
    return counterMap
  }

  _buildUnitRoles() {
    const unitRoles = {}
    const reg = this.game.unitRegistry
    if (!reg) return unitRoles

    for (const key of reg.keys()) {
      const stats = reg.get(key).STATS
      if (!stats) continue
      unitRoles[key] = {
        role: stats.type,
        tier: stats.cost >= 300 ? 3 : stats.cost >= 150 ? 2 : 1,
      }
    }
    return unitRoles
  }

  _setupListeners() {
    this.game.events.on(GameEvents.UNIT_SPAWN, (owner, defName) => {
      if (owner === 'player') {
        this._recentPlayerSpawns.push(defName)
        if (this._recentPlayerSpawns.length > 8) this._recentPlayerSpawns.shift()
        this._playerUnitCounts[defName] = (this._playerUnitCounts[defName] || 0) + 1
      }
    })

    this.game.events.on(GameEvents.UNIT_DEATH, (owner, defName) => {
      if (owner === 'player' && this._playerUnitCounts[defName]) {
        this._playerUnitCounts[defName] = Math.max(0, this._playerUnitCounts[defName] - 1)
      }
    })

    this.game.events.on(GameEvents.TICK, (dt) => this.update(dt))
    this.game.events.on(GameEvents.RESTART, () => this._resetState())
  }

  _resetState() {
    this._elapsedTime = 0
    this._totalGameTime = 0
    this._recentPlayerSpawns = []
    this._playerUnitCounts = {}
    this._mostFrequentlySpawnedUnit = null
    this._currentPhase = Phase.PLANNING
    this._plannedWave = null
    this._currentWaveSpawnIndex = 0
    this._lastWaveSpawnTimestamp = 0
    this._previousGoldAmount = 0
    this._goldHoardingDuration = 0
    this._aggressionMultiplier = 1
  }

  // ─── Main loop ────────────────────────────────────────────────────────────

  update(dt) {
    this._elapsedTime += dt
    this._totalGameTime += dt / 1000
    if (this._elapsedTime < this.config.thinkInterval) return
    this._elapsedTime = 0

    const gold = this.game.getGold('ai')
    if (gold <= 0 && this._currentPhase !== Phase.DEFENDING) return

    this._aggressionMultiplier = 1 + Math.min(this._totalGameTime / 100, 1.5)
    this._trackGoldHoarding(gold)
    this._updateDominantUnit()

    const ctx = this._computeContext()

    this._trySpawnHero(ctx, gold)

    const phase = this._decidePhase(ctx, gold)
    if (phase !== this._currentPhase) {
      this.game.events.emit(GameEvents.AI_PHASE_CHANGE, phase)
    }
    this._currentPhase = phase

    switch (phase) {
      case Phase.DEFENDING: this._executeDefend(ctx, gold);     break
      case Phase.ATTACKING: this._executeAttackWave(ctx, gold); break
      case Phase.PLANNING:  this._executeAttackWave(ctx, gold); break
    }
  }

  // ─── Context ──────────────────────────────────────────────────────────────

  _computeContext() {
    const entities           = this.game.entities
    const aiUnits           = entities.findByOwner('ai')
    const playerUnits       = entities.findByOwner('player')
    const aiCastle          = entities.getCastle('ai')
    const playerCastle      = entities.getCastle('player')

    let nearestEnemyX       = 0
    let nearestAiUnitX      = this.game.config.battlefieldWidth
    let aiHasFrontline     = false
    let aiHasRangedUnits   = false
    let aiHeroIsAlive      = false
    let aiTotalPower       = 0
    let playerTotalPower   = 0

    for (const unit of playerUnits) {
      if (unit.x > nearestEnemyX) nearestEnemyX = unit.x
      const stats = this.game.unitRegistry.get(unit.defName)?.STATS
      if (stats) playerTotalPower += this._calculateUnitPower(stats)
    }

    for (const unit of aiUnits) {
      if (unit.x < nearestAiUnitX) nearestAiUnitX = unit.x
      const stats = this.game.unitRegistry.get(unit.defName)?.STATS
      if (stats) aiTotalPower += this._calculateUnitPower(stats)

      if (unit.unitType === UnitType.MELEE || ['hero', 'tank', 'giant'].includes(unit.defName)) {
        aiHasFrontline = true
      }
      if (unit.unitType === UnitType.RANGED || ['mage', 'archer'].includes(unit.defName)) {
        aiHasRangedUnits = true
      }
      if (unit.defName === 'hero') aiHeroIsAlive = true
    }

    const battlefieldWidth    = this.game.config.battlefieldWidth
    const battleLinePosition = (nearestEnemyX + nearestAiUnitX) / 2

    const powerRatio = playerTotalPower > 0
      ? aiTotalPower / playerTotalPower
      : aiTotalPower > 0 ? 2 : 1

    const aiCastleHpPercent = aiCastle ? aiCastle.hpPercent : 1
    let threatLevel = 'low'
    if (aiCastleHpPercent < 0.4 || nearestEnemyX > battlefieldWidth - 300)       threatLevel = 'high'
    else if (aiCastleHpPercent < 0.65 || nearestEnemyX > battlefieldWidth - 500)  threatLevel = 'medium'

    return {
      aiUnitCount:        entities.countAlive('ai'),
      playerUnitCount:     entities.countAlive('player'),
      enemyNearCastle:    nearestEnemyX > (battlefieldWidth - 350),
      aiCastleHpPct:      aiCastleHpPercent,
      playerCastleHpPct:  playerCastle ? playerCastle.hpPercent : 1,
      aiHasFrontline,
      aiHasRangedUnits,
      aiHeroIsAlive,
      nearestEnemyX,
      nearestAiUnitX,
      battleLinePosition,
      powerRatio,
      threatLevel,
      aiTotalPower,
      playerTotalPower,
      battlefieldWidth,
    }
  }

  _calculateUnitPower(stats) {
    const attackSpeed = 1000 / (stats.attackDelay || 800)
    return stats.dmg * attackSpeed * 0.5 + stats.hp * 0.3
  }

  _updateDominantUnit() {
    if (this._recentPlayerSpawns.length === 0) return
    const unitCounts = {}
    for (const unitName of this._recentPlayerSpawns) unitCounts[unitName] = (unitCounts[unitName] || 0) + 1
    let maxCount = 0
    this._mostFrequentlySpawnedUnit = null
    for (const key in unitCounts) {
      if (unitCounts[key] > maxCount) { maxCount = unitCounts[key]; this._mostFrequentlySpawnedUnit = key }
    }
  }

  _trackGoldHoarding(currentGold) {
    if (currentGold >= this._previousGoldAmount) this._goldHoardingDuration++
    else this._goldHoardingDuration = 0
    this._previousGoldAmount = currentGold
  }

  // ─── Scoring ──────────────────────────────────────────────────────────────

  _scoreUnit(unitName, gameContext) {
    const UnitClass = this.game.unitRegistry.get(unitName)
    if (!UnitClass) return -10

    const unitStats    = UnitClass.STATS
    const attackSpeed  = 1000 / (unitStats.attackDelay || 800)
    const damagePerSecond = unitStats.dmg * attackSpeed
    const effectiveHP = unitStats.hp * (unitStats.speed < 0.7 ? 1.2 : 1.0)
    const weights     = THREAT_WEIGHTS[gameContext.threatLevel]

    let score = (
      weights.dps * damagePerSecond +
      weights.ehp * effectiveHP -
      weights.eff * unitStats.cost
    ) / Math.max(unitStats.cost, 1) * 10

    score += (unitStats.range / 100) * 0.1

    if (this._mostFrequentlySpawnedUnit && this._counterUnitMap[this._mostFrequentlySpawnedUnit] === unitName) {
      score += 2.5
    }

    let counterBonus = 0
    for (const [enemyType, count] of Object.entries(this._playerUnitCounts)) {
      if (count > 0 && this._counterUnitMap[enemyType] === unitName) {
        counterBonus += 0.6 * Math.min(count, 3)
      }
    }
    score += counterBonus

    const myRole = this._unitRoleInfo[unitName]?.role
    if (myRole === UnitType.MELEE && !gameContext.aiHasFrontline) score += 2.0
    if (myRole === UnitType.RANGED && !gameContext.aiHasRangedUnits)   score += 1.2

    if (gameContext.enemyNearCastle) {
      if (unitName === 'tank' || unitName === 'giant') score += 3.5
      else if (unitName === 'swordsman')               score += 1.5
    }

    if (gameContext.aiCastleHpPct < 0.35) {
      if (unitName === 'tank')    score += 4.5
      if (unitName === 'giant')   score += 2.5
      if (unitName === 'supreme') score += 1.5
    }

    if (gameContext.powerRatio > 1.5 && this._unitRoleInfo[unitName]?.tier === 3) score += 1.5

    score += this._aggressionMultiplier * (this._unitRoleInfo[unitName]?.tier || 1) * 0.3

    if (unitName === 'hero') {
      score = gameContext.aiHeroIsAlive ? -15 : Math.min(this._totalGameTime * 0.05, 4)
    }

    const counterToThis = Object.entries(this._counterUnitMap).find(([_, v]) => v === unitName)?.[0]
    if (counterToThis && (this._playerUnitCounts[counterToThis] || 0) >= 2) {
      score -= 1.0
    }

    return score
  }

  // ─── Phase decisions ──────────────────────────────────────────────────────

  _decidePhase(gameContext, availableGold) {
    // 1. Defence always wins
    if (gameContext.enemyNearCastle || gameContext.aiCastleHpPct < 0.25) return Phase.DEFENDING;

    // 2. Continue a wave already in progress — check by wave index, not by phase
    if (this._plannedWave) {
      const totalUnits = flattenWaveUnits(this._plannedWave).length;
      if (this._currentWaveSpawnIndex < totalUnits) {
        // Bail only if army was wiped AND we're broke
        if (gameContext.aiUnitCount === 0 && availableGold < 50) {
          this._plannedWave           = null;
          this._currentWaveSpawnIndex = 0;
        } else {
          return Phase.ATTACKING;
        }
      } else {
        // Wave finished — clean up
        this._plannedWave           = null;
        this._currentWaveSpawnIndex = 0;
        this._currentPhase = Phase.PLANNING;
      }
    }

    // 3. Opportunistic push when already winning the frontline
    const pushThreshold = Math.max(0.25, 0.45 - (this._aggressionMultiplier - 1) * 0.1);
    if (
      gameContext.aiUnitCount > 0 &&
      gameContext.battleLinePosition > gameContext.battlefieldWidth * pushThreshold &&
      gameContext.powerRatio >= 0.8 &&
      (gameContext.aiUnitCount >= gameContext.playerUnitCount || gameContext.playerUnitCount <= 1)
    ) {
      return Phase.ATTACKING;
    }

    // 4. Plan and commit to a new wave - be more aggressive with spending
    const selectedWave = this._evaluateWave(gameContext, availableGold);
    if (selectedWave) {
      this._plannedWave           = selectedWave;
      this._currentWaveSpawnIndex = 0;
      return Phase.PLANNING;
    }

    // 5. If we have gold but no wave, try skirmish
    if (availableGold >= 30) {
      this._trySkirmishSpawn(gameContext, availableGold);
    }

    return Phase.PLANNING;
  }

  _evaluateWave(gameContext, availableGold) {
    let bestWave           = null;
    let bestWaveScore      = -1;

    // Threshold scales down over time so the AI doesn't hoard waiting for the "perfect" wave
    // Be much more aggressive - start waves with just 25% of cost
    const affordabilityThreshold = Math.max(0.25, 0.4 - this._totalGameTime / 300);

    for (const waveComposition of this._waveCompositions) {
      if (this._totalGameTime < waveComposition.minTime) continue;

      const waveCost = calcWaveCost(waveComposition, this.game.unitRegistry);
      if (availableGold < waveCost * affordabilityThreshold) continue;

      let currentWaveScore = 0;
      let isViable          = true;

      for (const unitType of waveComposition.units) {
        const unitScore = this._scoreUnit(unitType.type, gameContext);
        if (unitScore < -1) { isViable = false; break }
        currentWaveScore += unitScore * unitType.count;
      }
      if (!isViable) continue;

      if (availableGold >= waveCost) currentWaveScore += 3;

      const uniqueUnitTypes = new Set(waveComposition.units.map(u => u.type)).size;
      currentWaveScore += uniqueUnitTypes * 0.4;

      if (gameContext.enemyNearCastle) currentWaveScore += 3;

      currentWaveScore *= this._aggressionMultiplier;

      if (currentWaveScore > bestWaveScore) {
        bestWaveScore = currentWaveScore;
        bestWave      = {...waveComposition, totalCost: waveCost};
      }
    }

    return bestWaveScore > 0 ? bestWave : null;
  }

  // ─── Phase execution ──────────────────────────────────────────────────────

  _executeAttackWave(gameContext, availableGold) {
    if (!this._plannedWave) {
      const selectedWave = this._evaluateWave(gameContext, availableGold)
      if (selectedWave) {
        this._plannedWave              = selectedWave
        this._currentWaveSpawnIndex    = 0
        this._lastWaveSpawnTimestamp    = 0
      } else {
        this._trySkirmishSpawn(gameContext, availableGold)
        return
      }
    }

    const currentTime = this.game.time * 1000
    if (currentTime - this._lastWaveSpawnTimestamp < 200) return

    const allUnitsInWave = flattenWaveUnits(this._plannedWave)
    if (this._currentWaveSpawnIndex >= allUnitsInWave.length) {
      this._currentPhase       = Phase.PLANNING
      this._plannedWave = null
      return
    }

    const nextUnitType    = allUnitsInWave[this._currentWaveSpawnIndex]
    const UnitClass       = this.game.unitRegistry.get(nextUnitType)
    const unitCost         = UnitClass ? UnitClass.STATS.cost : 50

    if (availableGold >= unitCost) {
      this.game.spawnUnit('ai', nextUnitType)
      this._currentWaveSpawnIndex++
      this._lastWaveSpawnTimestamp = currentTime
    } else if (gameContext.aiUnitCount === 0 && availableGold < unitCost * 0.4) {
      this._currentPhase       = Phase.PLANNING
      this._plannedWave = null
    }
  }

  _executeDefend(gameContext, availableGold) {
    const scoredUnits = this.config.availableUnitTypes
      .filter(unitType => unitType !== 'hero')
      .map(unitType => ({
        unitType,
        score: this._scoreUnit(unitType, gameContext),
        cost: this.game.unitRegistry.get(unitType)?.STATS.cost || 50,
      }))
      .filter(unit => unit.score > 0)
      .sort((a, b) => b.score - a.score);

    let remainingGold   = availableGold;
    let spawnCount      = 0;
    const maxSpawnCount = gameContext.aiCastleHpPct < 0.3 ? 6 : 4;

    for (const unit of scoredUnits) {
      if (unit.cost > remainingGold || spawnCount >= maxSpawnCount) continue;
      this.game.spawnUnit('ai', unit.unitType);
      remainingGold -= unit.cost;
      spawnCount++;
    }
  }

  _trySkirmishSpawn(gameContext, availableGold) {
    if (gameContext.aiUnitCount >= 8) return;

    // Spend even tiny amounts of gold - don't hoard
    const minGoldThreshold = 30;
    if (availableGold < minGoldThreshold) return;

    const candidateUnits = this.config.availableUnitTypes
      .filter(unitType => unitType !== 'hero')
      .map(unitType => ({
        unitType,
        score: this._scoreUnit(unitType, gameContext),
        cost: this.game.unitRegistry.get(unitType)?.STATS.cost || 50,
      }))
      .filter(unit => unit.cost <= availableGold && unit.score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidateUnits.length > 0) {
      this.game.spawnUnit('ai', candidateUnits[0].unitType);
    }
  }

  _trySpawnHero(gameContext, availableGold) {
    if (gameContext.aiHeroIsAlive) return false

    const HeroClass = this.game.unitRegistry.get('hero')
    if (!HeroClass) return false

    const heroCost = HeroClass.STATS.cost
    if (gameContext.enemyNearCastle && availableGold < heroCost * 1.5) return false

    if (availableGold >= heroCost) {
      const heroScore = this._scoreUnit('hero', gameContext)
      if (heroScore > this.config.minSpawnScore) {
        this.game.spawnUnit('ai', 'hero')
        return true
      }
    }
    return false
  }
}