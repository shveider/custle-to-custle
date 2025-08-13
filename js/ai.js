window.aiThink = function aiThink(deltaTimeMs) {
    aiTimeAccumulator += deltaTimeMs;
    if (aiTimeAccumulator < 1200) {
        return;
    }

    aiTimeAccumulator = 0;

    const units = window.state.units;
    const playerUnits = units.filter(u => u.owner === 'player');
    const aiUnits = units.filter(u => u.owner === 'ai');

    const countByType = arr =>
        arr.reduce((acc, u) => {
            acc[u.defName] = (acc[u.defName] || 0) + 1;
            return acc;
        }, {});

    const playerUnitCounts = countByType(playerUnits);
    const aiUnitCounts = countByType(aiUnits);

    const aiCastleX = window.CONFIG.battlefieldWidth - 40;
    const nearestEnemyX = playerUnits.length ? Math.max(...playerUnits.map(u => u.x)) : 0;
    const distanceToAiCastle = Math.max(0, aiCastleX - nearestEnemyX);
    const enemyNearCastle = distanceToAiCastle < 200;

    const aiHasFrontline = aiUnits.some(u => u.def.type === 'melee' || u.defName === 'hero');
    const aiHeroAlive = aiUnits.some(u => u.defName === 'hero');

    function scoreUnit(unitName) {
        const def = window.UNIT_DEFS[unitName];
        const cost = def.cost;

        // --- Базова бойова ефективність ---
        const attacksPerSec = 1000 / (def.special.attackDelay || 1000);
        const dps = def.dmg * attacksPerSec;
        const effectiveHP = def.hp / (def.speed < 0.7 ? 0.9 : 1); // повільних легше вбити

        let score = (dps * 0.6 + effectiveHP * 0.4) / cost;

        // --- Переваги дальності ---
        score += (def.range / 100) * 0.3;

        if (unitName === 'swordsman') {
            score -= 0.6
        }

        // --- Контрпідбір ---
        if (unitName === 'archer') score += (playerUnitCounts.swordsman || 0) * 0.8;
        if (unitName === 'mage') score += (playerUnitCounts.archer || 0) * 0.9;
        if (unitName === 'supreme') score += playerUnits.length <= 2 ? 1.5 : -0.5;
        if (unitName === 'tank') score += playerUnitCounts.supreme * 0.2;
        if (unitName === 'hero') score += enemyNearCastle ? 2.5 : 1;

        // --- Нові юніти ---
        if (unitName === 'assassin') score += (playerUnitCounts.mage || 0) * 0.9 + (playerUnitCounts.archer || 0) * 0.7;
        if (unitName === 'necromancer') score += (playerUnitCounts.tank || 0) * 0.8 + (aiUnitCounts.necromancer || 0) * -0.3;
        if (unitName === 'giant') score += (playerUnitCounts.swordsman || 0) * 0.6 + (enemyNearCastle ? 1.2 : 0);

        // --- Баланс ролей ---
        if (!aiHasFrontline && (unitName === 'swordsman')) score += 0.4;
        if (!aiHasFrontline && (unitName === 'hero' || unitName === 'giant')) score += 1.5;
        if (!aiHasFrontline && (unitName === 'archer' || unitName === 'mage' || unitName === 'supreme' || unitName === 'necromancer')) score -= 1;

        // --- Атакуюча ініціатива ---
        if (!enemyNearCastle && playerUnits.length <= 2) {
            if (unitName === 'swordsman') score -= 4;
            if (unitName === 'archer') score += 0.5;
            if (unitName === 'supreme') score += 1.5;
            if (unitName === 'tank') score += 1.5;
            if (unitName === 'assassin') score += 2.0;
            if (unitName === 'giant') score -= 1.0;
        }

        if (unitName === 'hero' && aiHeroAlive) score -= 10;
        if (unitName === 'swordsman' && enemyNearCastle) score -= 5;

        return score;
    }

    const allUnitTypes = ['swordsman', 'archer', 'mage', 'supreme', 'hero', 'tank', 'assassin', 'necromancer', 'giant'];
    const scoredUnits = allUnitTypes
        .map(name => ({ name, score: scoreUnit(name), cost: window.UNIT_DEFS[name].cost }))
        .sort((a, b) => b.score - a.score);

    const gold = window.state.aiGold;

    // --- Рішення накопичувати ---
    const playerGold = window.state.gold;
    const playerNotStockpiling = playerGold < 350;
    const aiSafe = !enemyNearCastle && playerUnits.length <= 4;
    const noPlayerUnits = playerUnits.length === 0;

    const bestUnit = scoredUnits[0];
    const shouldSaveForStrongUnit =
        aiSafe &&
        playerNotStockpiling &&
        bestUnit.cost > gold &&
        (bestUnit.name === 'supreme' || bestUnit.name === 'hero' || bestUnit.name === 'giant');

    if (shouldSaveForStrongUnit || noPlayerUnits) {
        return; // накопичуємо золото
    }

    if (playerUnits.length === 1 && skipCount < 5) {
        aiTimeAccumulator -= 10
        skipCount++
        return;
    }

    if (playerUnits.length === 1 && aiUnits.length > 3 && skipCount < 7) {
        aiTimeAccumulator -= 100
        skipCount++
        return;
    }


    if (playerUnits.length === 2 && aiUnits.length > 5 && skipCount < 7) {
        aiTimeAccumulator -= 100
        skipCount++
        return;
    }

    if (playerUnits.length === 2 && skipCount < 3) {
        aiTimeAccumulator -= 100
        skipCount++
        return;
    }

    let SUPER_DEFENCE = false
    if (playerUnits.length > 4 && aiUnits.length * 3 < playerUnits.length && gold > 1000) {
        SUPER_DEFENCE = true
    }

    skipCount = 0

    // --- Спавн ---
    let spawns = 0;
    let remainingGold = gold;

    for (const candidate of scoredUnits) {
        if (!SUPER_DEFENCE && spawns >= 2) break;
        if (candidate.cost <= remainingGold && candidate.score > 0.3) {
            if (candidate.name === 'hero' && aiHeroAlive) continue;
            window.state.aiGold -= candidate.cost;
            remainingGold -= candidate.cost;
            window.spawnUnit('ai', candidate.name);
            spawns++;
        }
    }
};

let aiTimeAccumulator = 0;
let skipCount = 0;
