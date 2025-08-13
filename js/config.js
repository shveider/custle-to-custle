window.CONFIG = {
    goldRate: 11, // per second (player)
    aiGoldRate: 17, // per second (ai)
    castleHP: 1000,
    battlefieldWidth: 1500,
    unitSize: 48,
    updateInterval: 60 // ms
};

window.UNIT_DEFS = {
    swordsman: {
        cost: 50,
        hp: 150,
        dmg: 10,
        speed: 0.8,
        range: 50,
        type: 'melee',
        special: { shieldBlock: 0.2 },
        resource: {type: 'stamina', max: 100, regenPerSec: 15, costPerAttack: 16}
    },
    archer: {
        cost: 100,
        hp: 65,
        dmg: 20,
        speed: 1.0,
        range: 180,
        type: 'ranged',
        special: {piercing: 0.5},
        resource: {type: 'stamina', max: 80, regenPerSec: 12, costPerAttack: 15}
    },
    mage: {
        cost: 120,
        hp: 50,
        dmg: 40,
        speed: 2,
        range: 170,
        type: 'ranged',
        special: { chain: 0.5 },
        resource: {type: 'mana', max: 110, regenPerSec: 13, costPerAttack: 20}
    },
    supreme: {
        cost: 200,
        hp: 50,
        dmg: 80,
        speed: 0.35,
        range: 320,
        type: 'siege',
        special: {siege: true, castleBonus: 3.0, line: true, attackDelay: 2400},
        resource: {type: 'mana', max: 120, regenPerSec: 6, costPerAttack: 40}
    },
    hero: {
        cost: 400,
        hp: 300,
        dmg: 40,
        speed: 1.0,
        range: 90,
        type: 'hero',
        special: {unique: true},
        resource: {type: 'stamina', max: 120, regenPerSec: 20, costPerAttack: 25}
    },
    tank: {
        cost: 200,
        hp: 1000,
        dmg: 5,
        speed: 0.5,
        range: 90,
        type: 'melee',
        special: {shieldBlock: 0.8},
        resource: {type: 'stamina', max: 150, regenPerSec: 30, costPerAttack: 35}
    },
    assassin: {
        cost: 150,
        hp: 80,
        dmg: 35,
        speed: 2.2,
        range: 60,
        type: 'melee',
        special: { criticalStrike: 0.3 },
        resource: {type: 'stamina', max: 90, regenPerSec: 18, costPerAttack: 18}
    },
    necromancer: {
        cost: 180,
        hp: 60,
        dmg: 25,
        speed: 0.7,
        range: 200,
        type: 'ranged',
        special: { summonSkeleton: 0.2, attackDelay: 1800 },
        resource: {type: 'mana', max: 150, regenPerSec: 10, costPerAttack: 30}
    },
    giant: {
        cost: 350,
        hp: 800,
        dmg: 60,
        speed: 0.4,
        range: 120,
        type: 'melee',
        special: { areaAttack: 0.5, attackDelay: 2000 },
        resource: {type: 'stamina', max: 180, regenPerSec: 12, costPerAttack: 45}
    }
};
