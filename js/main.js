import { Game } from './core/Game.js';
import { UnitRegistry } from './core/UnitRegistry.js';
import { GameBalance } from './core/GameBalance.js';
import { GameEngine } from './core/GameEngine.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { CastleDefenseSystem } from './systems/CastleDefenseSystem.js';
import { FXSystem } from './fx/FXSystem.js';
import { AIManager } from './ai/AIManager.js';
import { HUD } from './ui/HUD.js';
import { CardDeck } from './ui/CardDeck.js';
import { UnitRoster } from './ui/UnitRoster.js';
import { CanvasRenderer } from './ui/CanvasRenderer.js';
import { UnitAssetRegistry } from './ui/UnitAssetRegistry.js';
import { SFXPlugin } from './plugins/SFXPlugin.js';
import { SavePlugin } from './plugins/SavePlugin.js';
import { EventPlugin } from './plugins/EventPlugin.js';
import { UnitSpawnerPlugin } from './plugins/UnitSpawnerPlugin.js';

import { Swordsman } from './units/Swordsman.js';
import { Archer } from './units/Archer.js';
import { Mage } from './units/Mage.js';
import { Tank } from './units/Tank.js';
import { Assassin } from './units/Assassin.js';
import { Necromancer } from './units/Necromancer.js';
import { Giant } from './units/Giant.js';
import { Supreme } from './units/Supreme.js';
import { Hero } from './units/Hero.js';
import { Skeleton } from './units/Skeleton.js';
import { Healer } from './units/Healer.js';

const GAME_CONFIG = {
    goldRate: GameBalance.economy.playerGoldRate,
    aiGoldRate: GameBalance.economy.aiGoldRate,
    castleHP: GameBalance.castle.playerHP,
    aiCastleHP: GameBalance.castle.aiHP,
    battlefieldWidth: GameBalance.battlefield.width,
    unitSize: GameBalance.units.unitSize,
    fixedDt: GameBalance.gameLoop.fixedDt,
    playerCastleX: GameBalance.battlefield.playerCastleX,
    aiCastleX: GameBalance.battlefield.width - GameBalance.battlefield.aiCastleXOffset,
    aiCastleXOffset: GameBalance.battlefield.aiCastleXOffset,
    castleDefense: {
        defenseRange: GameBalance.castle.defenseRange,
        defenseDamage: GameBalance.castle.defenseDamage,
        defenseAttackDelay: GameBalance.castle.defenseAttackDelay,
        defenseProjectileKind: GameBalance.castle.defenseProjectileKind,
    },
};

const UNIT_CLASSES = new Map([
    ['swordsman', Swordsman],
    ['archer', Archer],
    ['mage', Mage],
    ['tank', Tank],
    ['assassin', Assassin],
    ['necromancer', Necromancer],
    ['giant', Giant],
    ['supreme', Supreme],
    ['hero', Hero],
    ['skeleton', Skeleton],
    ['healer', Healer],
]);

const EVENT_REGISTRY = [
    {
        id: 'first_ai_wave',
        trigger: { type: 'time', value: 20 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'swordsman', count: 5 }], free: true },
        once: true,
        title: '⚠️ Shadow Rush!',
        message: 'Enemy swordsman incoming!',
    },
    {
        id: 'first_player_bonus',
        trigger: { type: 'time', value: 50 },
        action: { type: 'gold_bonus', owner: 'player', amount: 1000 },
        once: true,
        title: '💰 Supply Drop!',
        message: 'You receive 600 gold reinforcements!',
    },
    {
        id: 'second_ai_wave',
        trigger: { type: 'time', value: 90 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'assassin', count: 6 }, { name: 'archer', count: 5 }], free: true },
        once: true,
        title: '⚠️ Shadow Rush!',
        message: 'Enemy assassins sprint toward your castle!',
    },
    {
        id: 'second_player_bonus',
        trigger: { type: 'time', value: 120 },
        action: { type: 'gold_bonus', owner: 'player', amount: 1500 },
        once: true,
        title: '💰 Supply Drop!',
        message: 'You receive 600 gold reinforcements!',
    },
    {
        id: 'gigantic_wave',
        trigger: { type: 'time', value: 150 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'giant', count: 3 }], free: true },
        once: true,
        title: '⚠️ Giant Wave!',
        message: 'The enemy summons a titan army!',
    },
    {
        id: 'big_giant_wave',
        trigger: { type: 'time', value: 180 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'giant', count: 8 }], free: true },
        once: true,
        title: '⚠️ Giant Wave!',
        message: 'The enemy summons a titan army!',
    },
    {
        id: 'ai_mage_wave',
        trigger: { type: 'time', value: 200 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'mage', count: 4 }, { name: 'necromancer', count: 20 }], free: true },
        once: true,
        title: '⚠️ Arcane Assault!',
        message: 'Dark mages join the enemy ranks!',
    },
    {
        id: 'third_player_gold_bonus',
        trigger: { type: 'time', value: 240 },
        action: { type: 'gold_bonus', owner: 'player', amount: 800 },
        once: true,
        title: '💰 Supply Drop!',
        message: 'You receive 800 gold reinforcements!',
    },
    {
        id: 'ai_siege_wave',
        trigger: { type: 'time', value: 300 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'supreme', count: 15 }, { name: 'giant', count: 10 }, { name: 'assassin', count: 30 }], free: true },
        once: true,
        title: '⚠️ Siege Wave!',
        message: 'A massive combined assault approaches!',
    },
    {
        id: 'last_drop',
        trigger: { type: 'time', value: 330 },
        action: { type: 'gold_bonus', owner: 'player', amount: 1500 },
        once: true,
        title: '⚠️ Siege Wave!',
        message: 'A massive combined assault approaches!',
    },
    {
        id: 'ai_desperate_wave_low_hp',
        trigger: { type: 'castle_hp_below', owner: 'ai', value: 0.4 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'tank', count: 8 }, { name: 'swordsman', count: 50 }, { name: 'assassin', count: 50 }], free: true },
        once: true,
        title: '⚠️ Desperate Defense!',
        message: 'The enemy throws everything at you!',
    },
    {
        id: 'player_desperate_bonus_low_hp',
        trigger: { type: 'castle_hp_below', owner: 'player', value: 0.4 },
        action: { type: 'gold_bonus', owner: 'player', amount: 5000 },
        once: true,
        title: '💰 Last Stand!',
        message: 'Your allies send 600 gold as aid!',
    },
];

function startGame() {
    const game = new Game(GAME_CONFIG);
    game.unitRegistry = new UnitRegistry();

    const assetRegistry = new UnitAssetRegistry();
    assetRegistry.setUnitRegistry(game.unitRegistry);

    const fx = new FXSystem(game);
    game.fx = fx;
    const combat = new CombatSystem(game, fx, {
        playerCastleX: GAME_CONFIG.playerCastleX,
        aiCastleX: GAME_CONFIG.battlefieldWidth - GAME_CONFIG.aiCastleXOffset,
    });
    const defense = new CastleDefenseSystem(game, fx);
    const ai = new AIManager(game, {
        thinkInterval: GameBalance.ai.thinkInterval,
        minSpawnScore: GameBalance.ai.minSpawnScore,
        goldRate: GameBalance.economy.aiGoldRate,
    });

    const uiRefs = {
        goldEl: document.getElementById('gold'),
        timeEl: document.getElementById('time'),
        playerHpBar: document.getElementById('player-hp'),
        aiHpBar: document.getElementById('ai-hp'),
        playerHpText: document.getElementById('player-hp-text'),
        aiHpText: document.getElementById('ai-hp-text'),
        aiGoldInfo: document.getElementById('ai-gold'),
        heroLevelEl: document.getElementById('hero-level'),
        heroExpText: document.getElementById('hero-exp-text'),
        heroXpBar: document.getElementById('hero-xp-bar'),
        heroHpStat: document.getElementById('hero-hp-stat'),
        heroDmgStat: document.getElementById('hero-dmg-stat'),
        heroSpdStat: document.getElementById('hero-spd-stat'),
        castlePlayer: document.getElementById('castle-player'),
        castleAi: document.getElementById('castle-ai'),
        castleLevelEl: document.getElementById('castle-level'),
        castleUpgradeBtn: document.getElementById('castle-upgrade-btn'),
        btnPause: document.getElementById('btn-pause'),
        btnSpeed: document.getElementById('btn-speed'),
        btnReset: document.getElementById('btn-reset'),
        volumeSlider: document.getElementById('volume-slider'),
    };

    const hud = new HUD(game, uiRefs);
    game._hud = hud;
    const renderer = new CanvasRenderer(game, document.getElementById('game-canvas'), assetRegistry);
    const roster = new UnitRoster(game, assetRegistry);
    const cards = new CardDeck(game, hud, () => hud._heroLevel, assetRegistry);

    game.config = {
        ...game.config,
        castleDefense: GAME_CONFIG.castleDefense,
        combatSystem: combat,
        castleDefenseSystem: defense,
        aiManager: ai,
        fxSystem: fx,
        hud,
        unitRenderer: renderer,
        unitRoster: roster,
        cardDeck: cards,
        uiRefs,
    };

    game.plugins.register(new SFXPlugin());
    game.plugins.register(new SavePlugin());
    game.plugins.register(new EventPlugin('events', EVENT_REGISTRY));
    game.plugins.register(new UnitSpawnerPlugin());

    const engine = new GameEngine(game, {
        logEl: document.getElementById('log'),
        unitClasses: UNIT_CLASSES,
    });

    engine.bootstrap();

    window.game = game;
    game.start();
}

startGame();
