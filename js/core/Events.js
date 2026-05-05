/**
 * Global event names emitted on `game.events` (the shared EventBus).
 * These events coordinate communication between systems, plugins, and UI components.
 */
export const GameEvents = {
  /** Main game loop tick — emitted every frame with (deltaTime, timeSec).
   *  Listened to by: GameEngine, UnitSpawnerPlugin, FXSystem, HUD, AIManager, EventPlugin */
  TICK: 'game:tick',

  /** Game has started — emitted once when `game.start()` is called.
   *  Listened to by: SFXPlugin (plays start sound) */
  START: 'game:start',

  /** Game has stopped — emitted when `game.stop()` is called. */
  STOP: 'game:stop',

  /** Game is restarting — emitted when `game.restart()` is called.
   *  Listened to by: GameEngine, FXSystem, UnitRenderer, HUD, AIManager (reset state) */
  RESTART: 'game:restart',

  /** Game pause toggled — emitted when `game.togglePause()` is called. */
  PAUSE: 'game:pause',

  /** Game speed changed — emitted when `game.setSpeed()` is called. */
  SPEED: 'game:speed',

  /** Game has ended — emitted when a castle's HP reaches zero.
   *  Listened to by: GameEngine (shows game over), SFXPlugin (plays end sound) */
  END: 'game:end',

  /** Gold was added to the player's pool — carries { amount }.
   *  Listened to by: HUD (updates gold display) */
  GOLD: 'game:gold',

  /** Gold was spent (card purchase) — carries { amount }.
   *  Listened to by: HUD (tracks spending history) */
  SPEND_GOLD: 'game:spendGold',

  /** Query current gold amount — listeners should return the gold value.
   *  Listened to by: HUD (returns current gold) */
  GET_GOLD: 'game:getGold',

  /** Request to spawn a unit — carries { unitKey, side, lane, isHero }.
   *  Listened to by: UnitSpawnerPlugin (creates the unit), AIManager (tracks spawns) */
  UNIT_SPAWN: 'unit:spawn',

  /** A unit was successfully spawned — carries the Unit instance.
   *  Emitted by: UnitSpawnerPlugin after DOM/entity creation */
  UNIT_SPAWNED: 'unit:spawned',

  /** A unit initiated an attack — carries { unit, target, damage }.
   *  Listened to by: CombatSystem (resolves the attack) */
  UNIT_ATTACK: 'unit:attack',

  /** A healer initiated a heal — carries { healer }.
   *  Listened to by: CombatSystem (resolves the heal) */
  UNIT_HEAL: 'unit:heal',

  /** A unit attacked a castle directly — carries { unit, castle, damage }.
   *  Listened to by: CombatSystem (resolves castle damage) */
  UNIT_ATTACK_CASTLE: 'unit:attackCastle',

  /** A unit was killed in combat — carries the dead Unit instance.
   *  Emitted by: CombatSystem, CastleDefenseSystem.
   *  Listened to by: GameEngine (logs), SFXPlugin (death sound) */
  UNIT_KILLED: 'unit:killed',

  /** A unit summoned another unit — carries { summoner, summonedKey }.
   *  Listened to by: UnitSpawnerPlugin (creates the summoned unit) */
  UNIT_SUMMON: 'unit:summon',

  /** A hero unit was deployed from the card deck — carries { heroKey, side }.
   *  Listened to by: UnitSpawnerPlugin (spawns the hero) */
  HERO_DEPLOY: 'hero:deploy',

  /** A hero leveled up — carries { hero, newLevel }.
   *  Listened to by: GameEngine (logs), HUD (updates UI) */
  HERO_LEVEL_UP: 'hero:levelUp',

  /** A hero gained experience — carries { hero, amount }.
   *  Emitted by: CombatSystem, CardDeck.
   *  Listened to by: HUD (tracks XP progress) */
  HERO_EXP: 'hero:exp',

  /** Hero is now available for deployment (cooldown expired).
   *  Emitted by: UnitSpawnerPlugin when _heroCooldown reaches 0. */
  HERO_AVAILABLE: 'hero:available',

  /** An attack successfully hit a target — carries { attacker, target, damage }.
   *  Listened to by: GameEngine (logs), SFXPlugin (hit sound), Unit (triggers hit animation) */
  COMBAT_HIT: 'combat:hit',

  /** An attack hit a castle — carries { castle, damage }.
   *  Listened to by: GameEngine (logs castle hit) */
  COMBAT_CASTLE_HIT: 'combat:castleHit',

  /** An attack was blocked — carries { attacker, target }.
   *  Listened to by: GameEngine (logs block) */
  COMBAT_BLOCKED: 'combat:blocked',

  /** An attack scored a critical hit — carries { attacker, target, damage }.
   *  Listened to by: GameEngine (logs crit), SFXPlugin (crit sound) */
  COMBAT_CRIT: 'combat:crit',

  /** A heal was applied to allies — carries { healer, targets, amount }.
   *  Listened to by: GameEngine (logs heal), FXSystem (heal effects) */
  COMBAT_HEAL: 'combat:heal',

  /** A castle took damage — carries { castle, damage }.
   *  Listened to by: HUD (updates HP bar) */
  CASTLE_DAMAGE: 'castle:damage',

  /** A castle defense system fired at an enemy unit.
   *  Emitted by: CastleDefenseSystem */
  CASTLE_DEFENSE: 'castle:defense',

  /** An event log message — carries { title, message }.
   *  Emitted by: EventPlugin when a timed event triggers.
   *  Listened to by: GameEngine (displays in log overlay) */
  EVENT_LOG: 'event:log',
};

/**
 * Entity Manager event names emitted on `game.entities.events` (local EventEmitter).
 * These events track the lifecycle of entities within the EntityManager.
 */
export const EntityEvents = {
  /** Any entity was added to the manager — carries the entity.
   *  Superset event — always emitted alongside a typed event below. */
  ADDED: 'entity:added',

  /** Any entity was removed from the manager — carries the entity.
   *  Superset event — always emitted alongside a typed event below. */
  REMOVED: 'entity:removed',

  /** A Unit entity was added — carries the Unit.
   *  Emitted by: EntityManager.add() when entity.isUnit is true. */
  UNIT_ADDED: 'unit:added',

  /** A Unit entity was removed — carries the Unit.
   *  Emitted by: EntityManager.remove() when entity.isUnit is true.
   *  Listened to by: UnitSpawnerPlugin (triggers hero respawn timer) */
  UNIT_REMOVED: 'unit:removed',

  /** A Castle entity was added — carries the Castle.
   *  Emitted by: EntityManager.add() when entity.isCastle is true. */
  CASTLE_ADDED: 'castle:added',

  /** A Castle entity was removed — carries the Castle.
   *  Emitted by: EntityManager.remove() when entity.isCastle is true. */
  CASTLE_REMOVED: 'castle:removed',
};

/**
 * All event names combined for convenience.
 * Usage: `game.events.on(Events.GAME_TICK, handler)`
 */
export const Events = {
  ...GameEvents,
  ...EntityEvents,
};
