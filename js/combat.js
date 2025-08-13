// global interop
// CONFIG, UNIT_DEFS, state provided on window by other scripts
// functions from other files are attached to window as well
// Use window lookups at runtime rather than top-level consts to avoid redeclaration

window.attack = function attack(attacker, target) {
    // resource gating: require resource for an attack
    const resLeft = attacker.resource;
    const resCost = attacker.resourceCostPerAttack || 0;

    if (resLeft < resCost) {
        return; // not enough resource to attack
    }

    attacker.resource = Math.max(0, resLeft - resCost);

    const dmg = attacker.def.dmg;
    let finalDmg = dmg;

    if (attacker.defName === 'archer' && target.defName === 'hero') {
        finalDmg = dmg * (1 + (attacker.def.special.piercing || 0));
    }

    if (target.defName === 'swordsman' && target.def.special && target.def.special.shieldBlock) {
        if (Math.random() < target.def.special.shieldBlock) {
            log(`${target.owner}'s swordsman blocked the attack!`);
            return;
        }
    }

    // visuals: spawn simple projectiles for ranged/magic
    if (attacker.def.type !== 'melee') {
        const kind = attacker.defName === 'archer' ? 'arrow' : (attacker.defName === 'mage' ? 'bolt' : (attacker.defName === 'supreme' ? 'bolt' : 'fire'));
        const distance = Math.min(Math.abs(target.x - attacker.x), attacker.def.range || 160);
        window.spawnProjectile(kind, attacker.x, attacker.dir, Math.max(40, distance));
    }

    target.curHp -= finalDmg;
    // spawn impact at target position
    window.spawnImpact(target.x, attacker.defName === 'mage' || attacker.defName === 'supreme' ? 'magic' : 'hit');
    window.spawnDamageNumber(target.x, finalDmg, false);
    window.log(`${attacker.owner} ${attacker.defName} hit ${target.owner} ${target.defName} for ${Math.round(finalDmg)}`);
    // sound
    if (attacker.defName === 'mage' || attacker.defName === 'supreme') window.sfx && window.sfx.magic && window.sfx.magic();
    else if (attacker.defName === 'archer') window.sfx && window.sfx.arrow && window.sfx.arrow();
    else window.sfx && window.sfx.hit && window.sfx.hit();

    if (attacker.defName === 'supreme' && attacker.def.special && attacker.def.special.line) {
        const lineRange = attacker.def.range || 300;
        const others = window.state.units.filter(o => o.owner !== attacker.owner && o.id !== target.id)
            .filter(o => attacker.dir === 1 ? (o.x >= target.x && o.x - attacker.x <= lineRange) : (o.x <= target.x && attacker.x - o.x <= lineRange));
        for (const o of others) {
            o.curHp -= finalDmg;
        }
        if (others.length > 0) window.log(`Supreme Mage's arcane bolt pierced through ${others.length} more unit(s).`);
    }

    if (attacker.defName === 'mage' && attacker.def.special && attacker.def.special.chain) {
        const enemiesNearby = window.state.units.filter(o => o.owner !== attacker.owner && o.id !== target.id && Math.abs(o.x - target.x) < 120);
        if (enemiesNearby.length > 0) {
            const sec = enemiesNearby[0];
            const chainDmg = finalDmg * attacker.def.special.chain;
            sec.curHp -= chainDmg;
            window.log('Chain lightning hit secondary target for ' + Math.round(chainDmg));
        }
    }

    if (target.curHp <= 0) {
        window.log(`${target.owner} ${target.defName} died`);
        window.gainGoldOnKill(attacker.owner, target.def.cost || 0);
        if (attacker.owner === 'player') {
            window.gainHeroExp(10 + Math.floor((target.def && target.def.hp) || 0) / 10);
        }
    }
}

window.attackCastle = function attackCastle(attacker) {
    // resource gating for castle attacks too
    const resLeft = attacker.resource;
    const resCost = attacker.resourceCostPerAttack || 0;
    if (resLeft < resCost) {
        return;
    }
    attacker.resource = Math.max(0, resLeft - resCost);
    let dmg = attacker.def.dmg;
    if (attacker.def.special && attacker.def.special.siege && attacker.def.special.castleBonus) {
        dmg = Math.round(dmg * attacker.def.special.castleBonus);
    }
    // visuals towards castle
    if (attacker.def.type !== 'melee') {
        const kind = attacker.defName === 'archer' ? 'arrow' : (attacker.defName === 'mage' ? 'bolt' : (attacker.defName === 'supreme' ? 'bolt' : 'fire'));
        const targetX = attacker.owner === 'player' ? (window.CONFIG.battlefieldWidth - 40) : 40;
        const distance = Math.abs(targetX - attacker.x);
        window.spawnProjectile(kind, attacker.x, attacker.dir, Math.max(60, Math.min(distance, attacker.def.range || distance)));
    }
    if (attacker.defName === 'supreme' && attacker.def.special && attacker.def.special.line) {
        const lineRange = attacker.def.range || 300;
        const affected = window.state.units.filter(o => o.owner !== attacker.owner)
            .filter(o => attacker.dir === 1 ? (o.x >= attacker.x && o.x - attacker.x <= lineRange) : (o.x <= attacker.x && attacker.x - o.x <= lineRange));
        for (const o of affected) {
            o.curHp -= attacker.def.dmg;
        }

        if (affected.length > 0) window.log(`Supreme Mage's siege bolt pierced ${affected.length} unit(s) on the way to the castle.`);
    }
    if (attacker.owner === 'player') {
        window.state.aiHP -= dmg;
        window.log(`${attacker.defName} bombarded the AI castle for ${dmg}`);
        if (window.sfx) {
            if (attacker.defName === 'supreme' || attacker.defName === 'mage') window.sfx.magic && window.sfx.magic(); else window.sfx.hit && window.sfx.hit();
        }
    } else {
        window.state.playerHP -= dmg;
        window.log(`AI ${attacker.defName} bombarded your castle for ${dmg}`);
        if (window.sfx) {
            if (attacker.defName === 'supreme' || attacker.defName === 'mage') window.sfx.magic && window.sfx.magic(); else window.sfx.hit && window.sfx.hit();
        }
    }
}

window.gainGoldOnKill = function gainGoldOnKill(owner, amount) {
    if (!amount) return;
    if (owner === 'player') {
        window.state.gold = window.state.gold + amount * 0.2;
    }
}

window.gainHeroExp = function gainHeroExp(amount) {
    window.state.heroExp += amount;
    let leveled = false;

    while (window.state.heroExp >= window.state.heroExpToNext) {
        window.state.heroExp -= window.state.heroExpToNext;
        window.state.heroLevel++;
        window.state.heroExpToNext = Math.floor(window.state.heroExpToNext * 1.4);
        leveled = true;
    }

    if (leveled) {
        window.log('Hero leveled up to ' + window.state.heroLevel);
        const heroUnit = window.state.units.find(u => u.owner === 'player' && u.defName === 'hero');

        if (heroUnit) {
            const oldMaxHp = heroUnit.def.hp;
            heroUnit.def = window.getScaledHeroDef(window.UNIT_DEFS.hero, window.state.heroLevel);
            const newMaxHp = heroUnit.def.hp;
            heroUnit.curHp = window.clamp(heroUnit.curHp + Math.max(10, Math.floor((newMaxHp - oldMaxHp) * 0.5)), 0, newMaxHp);
        }
    }
}


