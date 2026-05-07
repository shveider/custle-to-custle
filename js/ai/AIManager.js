import { getWaveCompositions, calcWaveCost, flattenWaveUnits } from './WaveCompositions.js'
import { GameEvents } from '../core/Events.js'
import { UnitType } from '../core/UnitTypes.js'

const Phase = {IDLE: 'idle', PLANNING: 'planning', ATTACKING: 'attacking', DEFENDING: 'defending'}

// How much to weight DPS vs survivability vs gold efficiency at each threat level
const THREAT_WEIGHTS = {
  low: {dps: 0.4, ehp: 0.2, eff: 0.4},
  medium: {dps: 0.5, ehp: 0.3, eff: 0.2},
  high: {dps: 0.3, ehp: 0.5, eff: 0.2},
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
      allUnitTypes: ['swordsman', 'archer', 'mage', 'supreme', 'hero', 'tank', 'assassin', 'necromancer', 'giant'],
      goldRate: config.goldRate,
    }

    this._timeAccumulator = 0
    this._gameTime = 0
    this._recentPlayerSpawns = []
    this._playerUnitCounts = {}     // full enemy army composition tracking
    this._dominantPlayerUnit = null
    this._phase = Phase.IDLE
    this._plannedWave = null
    this._waveSpawnIndex = 0
    this._lastWaveSpawnTime = 0
    this._lastGoldSnapshot = 0      // detect gold hoarding
    this._goldHoardFrames = 0
    this._aggressionMultiplier = 1  // grows with game time
    this._compositions = getWaveCompositions()

    this._counterMap = this._buildCounterMap()
    this._unitRoles = this._buildUnitRoles()

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
      else if (key === 'hero') counterMap[key] = 'tank'
      else if (key === 'tank') counterMap[key] = 'mage'
      else if (key === 'giant') counterMap[key] = 'archer'
      else if (key === 'assassin') counterMap[key] = 'swordsman'
      else if (key === 'necromancer') counterMap[key] = 'assassin'
      else counterMap[key] = 'archer'
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
    this._timeAccumulator = 0
    this._gameTime = 0
    this._recentPlayerSpawns = []
    this._playerUnitCounts = {}
    this._dominantPlayerUnit = null
    this._phase = Phase.IDLE
    this._plannedWave = null
    this._waveSpawnIndex = 0
    this._lastWaveSpawnTime = 0
    this._lastGoldSnapshot = 0
    this._goldHoardFrames = 0
    this._aggressionMultiplier = 1
  }

  // ─── Main loop ────────────────────────────────────────────────────────────

  update(dt) {
    this._timeAccumulator += dt
    this._gameTime += dt / 1000
    if (this._timeAccumulator < this.config.thinkInterval) return
    this._timeAccumulator = 0

    const gold = this.game.getGold('ai')
    if (gold <= 0 && this._phase !== Phase.DEFENDING) return

    // Aggression ramps up gradually — AI becomes more proactive over time
    this._aggressionMultiplier = 1 + Math.min(this._gameTime / 120, 1.5)

    this._trackGoldHoarding(gold)
    this._updateDominantUnit()

    const ctx = this._computeContext()

    // Hero spawning is a special case evaluated independently
    if (this._trySpawnHero(ctx, gold)) return

    const phase = this._decidePhase(ctx, gold)
    this._phase = phase

    switch (phase) {
      case Phase.DEFENDING:
        this._executeDefend(ctx, gold)
        break
      case Phase.ATTACKING:
        this._executeAttackWave(ctx, gold)
        break
      case Phase.PLANNING:
        this._executeAttackWave(ctx, gold)
        break
      case Phase.IDLE:
        this._tryIdleSkirmish(ctx, gold)
        break
    }
  }

  // ─── Context ──────────────────────────────────────────────────────────────

  _computeContext() {
    const entities = this.game.entities
    const aiUnits = entities.findByOwner('ai')
    const playerUnits = entities.findByOwner('player')
    const aiCastle = entities.getCastle('ai')
    const playerCastle = entities.getCastle('player')

    let nearestEnemyX = 0
    let nearestAiX = this.game.config.battlefieldWidth
    let aiHasFrontline = false
    let aiHasRanged = false
    let aiHeroAlive = false
    let aiTotalPower = 0
    let playerTotalPower = 0

    for (const u of playerUnits) {
      if (u.x > nearestEnemyX) nearestEnemyX = u.x
      const stats = this.game.unitRegistry.get(u.defName)?.STATS
      if (stats) playerTotalPower += this._estimatePower(stats)
    }

    for (const u of aiUnits) {
      if (u.x < nearestAiX) nearestAiX = u.x
      const stats = this.game.unitRegistry.get(u.defName)?.STATS
      if (stats) aiTotalPower += this._estimatePower(stats)

      if (u.unitType === UnitType.MELEE || u.defName === 'hero' || u.defName === 'tank' || u.defName === 'giant') {
        aiHasFrontline = true
      }
      if (u.unitType === UnitType.RANGED || u.defName === 'mage' || u.defName === 'archer') {
        aiHasRanged = true
      }
      if (u.defName === 'hero') aiHeroAlive = true
    }

    const bfWidth = this.game.config.battlefieldWidth
    const battleLineX = (nearestEnemyX + nearestAiX) / 2

    // Power ratio: >1 means AI is stronger, <1 means player is stronger
    const powerRatio = playerTotalPower > 0
      ? aiTotalPower / playerTotalPower
      : aiTotalPower > 0 ? 2 : 1

    // Threat level drives unit selection weights
    const aiHpPct = aiCastle ? aiCastle.hpPercent : 1
    let threatLevel = 'low'
    if (aiHpPct < 0.4 || nearestEnemyX > bfWidth - 300) threatLevel = 'high'
    else if (aiHpPct < 0.65 || nearestEnemyX > bfWidth - 500) threatLevel = 'medium'

    return {
      aiUnitCount: entities.countAlive('ai'),
      playerUnitCount: entities.countAlive('player'),
      enemyNearCastle: nearestEnemyX > (bfWidth - 350),
      aiCastleHpPct: aiHpPct,
      playerCastleHpPct: playerCastle ? playerCastle.hpPercent : 1,
      aiHasFrontline,
      aiHasRanged,
      aiHeroAlive,
      nearestEnemyX,
      nearestAiX,
      battleLineX,
      powerRatio,
      threatLevel,
      aiTotalPower,
      playerTotalPower,
      bfWidth,
    }
  }

  _estimatePower(stats) {
    const atkSpeed = 1000 / (stats.attackDelay || 800)
    return stats.dmg * atkSpeed * 0.5 + stats.hp * 0.3
  }

  _updateDominantUnit() {
    // Track the most frequently spawned player unit (recent window)
    if (this._recentPlayerSpawns.length === 0) return
    const counts = {}
    for (const s of this._recentPlayerSpawns) counts[s] = (counts[s] || 0) + 1
    let maxC = 0
    this._dominantPlayerUnit = null
    for (const k in counts) {
      if (counts[k] > maxC) {
        maxC = counts[k]
        this._dominantPlayerUnit = k
      }
    }
  }

  _trackGoldHoarding(gold) {
    // Detect if the AI has been sitting on gold without spending it
    if (gold >= this._lastGoldSnapshot) {
      this._goldHoardFrames++
    } else {
      this._goldHoardFrames = 0
    }
    this._lastGoldSnapshot = gold
  }

  // ─── Scoring ──────────────────────────────────────────────────────────────

  _scoreUnit(unitName, ctx) {
    const UnitClass = this.game.unitRegistry.get(unitName)
    if (!UnitClass) return -10

    const s = UnitClass.STATS
    const atkSpeed = 1000 / (s.attackDelay || 800)
    const dps = s.dmg * atkSpeed
    const effectiveHP = s.hp * (s.speed < 0.7 ? 1.2 : 1.0)  // tanks get hp bonus for soaking
    const weights = THREAT_WEIGHTS[ctx.threatLevel]

    let score = (
      weights.dps * dps +
      weights.ehp * effectiveHP -
      weights.eff * s.cost
    ) / Math.max(s.cost, 1) * 10

    score += (s.range / 100) * 0.1

    // ── Counter-picking ──────────────────────────────────────────────────
    // Reward units that counter recent player spawns
    if (this._dominantPlayerUnit && this._counterMap[this._dominantPlayerUnit] === unitName) {
      score += 2.5
    }

    // Reward units that counter the currently alive enemy army
    let counterBonus = 0
    for (const [enemyType, count] of Object.entries(this._playerUnitCounts)) {
      if (count > 0 && this._counterMap[enemyType] === unitName) {
        counterBonus += 0.6 * Math.min(count, 3)  // cap to avoid over-stacking
      }
    }
    score += counterBonus

    // ── Army composition gaps ────────────────────────────────────────────
    const myRole = this._unitRoles[unitName]?.role
    if (myRole === UnitType.MELEE && !ctx.aiHasFrontline) score += 2.0
    if (myRole === UnitType.RANGED && !ctx.aiHasRanged) score += 1.2

    // ── Situational bonuses ──────────────────────────────────────────────
    if (ctx.enemyNearCastle) {
      if (unitName === 'tank' || unitName === 'giant') score += 3.5
      else if (unitName === 'swordsman') score += 1.5
    }

    if (ctx.aiCastleHpPct < 0.35) {
      if (unitName === 'tank') score += 4.5
      if (unitName === 'giant') score += 2.5
      if (unitName === 'supreme') score += 1.5
    }

    // When winning decisively, favor aggressive high-DPS units
    if (ctx.powerRatio > 1.5) {
      if (this._unitRoles[unitName]?.tier === 3) score += 1.5
    }

    // Aggression scaling with time — favor costlier units as gold accumulates
    score += this._aggressionMultiplier * (this._unitRoles[unitName]?.tier || 1) * 0.3

    // Hero is a one-of: exclude if alive, reward based on game time
    if (unitName === 'hero') {
      score = ctx.aiHeroAlive ? -15 : Math.min(this._gameTime * 0.05, 4)
    }

    // Penalise spawning a unit the player has a strong counter for
    const counterToThis = Object.entries(this._counterMap).find(([_, v]) => v === unitName)?.[0]
    if (counterToThis && (this._playerUnitCounts[counterToThis] || 0) >= 2) {
      score -= 1.0
    }

    return score
  }

  // ─── Phase decisions ──────────────────────────────────────────────────────

  _decidePhase(ctx, gold) {
    // Defence always wins over everything else
    if (ctx.enemyNearCastle || ctx.aiCastleHpPct < 0.25) return Phase.DEFENDING

    // Finish spawning a wave already in progress
    if (this._phase === Phase.ATTACKING && this._plannedWave) {
      const totalUnits = this._plannedWave.units.reduce((s, u) => s + u.count, 0)
      if (this._waveSpawnIndex < totalUnits) {
        // Bail on a wave if the army was wiped and we can't afford more
        if (ctx.aiUnitCount === 0 && gold < 80) {
          this._phase = Phase.IDLE
          this._plannedWave = null
        } else {
          return Phase.ATTACKING
        }
      } else {
        this._phase = Phase.IDLE
        this._plannedWave = null
      }
    }

    // Opportunistic push: AI has more power on the field and is winning the front
    const pushThreshold = 0.55 - (this._aggressionMultiplier - 1) * 0.1  // gets lower over time
    if (
      ctx.aiUnitCount > 0 &&
      ctx.battleLineX > ctx.bfWidth * pushThreshold &&
      ctx.powerRatio >= 0.9
    ) {
      if (ctx.aiUnitCount >= ctx.playerUnitCount || ctx.playerUnitCount <= 1) {
        return Phase.ATTACKING
      }
    }

    // Evaluate and commit to a new wave
    const wave = this._evaluateWave(ctx, gold)
    if (wave) {
      // Only re-plan if the wave is substantially different
      if (!this._plannedWave || this._plannedWave.name !== wave.name) {
        this._plannedWave = wave
        this._waveSpawnIndex = 0
      }
      return Phase.PLANNING
    }

    // Gold-hoard pressure: if we're sitting on a pile, force skirmish spending
    if (this._goldHoardFrames > 15 && gold > 120) {
      return Phase.IDLE  // will trigger skirmish spawning below
    }

    return Phase.IDLE
  }

  _evaluateWave(ctx, gold) {
    let best = null
    let bestScore = -1

    for (const comp of this._compositions) {
      if (this._gameTime < comp.minTime) continue

      const cost = calcWaveCost(comp, this.game.unitRegistry)

      // Need at least 60% of wave cost before committing (was 50% — more decisive)
      if (gold < cost * 0.6) continue

      let waveScore = 0
      let viable = true

      for (const u of comp.units) {
        const s = this._scoreUnit(u.type, ctx)
        if (s < -1) {
          viable = false
          break
        }
        waveScore += s * u.count
      }
      if (!viable) continue

      // Full affordability bonus
      if (gold >= cost) waveScore += 3

      // Prefer waves with unit variety (synergy)
      const uniqueTypes = new Set(comp.units.map(u => u.type)).size
      waveScore += uniqueTypes * 0.4

      // Urgency bonus — enemy close to our castle
      if (ctx.enemyNearCastle) waveScore += 3

      // Aggression scales with time
      waveScore *= this._aggressionMultiplier

      if (waveScore > bestScore) {
        bestScore = waveScore
        best = {...comp, totalCost: cost}
      }
    }

    return bestScore > 0 ? best : null
  }

  // ─── Phase execution ──────────────────────────────────────────────────────

  _executeAttackWave(ctx, gold) {
    if (!this._plannedWave) {
      const wave = this._evaluateWave(ctx, gold)
      if (wave) {
        this._plannedWave = wave
        this._waveSpawnIndex = 0
        this._lastWaveSpawnTime = 0
      } else {
        this._phase = Phase.IDLE
        return
      }
    }

    const now = this.game.time * 1000
    // Stagger spawns slightly (200ms) to avoid instant death clumps
    if (now - this._lastWaveSpawnTime < 200) return

    const allUnits = flattenWaveUnits(this._plannedWave)
    if (this._waveSpawnIndex >= allUnits.length) {
      this._phase = Phase.IDLE
      this._plannedWave = null
      return
    }

    const nextType = allUnits[this._waveSpawnIndex]
    const UnitClass = this.game.unitRegistry.get(nextType)
    const cost = UnitClass ? UnitClass.STATS.cost : 50

    if (gold >= cost) {
      this.game.spawnUnit('ai', nextType)
      this._waveSpawnIndex++
      this._lastWaveSpawnTime = now
    } else if (ctx.aiUnitCount === 0 && gold < cost * 0.4) {
      // Truly can't afford to continue — abort and go idle
      this._phase = Phase.IDLE
      this._plannedWave = null
    }
  }

  _executeDefend(ctx, gold) {
    // Score all units and greedily spawn the best ones we can afford
    const scored = this.config.allUnitTypes
      .filter(n => n !== 'hero')
      .map(name => ({
        name,
        score: this._scoreUnit(name, ctx),
        cost: this.game.unitRegistry.get(name)?.STATS.cost || 50,
      }))
      .filter(u => u.score > 0)
      .sort((a, b) => b.score - a.score)

    let remaining = gold
    let spawns = 0
    const maxSpawns = ctx.aiCastleHpPct < 0.3 ? 4 : 3  // panic-mode spawns more

    for (const u of scored) {
      if (u.cost > remaining || spawns >= maxSpawns) continue
      this.game.spawnUnit('ai', u.name)
      remaining -= u.cost
      spawns++
    }
  }

  _tryIdleSkirmish(ctx, gold) {
    // Don't skirmish if we already have a decent force — save for the wave
    if (ctx.aiUnitCount >= 4) return

    // Gold-hoard relief: if sitting on gold too long, force some spending
    const goldFloor = this._goldHoardFrames > 20 ? 50 : 80
    if (gold < goldFloor) return

    // Pick the best affordable unit for the current situation
    const candidates = this.config.allUnitTypes
      .filter(n => n !== 'hero')
      .map(name => ({
        name,
        score: this._scoreUnit(name, ctx),
        cost: this.game.unitRegistry.get(name)?.STATS.cost || 50,
      }))
      .filter(u => u.cost <= gold && u.score > 0)
      .sort((a, b) => b.score - a.score)

    if (candidates.length > 0) {
      this.game.spawnUnit('ai', candidates[0].name)
    }
  }

  _trySpawnHero(ctx, gold) {
    if (ctx.aiHeroAlive) return false

    const HeroClass = this.game.unitRegistry.get('hero')
    if (!HeroClass) return false

    const heroCost = HeroClass.STATS.cost

    // Don't spend hero gold if we're under heavy attack and need bulk units
    if (ctx.enemyNearCastle && gold < heroCost * 1.5) return false

    if (gold >= heroCost) {
      const score = this._scoreUnit('hero', ctx)
      if (score > this.config.minSpawnScore) {
        this.game.spawnUnit('ai', 'hero')
        return true
      }
    }
    return false
  }
}