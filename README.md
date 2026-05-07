# Castle Clash: Age of Mages

A real-time strategy game where you command an army of medieval and magical units to destroy the enemy castle while defending your own.

## Overview

Castle Clash: Age of Mages is a browser-based RTS game built with vanilla JavaScript. Players spawn units that automatically battle the AI's forces across a 2D battlefield. Strategy comes from unit selection, positioning, and timing—each unit has unique stats, resource mechanics, and special abilities.

## Features

- **11 Unique Units** with distinct roles and abilities
- **Hero System** — level up your champion with XP from combat
- **Castle Upgrades** — 10 levels of fortifications and defenses
- **Smart AI Opponent** — adaptive phases (idle, planning, attacking, defending) with counter-picking
- **Special Abilities** — shield block, piercing, critical strikes, chain lightning, area attacks, summoning, siege damage, line attacks, and healing
- **Strategic Unit Counters** — rock-paper-scissors style matchups
- **Wave Events** — scripted AI attacks and player gold bonuses at key intervals
- **Visual Effects** — projectiles, impacts, damage numbers, and animations
- **Save/Load** — localStorage persistence
- **Sound Effects** — optional audio with volume control
- **Hotkey Controls** — quick unit deployment with 1-9 keys

## Units

| Unit | Cost | HP | DMG | Speed | Range | Type | Special Ability |
|------|------|----|-----|-------|-------|------|-----------------|
| **Swordsman** | 50 | 150 | 10 | 0.8 | 46 | Melee | Shield Block (20% chance to negate damage) |
| **Archer** | 100 | 65 | 20 | 1.0 | 160 | Ranged | Piercing (+50% damage vs Hero units) |
| **Mage** | 120 | 70 | 40 | 2.0 | 170 | Ranged | Chain Lightning (50% damage to nearby enemies) |
| **Tank** | 200 | 650 | 5 | 0.5 | 48 | Melee | Shield Block (80% chance to negate damage) |
| **Assassin** | 150 | 80 | 35 | 2.2 | 60 | Melee | Critical Strike (30% chance, 1.8x damage) |
| **Necromancer** | 180 | 60 | 25 | 0.7 | 200 | Ranged | Summon Skeleton (20% chance on attack) |
| **Giant** | 350 | 800 | 60 | 0.4 | 60 | Melee | Area Attack (50% chance, 60px radius) |
| **Supreme** | 200 | 50 | 80 | 0.35 | 300 | Siege | Line Attack & 3x damage vs castles |
| **Hero** | FREE | 300+ | 40+ | 1.0+ | 60 | Hero | Gains HP and DMG with each level up |
| **Skeleton** | 0 | 30 | 8 | 0.6 | 46 | Melee | Undead minion (summoned by Necromancer) |
| **Healer** | 150 | 100 | 0 | 0.8 | 150 | Ranged | Splash Heal (35 HP to allies in range) |

## Unit Types

- **Melee** — Frontline fighters that engage in close combat (Swordsman, Tank, Assassin, Giant, Skeleton)
- **Ranged** — Attack from a distance with projectiles (Archer, Mage, Necromancer, Healer)
- **Siege** — Long-range units specialized for castle destruction (Supreme)
- **Hero** — Unique champion that levels up over time

## Resource System

Units use two types of resources to attack:
- **Stamina** — Used by melee units (Swordsman, Tank, Assassin, Giant, Skeleton)
- **Mana** — Used by magical units (Mage, Necromancer, Supreme, Healer)

Resources regenerate over time. Units cannot attack without sufficient resources.

## Special Abilities

| Ability | Description |
|---------|-------------|
| **Shield Block** | Chance to completely negate incoming damage |
| **Piercing** | Bonus damage against Hero units |
| **Critical Strike** | Chance to deal multiplied damage |
| **Chain Lightning** | Damage jumps to nearby enemies |
| **Area Attack** | Damages all enemies within radius |
| **Summon** | Chance to spawn Skeleton minions |
| **Siege** | Triple damage against castles |
| **Line Attack** | Projectile travels in a line hitting all enemies |
| **Heal Splash** | Restores HP to multiple allies in range |
| **Unique (Hero)** | Gains stats with each level up |

## Gameplay

### Objective
Destroy the enemy castle before they destroy yours. Castles have HP that can be reduced by units attacking it directly or through siege damage.

### Economy
- Gold generates passively over time (12 gold/sec for both player and AI)
- Killing enemy units grants 20% of their cost as gold
- Hero gains XP from combat, leveling up to become stronger
- Castle can be upgraded up to level 10 for increased HP, defense damage, and defense range

### Controls
- **1-9 Keys** — Spawn units (Swordsman, Archer, Mage, Tank, Supreme, Hero, Necromancer, Giant, Healer)
- **G Key** — Cheat: +1000 gold
- **K Key** — Cheat: Damage enemy castle
- **Pause/Resume Button** — Pause or resume the game
- **Speed Button** — Toggle 1x/2x game speed
- **Reset Button** — Restart the game (clears save)
- **Volume Slider** — Adjust sound effects

### AI Behavior
The AI operates in phases:
- **Idle** — Minimal spawning, saving gold
- **Planning** — Evaluates wave compositions based on threat level
- **Attacking** — Commits to coordinated wave attacks
- **Defending** — Spawns units to protect castle when under threat

The AI uses counter-picking logic to spawn units that counter your army composition.

## Architecture

### Core Systems
- **Game** (`js/core/Game.js`) — Main entry point, game loop, state management
- **GameEngine** (`js/core/GameEngine.js`) — Bootstrap, unit updates, win conditions
- **EntityManager** (`js/core/EntityManager.js`) — Stores and manages all entities
- **EventBus** (`js/core/Events.js`) — Pub/sub event system with 21 game events and 6 entity events

### Configuration
- **GameBalance** (`js/core/GameBalance.js`) — Centralized game configuration (economy, castle, hero, units, FX, AI)
- **UnitTypes** (`js/core/UnitTypes.js`) — Constants for unit types, resource types, and special abilities

### Gameplay Systems
- **CombatSystem** (`js/systems/CombatSystem.js`) — Resolves attacks using AbilityRegistry strategy pattern
- **CastleDefenseSystem** (`js/systems/CastleDefenseSystem.js`) — Castle auto-attacks nearby enemies
- **AIManager** (`js/ai/AIManager.js`) — AI decision making with adaptive phases
- **AbilityRegistry** (`js/systems/abilities/AbilityRegistry.js`) — Strategy pattern for special abilities

### UI Components
- **HUD** (`js/ui/HUD.js`) — Gold, time, castle HP, hero level/XP, castle upgrade UI
- **CardDeck** (`js/ui/CardDeck.js`) — Unit cards with hotkey bindings
- **UnitRoster** (`js/ui/UnitRoster.js`) — Displays alive unit counts per side
- **CanvasRenderer** (`js/ui/CanvasRenderer.js`) — DOM-based rendering with object pooling
- **UnitAssetRegistry** (`js/ui/UnitAssetRegistry.js`) — Centralized unit assets and metadata

### Plugins
- **SFXPlugin** (`js/plugins/SFXPlugin.js`) — Sound effects management
- **SavePlugin** (`js/plugins/SavePlugin.js`) — localStorage save/load
- **EventPlugin** (`js/plugins/EventPlugin.js`) — Scripted events and waves
- **UnitSpawnerPlugin** (`js/plugins/UnitSpawnerPlugin.js`) — Unit spawning, hero deploy/respawn

### Unit Classes
All units extend `Unit` (`js/entities/Unit.js`) with unified metadata in `STATS`:
- Swordsman, Archer, Mage, Tank, Assassin, Necromancer, Giant, Supreme, Hero, Skeleton, Healer

## Getting Started

1. Open `index.html` in a modern browser
2. Spawn units using keys 1-9 or clicking cards
3. Watch your army clash with the AI
4. Upgrade your castle and level up your Hero
5. Destroy the enemy castle to win!

## Technical Details

- **Pure JavaScript** — No frameworks or libraries required
- **ES Modules** — Modern import/export syntax
- **Canvas Rendering** — Smooth 60fps gameplay
- **Event-Driven Architecture** — Loose coupling via EventBus
- **Strategy Pattern** — Abilities implemented as swappable strategies
- **Responsive Design** — Playable at various screen sizes

## File Structure

```
├── index.html              # Main HTML entry point
├── css/
│   └── styles.css         # Game styling
├── js/
│   ├── main.js            # Game initialization
│   ├── core/              # Core systems (Game, Engine, Events, etc.)
│   ├── entities/          # Unit and Castle entities
│   ├── systems/           # Combat, Castle Defense, Abilities
│   ├── ai/                # AI Manager and Wave Compositions
│   ├── ui/                # HUD, Cards, Roster, Renderer
│   ├── plugins/           # SFX, Save, Events, Spawner
│   ├── fx/                # Visual effects system
│   └── units/             # All 11 unit classes
├── svg/                   # Unit and castle SVGs
└── audio/                 # Sound effects
```

## License

MIT License — feel free to modify and distribute.
