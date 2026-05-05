import { GameEvents } from '../../core/Events.js';

export const AbilityRegistry = {
    shieldBlock: {
        name: 'Shield Block',
        hasAttackSpecial(attacker) {
            return attacker.special.shieldBlock !== undefined;
        },
        tryActivate(attacker, target, dmg, game, fx) {
            const chance = attacker.special.shieldBlock;
            if (chance !== undefined && Math.random() < chance) {
                fx.spawnShieldBlock(target.x);
                fx.spawnImpact(target.x, 'shield');
                game.events.emit(GameEvents.COMBAT_BLOCKED, target);
                return true;
            }
            return false;
        },
    },

    piercing: {
        name: 'Piercing',
        hasAttackSpecial(attacker) {
            return attacker.special.piercing !== undefined;
        },
        modifyDamage(attacker, target, dmg) {
            if (attacker.special.piercing !== undefined && target.defName === 'hero') {
                return dmg * (1 + attacker.special.piercing);
            }
            return dmg;
        },
    },

    criticalStrike: {
        name: 'Critical Strike',
        hasAttackSpecial(attacker) {
            return attacker.special.criticalStrike !== undefined;
        },
        tryActivate(attacker, target, dmg, game, fx) {
            if (attacker.special.criticalStrike !== undefined) {
                if (Math.random() < attacker.special.criticalStrike) {
                    const critDmg = dmg * (attacker.special.critMultiplier || 1.8);
                    target.damage(critDmg);
                    fx.spawnImpact(target.x, 'spark', true);
                    fx.spawnDamageNumber(target.x, critDmg, true);
                    game.events.emit(GameEvents.COMBAT_CRIT, attacker, target, critDmg);
                    return true;
                }
            }
            return false;
        },
    },

    chain: {
        name: 'Chain Lightning',
        hasAttackSpecial(attacker) {
            return attacker.special.chain !== undefined;
        },
        execute(attacker, target, dmg, game, fx) {
            if (attacker.special.chain === undefined) return;
            const range = attacker.special.chainRange || 120;
            const nearby = game.entities.findEnemy(attacker.owner).filter(o =>
                o.id !== target.id && Math.abs(o.x - target.x) < range
            );
            if (nearby.length > 0) {
                const sec = nearby[0];
                const chainDmg = dmg * attacker.special.chain;
                sec.damage(chainDmg);
                fx.spawnChainLightning(target.x, sec.x);
                fx.spawnImpact(sec.x, 'lightning');
                fx.spawnDamageNumber(sec.x, chainDmg, false);
            }
        },
    },

    area: {
        name: 'Area Attack',
        hasAttackSpecial(attacker) {
            return attacker.special.area !== undefined;
        },
        execute(attacker, target, dmg, game, fx) {
            if (attacker.special.area === undefined) return;
            if (Math.random() >= attacker.special.area) return;

            const radius = attacker.special.areaRadius || 60;
            const mult = attacker.special.areaMultiplier || 0.6;
            fx.spawnAreaAttack(target.x, radius);

            const nearby = game.entities.findEnemy(attacker.owner).filter(o =>
                o.id !== target.id && Math.abs(o.x - target.x) < radius
            );
            for (const e of nearby) {
                const areaDmg = dmg * mult;
                e.damage(areaDmg);
                fx.spawnImpact(e.x, 'spark');
            }
        },
    },

    summon: {
        name: 'Summon',
        hasAttackSpecial(attacker) {
            return attacker.defName === 'necromancer' && attacker.special.summon !== undefined;
        },
        execute(attacker, target, dmg, game, fx) {
            if (attacker.defName !== 'necromancer') return;
            if (attacker.special.summon === undefined) return;
            if (Math.random() >= attacker.special.summon) return;

            const offset = attacker.special.summonOffset || 30;
            const sx = attacker.x + (attacker.dir * offset);
            game.events.emit(GameEvents.UNIT_SUMMON, attacker.owner, 'skeleton', { x: sx, parent: attacker });
        },
    },

    siege: {
        name: 'Siege',
        hasAttackSpecial(attacker) {
            return attacker.special.siege === true;
        },
        modifyCastleDamage(attacker, dmg) {
            if (attacker.special.siege && attacker.special.castleBonus) {
                return Math.round(dmg * attacker.special.castleBonus);
            }
            return dmg;
        },
    },

    line: {
        name: 'Line Attack',
        hasAttackSpecial(attacker) {
            return attacker.special.line !== undefined;
        },
        executeOnCastle(attacker, dmg, game, fx) {
            if (!attacker.special.line) return;
            const range = attacker.special.lineRange || attacker.range;
            const enemies = game.entities.findEnemy(attacker.owner).filter(o =>
                (attacker.dir === 1 && o.x >= attacker.x && o.x - attacker.x <= range) ||
                (attacker.dir === -1 && o.x <= attacker.x && attacker.x - o.x <= range)
            );
            for (const e of enemies) {
                e.damage(dmg);
                fx.spawnImpact(e.x, 'magic');
            }
        },
        executeOnUnit(attacker, target, dmg, game, fx) {
            if (!attacker.special.line) return;
            const range = attacker.special.lineRange || attacker.range;
            const enemies = game.entities.findEnemy(attacker.owner).filter(o =>
                o.id !== target.id && (
                    (attacker.dir === 1 && o.x >= target.x && o.x - attacker.x <= range) ||
                    (attacker.dir === -1 && o.x <= target.x && attacker.x - o.x <= range)
                )
            );
            for (const e of enemies) {
                e.damage(dmg);
                fx.spawnImpact(e.x, 'magic');
            }
        },
    },
};

export function getAbilityNames() {
    return Object.keys(AbilityRegistry);
}

export function getAbility(name) {
    return AbilityRegistry[name] || null;
}
