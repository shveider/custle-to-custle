import { Game } from './core/Game.js';
import { UnitRegistry } from './core/UnitRegistry.js';
import { GameEngine } from './core/GameEngine.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { CastleDefenseSystem } from './systems/CastleDefenseSystem.js';
import { FXSystem } from './fx/FXSystem.js';
import { AIManager } from './ai/AIManager.js';
import { HUD } from './ui/HUD.js';
import { CardDeck } from './ui/CardDeck.js';
import { UnitRoster } from './ui/UnitRoster.js';
import { UnitRenderer } from './ui/UnitRenderer.js';
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

const GAME_CONFIG = {
    goldRate: 11,
    aiGoldRate: 17,
    castleHP: 1000,
    aiCastleHP: 2000,
    battlefieldWidth: 4000,
    unitSize: 48,
    fixedDt: 1000 / 60,
    playerCastleX: 40,
    aiCastleX: 3960,
    aiCastleXOffset: 40,
    spawnXOffset: 60,
    maxUnitsPerSide: 80,
    castleDefense: {
        defenseRange: 360,
        defenseDamage: 35,
        defenseAttackDelay: 1300,
        defenseProjectileKind: 'bolt',
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
]);

const EVENT_REGISTRY = [
    {
        id: 'ai_rush_10s',
        trigger: { type: 'time', value: 10 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'swordsman', count: 10 }], free: true },
        once: true,
        title: '⚠️ Shadow Rush!',
        message: 'Enemy swordsman incoming!',
    },
    {
        id: 'player_gold_bonus_50s',
        trigger: { type: 'time', value: 50 },
        action: { type: 'gold_bonus', owner: 'player', amount: 800 },
        once: true,
        title: '💰 Supply Drop!',
        message: 'You receive 600 gold reinforcements!',
    },
    {
        id: 'ai_rush_60s',
        trigger: { type: 'time', value: 60 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'assassin', count: 8 }, { name: 'archer', count: 5 }], free: true },
        once: true,
        title: '⚠️ Shadow Rush!',
        message: 'Enemy assassins sprint toward your castle!',
    },
    {
        id: 'player_gold_bonus_65s',
        trigger: { type: 'time', value: 65 },
        action: { type: 'gold_bonus', owner: 'player', amount: 600 },
        once: true,
        title: '💰 Supply Drop!',
        message: 'You receive 600 gold reinforcements!',
    },
    {
        id: 'ai_giant_wave_90s',
        trigger: { type: 'time', value: 90 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'giant', count: 3 }], free: true },
        once: true,
        title: '⚠️ Giant Wave!',
        message: 'The enemy summons a titan army!',
    },
    {
        id: 'ai_giant_wave_2min',
        trigger: { type: 'time', value: 120 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'giant', count: 8 }], free: true },
        once: true,
        title: '⚠️ Giant Wave!',
        message: 'The enemy summons a titan army!',
    },
    {
        id: 'ai_mage_wave_160s',
        trigger: { type: 'time', value: 160 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'mage', count: 4 }, { name: 'necromancer', count: 20 }], free: true },
        once: true,
        title: '⚠️ Arcane Assault!',
        message: 'Dark mages join the enemy ranks!',
    },
    {
        id: 'player_gold_bonus_3min',
        trigger: { type: 'time', value: 170 },
        action: { type: 'gold_bonus', owner: 'player', amount: 800 },
        once: true,
        title: '💰 Supply Drop!',
        message: 'You receive 800 gold reinforcements!',
    },
    {
        id: 'ai_siege_wave_4min',
        trigger: { type: 'time', value: 240 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'supreme', count: 20 }, { name: 'giant', count: 10 }, { name: 'assassin', count: 40 }], free: true },
        once: true,
        title: '⚠️ Siege Wave!',
        message: 'A massive combined assault approaches!',
    },
    {
        id: 'ai_desperate_wave_low_hp',
        trigger: { type: 'castle_hp_below', owner: 'ai', value: 0.25 },
        action: { type: 'spawn_wave', owner: 'ai', units: [{ name: 'tank', count: 8 }, { name: 'swordsman', count: 50 }, { name: 'assassin', count: 50 }], free: true },
        once: true,
        title: '⚠️ Desperate Defense!',
        message: 'The enemy throws everything at you!',
    },
    {
        id: 'player_desperate_bonus_low_hp',
        trigger: { type: 'castle_hp_below', owner: 'player', value: 0.25 },
        action: { type: 'gold_bonus', owner: 'player', amount: 600 },
        once: true,
        title: '💰 Last Stand!',
        message: 'Your allies send 600 gold as aid!',
    },
];

function startGame() {
    const game = new Game(GAME_CONFIG);
    game.unitRegistry = new UnitRegistry();

    const fx = new FXSystem(game);
    game.fx = fx;
    const combat = new CombatSystem(game, fx, {
        playerCastleX: GAME_CONFIG.playerCastleX,
        aiCastleX: GAME_CONFIG.battlefieldWidth - GAME_CONFIG.aiCastleXOffset,
    });
    const defense = new CastleDefenseSystem(game, fx);
    const ai = new AIManager(game, {
        allUnitTypes: ['swordsman', 'archer', 'mage', 'supreme', 'hero', 'tank', 'assassin', 'necromancer', 'giant'],
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
        castlePlayer: document.getElementById('castle-player'),
        castleAi: document.getElementById('castle-ai'),
        btnPause: document.getElementById('btn-pause'),
        btnSpeed: document.getElementById('btn-speed'),
        btnReset: document.getElementById('btn-reset'),
        volumeSlider: document.getElementById('volume-slider'),
    };

    const hud = new HUD(game, uiRefs);
    game._hud = hud;
    const renderer = new UnitRenderer(game, document.getElementById('battle'));
    const roster = new UnitRoster(game);
    const cards = new CardDeck(game, hud, () => hud._heroLevel);

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
        battleEl: document.getElementById('battle'),
        logEl: document.getElementById('log'),
        unitClasses: UNIT_CLASSES,
    });

    engine.bootstrap();

    window.game = game;
    game.start();
}

startGame();
