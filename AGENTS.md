# Castle Clash: Age of Mages — Agent Guide

## Architecture Overview

### Core Systems
- **`Game`** (`js/core/Game.js`) — Main entry point. Manages game loop, state (running/paused/ended), gold, and event bus.
- **`GameEngine`** (`js/core/GameEngine.js`) — Bootstrap and main update loop. Creates castles, updates units, checks win conditions.
- **`EntityManager`** (`js/core/EntityManager.js`) — Stores all entities (units, castles). Has its own internal `this.events` for entity lifecycle events.
- **`EventBus`** (`js/core/EventBus.js`) — Pub/sub event system. `game.events` is the global bus; `game.entities.events` is the entity-local bus.

### Event System
All event names are centralized in **`js/core/Events.js`**:

- **`GameEvents`** — 21 events on `game.events` (global bus). Covers lifecycle, economy, units, combat, hero, castle, and logging.
- **`EntityEvents`** — 6 events on `game.entities.events` (entity bus). Covers entity/unit/castle add/remove lifecycle.

Never use string literals for event names. Always import from `js/core/Events.js`.

### Rendering
- **`UnitRenderer`** (`js/ui/UnitRenderer.js`) — DOM-based rendering with object pooling. Syncs unit positions, HP bars, animation states, projectiles, and effects to DOM elements.
- **`FXSystem`** (`js/fx/FXSystem.js`) — Manages visual effects: projectiles, impacts, damage numbers, chain lightning, shield blocks, summon effects, area attacks.

### Gameplay Systems
- **`CombatSystem`** (`js/systems/CombatSystem.js`) — Resolves attacks, handles specials (shield block, piercing, critical strike, line attack, chain lightning, area attack, necromancer summon).
- **`CastleDefenseSystem`** (`js/systems/CastleDefenseSystem.js`) — Castle auto-attacks nearby enemies within range.
- **`AIManager`** (`js/ai/AIManager.js`) — AI decision making: wave planning, unit counters, phase-based strategy (idle/planning/attacking/defending).
- **`UnitSpawnerPlugin`** (`js/plugins/UnitSpawnerPlugin.js`) — Handles unit spawning, hero deploy/cooldown/respawn, skeleton summoning.

### UI
- **`HUD`** (`js/ui/HUD.js`) — Owns gold state (`_gold`), hero level/XP, castle HP. Exposes `get gold()` / `set gold(v)` for cross-system access.
- **`CardDeck`** (`js/ui/CardDeck.js`) — Card UI, hotkey bindings, hero button state.

### Key Patterns
- Cross-system communication flows through `game.events.emit/on`
- `EntityManager` uses its own `this.events` (not `game.events`) for `unit:added/removed`
- Animation state is tracked on `Unit` via `_animState`/`_animEnd` — `triggerAnim()` sets these once per trigger
- Death animation: `triggerAnim('dying', 400)` fires once when `curHp <= 0 && !_animEnd`, then entity is removed after 400ms
- Hero respawn: 30s after death, triggers `hero:available` event when cooldown expires
- Restart flow: `game.restart()` → clears entities → emits `game:restart` → systems re-initialize

# MONITORING
If something changed in the code and architecture - adjust AGENTS.md.