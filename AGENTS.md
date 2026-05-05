# Castle Clash: Age of Mages — Agent Guide

## Architecture Overview

### Core Systems
- **`Game`** (`js/core/Game.js`) — Main entry point. Manages game loop, state (running/paused/ended), gold, and event bus.
- **`GameEngine`** (`js/core/GameEngine.js`) — Bootstrap and main update loop. Creates castles, updates units, checks win conditions.
- **`EntityManager`** (`js/core/EntityManager.js`) — Stores all entities (units, castles). Has its own internal `this.events` for entity lifecycle events.
- **`EventBus`** (`js/core/EventBus.js`) — Pub/sub event system. `game.events` is the global bus; `game.entities.events` is the entity-local bus.

### New Architecture Components
- **`UnitTypes`** (`js/core/UnitTypes.js`) — Constants for unit types (`MELEE`, `RANGED`, `SIEGE`, `HERO`), resource types (`STAMINA`, `MANA`), and special abilities (`SHIELD_BLOCK`, `PIERCING`, etc.).
- **`GameBalance`** (`js/core/GameBalance.js`) — Centralized game configuration (economy, castle, hero, units, fx, AI settings). Replaces scattered hardcoded values.
- **`UnitAssetRegistry`** (`js/ui/UnitAssetRegistry.js`) — Centralized unit asset management. Provides `getSVG()`, `getIcon()`, `getDisplayName()`, `getDescription()`, `getAbilityDesc()` methods.
- **`AbilityRegistry`** (`js/systems/abilities/AbilityRegistry.js`) — Strategy pattern for special abilities. Each ability (shieldBlock, piercing, criticalStrike, chain, area, summon, siege, line) is an object with `hasAttackSpecial()`, `tryActivate()`, `execute()`, `modifyDamage()` methods.

### Event System
All event names are centralized in **`js/core/Events.js`**:

- **`GameEvents`** — 21 events on `game.events` (global bus). Covers lifecycle, economy, units, combat, hero, castle, and logging.
- **`EntityEvents`** — 6 events on `game.entities.events` (entity bus). Covers entity/unit/castle add/remove lifecycle.

Never use string literals for event names. Always import from `js/core/Events.js`.

### Rendering
- **`UnitRenderer`** (`js/ui/UnitRenderer.js`) — DOM-based rendering with object pooling. Now uses `UnitAssetRegistry` for SVG rendering instead of hardcoded switch statements.
- **`FXSystem`** (`js/fx/FXSystem.js`) — Manages visual effects: projectiles, impacts, damage numbers, chain lightning, shield blocks, summon effects, area attacks.

### Gameplay Systems
- **`CombatSystem`** (`js/systems/CombatSystem.js`) — Resolves attacks using `AbilityRegistry` strategy pattern instead of hardcoded if/switch chains. Special abilities are now modular and extensible.
- **`CastleDefenseSystem`** (`js/systems/CastleDefenseSystem.js`) — Castle auto-attacks nearby enemies within range.
- **`AIManager`** (`js/ai/AIManager.js`) — AI decision making with auto-generated `counterMap` and `unitRoles` from unit registry. No more duplicated unit type lists.
- **`UnitSpawnerPlugin`** (`js/plugins/UnitSpawnerPlugin.js`) — Handles unit spawning, hero deploy/cooldown/respawn, skeleton summoning.

### UI
- **`HUD`** (`js/ui/HUD.js`) — Owns gold state (`_gold`), hero level/XP, castle HP. Exposes `get gold()` / `set gold(v)` for cross-system access.
- **`CardDeck`** (`js/ui/CardDeck.js`) — Card UI, hotkey bindings, hero button state. Now uses unit metadata from `STATS` instead of separate `UNIT_TOOLTIPS` map.
- **`UnitRoster`** (`js/ui/UnitRoster.js`) — Unit count display. Now uses `UnitAssetRegistry.getIcon()` and `getDisplayName()` instead of separate `UNIT_ICONS` map.

### Unit Definitions
All unit classes now have **unified metadata** in `STATS`:
- `displayName` — Human-readable name
- `description` — Short unit description
- `abilityDesc` — Special ability description
- `icon` — Emoji icon for UI
- `abilityIcon` — Emoji icon for ability
- `projectileKind` — Type of projectile ('arrow', 'bolt', 'fire')
- `impactKind` — Type of impact effect ('hit', 'magic', 'spark', 'shield')

Example (`js/units/Archer.js`):
```javascript
static STATS = {
    cost: 100, hp: 65, dmg: 20, speed: 1.0,
    range: 180, type: 'ranged',
    special: { piercing: 0.5 },
    displayName: 'Archer',
    description: 'Versatile ranged attacker',
    abilityDesc: 'Piercing (+50% damage vs Hero units)',
    icon: '🏹',
    projectileKind: 'arrow',
    impactKind: 'hit',
    abilityIcon: '🎯',
    // ... resource stats
};
```

### Key Patterns
- Cross-system communication flows through `game.events.emit/on`
- `EntityManager` uses its own `this.events` (not `game.events`) for `unit:added/removed`
- Animation state is tracked on `Unit` via `_animState`/`_animEnd` — `triggerAnim()` sets these once per trigger
- Death animation: `triggerAnim('dying', 400)` fires once when `curHp <= 0 && !_animEnd`, then entity is removed after 400ms
- Hero respawn: 30s after death, triggers `hero:available` event when cooldown expires
- Restart flow: `game.restart()` → clears entities → emits `game:restart` → systems re-initialize

### Adding New Units (Now Much Easier!)
1. Create unit class in `js/units/` with full `STATS` metadata (including `displayName`, `icon`, `projectileKind`, etc.)
2. Import and add to `UNIT_CLASSES` Map in `js/main.js`
3. Add SVG to `UnitAssetRegistry` (or embed in STATS.svg)
4. That's it! No need to edit multiple files.

### Extending Abilities
1. Add new ability to `js/systems/abilities/AbilityRegistry.js`
2. Implement `hasAttackSpecial()`, `tryActivate()`, `execute()`, etc.
3. Add ability to unit's `special` object in STATS

### Unit Range Guidelines
- **Reference config:** `GameBalance.units.unitSize` (currently 48px) — see `js/core/GameBalance.js:29`
- **Minimum melee range:** 44-48px ensures units can attack when touching/overlapping
- **Range calculation:** Distance is measured center-to-center; with `range: 48`, units at 48px apart can attack
- **Recommendation:** Use 44-48 for melee, 120+ for ranged, 300+ for siege

# MONITORING
If something changed in the code and architecture - adjust AGENTS.md.
