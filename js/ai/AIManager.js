"use strict";
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
    if (!config.thinkInterval) {
      throw new Error('AIManager requires thinkInterval config')
    }

    this.game = game
    this.config = {
      thinkInterval: config.thinkInterval,
      availableUnitTypes: ['swordsman', 'archer', 'mage', 'supreme', 'hero', 'tank', 'assassin', 'necromancer', 'giant'],
      goldRate: config.goldRate,
    }

    this._elapsedTime = 0
    this._totalGameTime = 0
    this._recentPlayerSpawns = []
    this._playerUnitCounts = {}
    this._mostFrequentlySpawnedUnit = null
    this._currentPhase = Phase.PLANNING
    this._previousGoldAmount = 0
    this._goldHoardingDuration = 0
    this._aggressionMultiplier = 1
    this._attackSpawnCooldown = 0

    this._counterUnitMap = this._buildCounterMap()
    this._unitRoleInfo = this._buildUnitRoles()
    this._unitScoreData = this._buildUnitScoreData()

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

  _buildUnitScoreData() {
    const data = {}
    const reg = this.game.unitRegistry
    if (!reg) return data

    for (const key of reg.keys()) {
      const UnitClass = reg.get(key)
      if (!UnitClass || !UnitClass.STATS) continue
      const stats = UnitClass.STATS
      const attackSpeed = 1000 / stats.attackDelay
      data[key] = {
        dps: stats.dmg * attackSpeed,
        effectiveHP: stats.hp * (stats.speed < 0.7 ? 1.2 : 1.0),
        cost: stats.cost,
        rangeBonus: (stats.range / 100) * 0.1,
        role: this._unitRoleInfo[key]?.role,
        tier: this._unitRoleInfo[key]?.tier,
        counteredBy: Object.entries(this._counterUnitMap).find(([_, v]) => v === key)?.[0],
      }
    }
    return data
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
    this._previousGoldAmount = 0
    this._goldHoardingDuration = 0
    this._aggressionMultiplier = 1
    this._attackSpawnCooldown = 0
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

    this._trySpawnHero(ctx)

    const phase = this._decidePhase(ctx, gold)

    if (phase !== this._currentPhase) {
      this.game.events.emit(GameEvents.AI_PHASE_CHANGE, phase)
    }

    this._currentPhase = phase

    switch (phase) {
      case Phase.DEFENDING: this._executeDefend(ctx, gold);     break
      case Phase.ATTACKING: this._executeAttack(ctx, gold);   break
      case Phase.PLANNING:  this._executePlanning(ctx, gold);      break
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
      playerTotalPower += this._calculateUnitPower(unit)
    }

    for (const unit of aiUnits) {
      if (unit.x < nearestAiUnitX) nearestAiUnitX = unit.x
      aiTotalPower += this._calculateUnitPower(unit)

      if (unit.unitType === UnitType.MELEE || ['hero', 'tank', 'giant'].includes(unit.defName)) {
        aiHasFrontline = true // TODO: is is helpful?
      }
      if (unit.unitType === UnitType.RANGED || ['mage', 'archer'].includes(unit.defName)) {
        aiHasRangedUnits = true // TODO: is is helpful?
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

    if (aiCastleHpPercent < 0.4 || nearestEnemyX > battlefieldWidth - 300) {
      threatLevel = 'high'
    } else if (aiCastleHpPercent < 0.65 || nearestEnemyX > battlefieldWidth - 500) {
      threatLevel = 'medium'
    }

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

  _calculateUnitPower(unit) {
    const attackSpeed = 1000 / unit.attackDelay
    return unit.dmg * attackSpeed * 0.2 + unit.curHp * 0.05 + unit.speed * 0.05 + unit.range * 0.05
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
    const base = this._unitScoreData[unitName]
    if (!base) return -10

    const weights = THREAT_WEIGHTS[gameContext.threatLevel]

    let score = (
      weights.dps * base.dps +
      weights.ehp * base.effectiveHP -
      weights.eff * base.cost
    ) / Math.max(base.cost, 1) * 10

    score += base.rangeBonus

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

    if (base.role === UnitType.MELEE && !gameContext.aiHasFrontline) score += 2.0
    if (base.role === UnitType.RANGED && !gameContext.aiHasRangedUnits)   score += 1.2

    if (gameContext.enemyNearCastle) {
      if (unitName === 'tank' || unitName === 'giant') score += 3
      else if (unitName === 'swordsman')               score += 1
      else if (unitName === 'supreme') score += 1.5
    }

    if (gameContext.aiCastleHpPct < 0.35) {
      if (unitName === 'tank')    score += 4.5
      if (unitName === 'giant')   score += 2.5
      if (unitName === 'supreme') score += 1.5
    }

    if (gameContext.powerRatio > 1.5 && base.tier === 3) score += 1.5

    score += this._aggressionMultiplier * (base.tier || 1) * 0.3

    if (unitName === 'hero') {
      score = gameContext.aiHeroIsAlive ? -15 : Math.min(this._totalGameTime * 0.05, 4)
    }

    if (base.counteredBy && (this._playerUnitCounts[base.counteredBy] || 0) >= 2) {
      score -= 1.0
    }

    return score
  }

  // ─── Phase decisions ──────────────────────────────────────────────────────

  _decidePhase(gameContext, availableGold) {
    // 1. Defence always wins
    if (gameContext.enemyNearCastle) return Phase.DEFENDING;

    if (availableGold < 400) {
      return Phase.PLANNING;
    }

    // 2. Opportunistic push when already winning the frontline
    const pushThreshold = Math.max(0.25, 0.45 - (this._aggressionMultiplier - 1) * 0.1);
    if (
      gameContext.aiUnitCount > 0 &&
      gameContext.battleLinePosition > gameContext.battlefieldWidth * pushThreshold &&
      gameContext.powerRatio >= 0.8 &&
      (gameContext.aiUnitCount >= gameContext.playerUnitCount || gameContext.playerUnitCount <= 1)
    ) {
      return Phase.ATTACKING;
    }

    // 3. Transition to attack if we have significant gold and advantage
    if (availableGold >= 300 && gameContext.powerRatio >= 0.7) {
      return Phase.ATTACKING;
    }

    // 4. Build up while saving
    return Phase.PLANNING;
  }

  // ─── Phase execution ──────────────────────────────────────────────────────

  _executeAttack(gameContext, availableGold) {
    this._attackSpawnCooldown -= this.config.thinkInterval
    if (this._attackSpawnCooldown > 0) return

    if (availableGold <= 150) return

    const scoredUnits = this.config.availableUnitTypes
      .filter(unitType => unitType !== 'hero')
      .map(unitType => ({
        unitType,
        score: this._scoreUnit(unitType, gameContext),
        cost: this.game.unitRegistry.get(unitType)?.STATS.cost,
      }))
      .filter(unit => unit.cost <= availableGold && unit.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredUnits.length === 0) return

    // Build a balanced attack squad: ensure frontline first, then ranged, then flex
    const frontline = scoredUnits.filter(u => {
      const stats = this.game.unitRegistry.get(u.unitType)?.STATS
      return stats && (stats.type === UnitType.MELEE || ['tank', 'giant'].includes(u.unitType))
    })

    const ranged = scoredUnits.filter(u => {
      const stats = this.game.unitRegistry.get(u.unitType)?.STATS
      return stats && stats.type === UnitType.RANGED && !['tank', 'giant'].includes(u.unitType)
    })

    let unitToSpawn = null

    if (!gameContext.aiHasFrontline && frontline.length > 0) {
      unitToSpawn = frontline[0]
    } else if (!gameContext.aiHasRangedUnits && ranged.length > 0) {
      unitToSpawn = ranged[0]
    } else if (scoredUnits.length > 0) {
      // Pick from top 3 with slight randomness for variety
      const topN = scoredUnits.slice(0, Math.min(3, scoredUnits.length))
      unitToSpawn = topN[Math.floor(Math.random() * topN.length)]
    }

    if (unitToSpawn) {
      this.game.spawnUnit('ai', unitToSpawn.unitType)
      this.game.addGold('ai', -unitToSpawn.cost)
      this._attackSpawnCooldown = 350 // ms between attack spawns
    }
  }

  _executePlanning(gameContext, availableGold) {
    // do nothing for now
  }

  _executeDefend(gameContext, availableGold) {
    const scoredUnits = this.config.availableUnitTypes
      .filter(unitType => unitType !== 'hero')
      .map(unitType => ({
        unitType,
        score: this._scoreUnit(unitType, gameContext),
        cost: this.game.unitRegistry.get(unitType)?.STATS.cost,
      }))
      .filter(unit => unit.score > 0)
      .sort((a, b) => b.score - a.score);

    let remainingGold   = availableGold;
    let spawnCount      = 0;
    const maxSpawnCount = gameContext.aiCastleHpPct < 0.3 ? 6 : 4;

    for (const unit of scoredUnits) {
      if (unit.cost > remainingGold || spawnCount >= maxSpawnCount) continue;
      this.game.spawnUnit('ai', unit.unitType);
      this.game.addGold('ai', -unit.cost);
      remainingGold -= unit.cost;
      spawnCount++;
    }
  }

  _trySpawnHero(gameContext) {
    if (gameContext.aiHeroIsAlive) return false

    const HeroClass = this.game.unitRegistry.get('hero')

    if (!HeroClass) return false

    const heroCost = HeroClass.STATS.cost

    this.game.spawnUnit('ai', 'hero')

    if (heroCost !== 0) {
      this.game.addGold('ai', -heroCost)

    }

    return true
  }
}