"use strict";
import { GameEvents } from '../../core/Events.js';
import { SpecialAbility } from '../../core/UnitTypes.js';

export const AbilityRegistry = {
    [SpecialAbility.SHIELD_BLOCK]: {
        name: 'Shield Block',
        hasAttackSpecial(attacker) {
            return attacker.special[SpecialAbility.SHIELD_BLOCK] !== undefined;
        },
        tryActivate(attacker, target, dmg, game, fx) {
            const chance = attacker.special[SpecialAbility.SHIELD_BLOCK];
            if (chance !== undefined && Math.random() < chance) {
                fx.spawnShieldBlock(target.x);
                fx.spawnImpact(target.x, 'shield');
                game.events.emit(GameEvents.COMBAT_BLOCKED, target);
                return true;
            }
            return false;
        },
    },

    [SpecialAbility.PIERCING]: {
        name: 'Piercing',
        hasAttackSpecial(attacker) {
            return attacker.special[SpecialAbility.PIERCING] !== undefined;
        },
        modifyDamage(attacker, target, dmg) {
            if (attacker.special[SpecialAbility.PIERCING] !== undefined && target.defName === 'hero') {
                return dmg * (1 + attacker.special[SpecialAbility.PIERCING]);
            }
            return dmg;
        },
    },

    [SpecialAbility.CRITICAL_STRIKE]: {
        name: 'Critical Strike',
        hasAttackSpecial(attacker) {
            return attacker.special[SpecialAbility.CRITICAL_STRIKE] !== undefined;
        },
        tryActivate(attacker, target, dmg, game, fx) {
            if (attacker.special[SpecialAbility.CRITICAL_STRIKE] !== undefined) {
                if (Math.random() < attacker.special[SpecialAbility.CRITICAL_STRIKE]) {
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

    [SpecialAbility.CHAIN]: {
        name: 'Chain Lightning',
        hasAttackSpecial(attacker) {
            return attacker.special[SpecialAbility.CHAIN] !== undefined;
        },
        execute(attacker, target, dmg, game, fx) {
            if (attacker.special[SpecialAbility.CHAIN] === undefined) return;
            const range = attacker.special.chainRange || 120;
            const nearby = game.entities.findEnemy(attacker.owner).filter(o =>
                o.id !== target.id && Math.abs(o.x - target.x) < range
            );
            if (nearby.length > 0) {
                const sec = nearby[0];
                const chainDmg = dmg * attacker.special[SpecialAbility.CHAIN];
                sec.damage(chainDmg);
                fx.spawnChainLightning(target.x, sec.x);
                fx.spawnImpact(sec.x, 'lightning');
                fx.spawnDamageNumber(sec.x, chainDmg, false);
            }
        },
    },

    [SpecialAbility.AREA]: {
        name: 'Area Attack',
        hasAttackSpecial(attacker) {
            return attacker.special[SpecialAbility.AREA] !== undefined;
        },
        execute(attacker, target, dmg, game, fx) {
            if (attacker.special[SpecialAbility.AREA] === undefined) return;
            if (Math.random() >= attacker.special[SpecialAbility.AREA]) return;

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

    [SpecialAbility.SUMMON]: {
        name: 'Summon',
        hasAttackSpecial(attacker) {
            return attacker.defName === 'necromancer' && attacker.special[SpecialAbility.SUMMON] !== undefined;
        },
        execute(attacker, target, dmg, game, fx) {
            if (attacker.defName !== 'necromancer') return;
            if (attacker.special[SpecialAbility.SUMMON] === undefined) return;
            if (Math.random() >= attacker.special[SpecialAbility.SUMMON]) return;

            const offset = attacker.special.summonOffset || 30;
            const sx = attacker.x + (attacker.dir * offset);
            game.events.emit(GameEvents.UNIT_SUMMON, attacker.owner, 'skeleton', { x: sx, parent: attacker });
        },
    },

    [SpecialAbility.SIEGE]: {
        name: 'Siege',
        hasAttackSpecial(attacker) {
            return attacker.special[SpecialAbility.SIEGE] === true;
        },
        modifyCastleDamage(attacker, dmg) {
            if (attacker.special[SpecialAbility.SIEGE] && attacker.special.castleBonus) {
                return Math.round(dmg * attacker.special.castleBonus);
            }
            return dmg;
        },
    },

    [SpecialAbility.LINE]: {
        name: 'Line Attack',
        hasAttackSpecial(attacker) {
            return attacker.special[SpecialAbility.LINE] !== undefined;
        },
        executeOnCastle(attacker, dmg, game, fx) {
            if (!attacker.special[SpecialAbility.LINE]) return;
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
            if (!attacker.special[SpecialAbility.LINE]) return;
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
