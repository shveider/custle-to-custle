export const GameBalance = {
    economy: {
        playerGoldRate: 12,
        aiGoldRate: 12,
    },
    castle: {
        playerHP: 1000,
        aiHP: 2000,
        defenseRange: 360,
        defenseDamage: 35,
        defenseAttackDelay: 1300,
        defenseProjectileKind: 'bolt',
    },
    castleLevels: {
        maxLevel: 10,
        hpPerLevel: 300,
        defenseDamagePerLevel: 10,
        defenseRangePerLevel: 15,
        unitHpBoostPerLevel: 0.04,
        unitDmgBoostPerLevel: 0.04,
        baseCost: 300,
        costMultiplier: 2,
    },
    hero: {
        baseHP: 300,
        hpPerLevel: 100,
        baseDmg: 40,
        dmgPerLevel: 8,
        baseResourceMax: 125,
        resourceMaxPerLevel: 1,
        baseSpeed: 1.0,
        speedPerLevel: 0.1,
        respawnTime: 30000,
        deployCooldown: 60000,
        goldRate: 12,
    },
    units: {
        maxPerSide: 80,
        unitSize: 48,
    },
    battlefield: {
        width: 3000,
        playerCastleX: 90,
        aiCastleXOffset: 90,
    },
    fx: {
        projectileSpeed: {
            arrow: 420,
            bolt: 360,
            fire: 300,
        },
        impactLife: {
            hit: 220,
            spark: 180,
            magic: 260,
            shield: 300,
        },
    },
    gameLoop: {
        fixedDt: 1000 / 60,
    },
    ai: {
        thinkInterval: 1000,
        minSpawnScore: 0.15,
    },
};
