import { GameEvents } from '../core/Events.js';
import { AbilityRegistry } from './abilities/AbilityRegistry.js';

const GROUND_Y = 380; // Match CanvasRenderer.GROUND_Y

function unitHeight(defName) {
    if (defName === 'giant') return 62;
    if (defName === 'skeleton') return 38;
    return 52;
}

export class CombatSystem {
    constructor(game, fxSystem, config) {
        this.game = game;
        this.fx = fxSystem;
        this.config = config;
        this._setupListeners();
    }

    _setupListeners() {
        this.game.events.on(GameEvents.UNIT_ATTACK, (attacker, target) => this._resolveAttack(attacker, target));
        this.game.events.on(GameEvents.UNIT_ATTACK_CASTLE, (attacker) => this._attackCastle(attacker));
        this.game.events.on(GameEvents.UNIT_HEAL, (healer) => this._resolveHeal(healer));
    }

    _resolveAttack(attacker, target) {
        if (!attacker.hasResource()) return;
        attacker.spendResource();

        if (this._tryShieldBlock(attacker, target)) return;

        let dmg = attacker.dmg;

        const piercing = AbilityRegistry.piercing;
        if (piercing && piercing.hasAttackSpecial(attacker)) {
            dmg = piercing.modifyDamage(attacker, target, dmg);
        }

        if (attacker.isRanged) {
            const UnitClass = this.game.unitRegistry.get(attacker.defName);
            const projectileKind = UnitClass?.STATS?.projectileKind || 'fire';
            const dist = Math.min(Math.abs(target.x - attacker.x), attacker.range);
            const attackerY = GROUND_Y - unitHeight(attacker.defName) / 2;
            let maxDistance = Math.max(40, dist);
            const line = AbilityRegistry.line;
            if (line && line.hasAttackSpecial(attacker)) {
                maxDistance = attacker.special.lineRange || attacker.range;
            }
            this.fx.spawnProjectile(projectileKind, attacker.x, attackerY, attacker.dir, maxDistance);
        }

        target.damage(dmg);

        const UnitClass = this.game.unitRegistry.get(attacker.defName);
        const impactKind = UnitClass?.STATS?.impactKind || 'hit';
        this.fx.spawnImpact(target.x, impactKind);
        this.fx.spawnDamageNumber(target.x, dmg, false);

        this.game.events.emit(GameEvents.COMBAT_HIT, attacker, target, dmg);

        this._executeAttackAbilities(attacker, target, dmg);
        this._executeUnitAbilities(attacker, target, dmg);

        if (!target.isAlive) {
            this._onKill(attacker, target);
        }
    }

    _executeAttackAbilities(attacker, target, dmg) {
        const criticalStrike = AbilityRegistry.criticalStrike;
        if (criticalStrike && criticalStrike.hasAttackSpecial(attacker)) {
            criticalStrike.tryActivate(attacker, target, dmg, this.game, this.fx);
        }

        const chain = AbilityRegistry.chain;
        if (chain && chain.hasAttackSpecial(attacker)) {
            chain.execute(attacker, target, dmg, this.game, this.fx);
        }

        const area = AbilityRegistry.area;
        if (area && area.hasAttackSpecial(attacker)) {
            area.execute(attacker, target, dmg, this.game, this.fx);
        }

        const line = AbilityRegistry.line;
        if (line && line.hasAttackSpecial(attacker)) {
            line.executeOnUnit(attacker, target, dmg, this.game, this.fx);
        }
    }

    _executeUnitAbilities(attacker, target, dmg) {
        const summon = AbilityRegistry.summon;
        if (summon && summon.hasAttackSpecial(attacker)) {
            summon.execute(attacker, target, dmg, this.game, this.fx);
        }
    }

    _attackCastle(attacker) {
        if (!attacker.hasResource()) return;
        attacker.spendResource();

        let dmg = attacker.dmg;

        const siege = AbilityRegistry.siege;
        if (siege && siege.hasAttackSpecial(attacker)) {
            dmg = siege.modifyCastleDamage(attacker, dmg);
        }

        if (attacker.isRanged) {
            const UnitClass = this.game.unitRegistry.get(attacker.defName);
            const projectileKind = UnitClass?.STATS?.projectileKind || 'fire';
            const targetX = attacker.owner === 'player'
                ? this.config.aiCastleX
                : this.config.playerCastleX;
            const dist = Math.abs(targetX - attacker.x);
            const attackerY = GROUND_Y - unitHeight(attacker.defName) / 2;
            let maxDistance = Math.max(60, Math.min(dist, attacker.range));
            const line = AbilityRegistry.line;
            if (line && line.hasAttackSpecial(attacker)) {
                maxDistance = attacker.special.lineRange || attacker.range;
            }
            this.fx.spawnProjectile(projectileKind, attacker.x, attackerY, attacker.dir, maxDistance);
        }

        const line = AbilityRegistry.line;
        if (line && line.hasAttackSpecial(attacker)) {
            line.executeOnCastle(attacker, dmg, this.game, this.fx);
        }

        const castleOwner = attacker.owner === 'player' ? 'ai' : 'player';
        this.game.damageCastle(castleOwner, dmg);
        this.game.events.emit(GameEvents.COMBAT_CASTLE_HIT, attacker, castleOwner, dmg);
    }

    _resolveHeal(healer) {
        if (!healer.hasHealResource()) return;
        healer.spendHealResource();

        const healAmount = healer.special.healAmount || 12;
        const healRange = healer.range || 100;

        // Find all allies in range that need healing
        const allies = this.game.entities.units.filter(u =>
            u.owner === healer.owner &&
            u.id !== healer.id &&
            u.curHp > 0 &&
            u.curHp < u.maxHp &&
            Math.abs(u.x - healer.x) < healRange
        );

        if (allies.length === 0) return;

        // Apply healing to all allies in range (splash heal)
        for (const ally of allies) {
            const actualHeal = Math.min(healAmount, ally.maxHp - ally.curHp);
            ally.curHp = Math.min(ally.maxHp, ally.curHp + healAmount);
            this.fx.spawnImpact(ally.x, 'heal');
            this.fx.spawnDamageNumber(ally.x, actualHeal, false, true);
        }

        this.game.events.emit(GameEvents.COMBAT_HEAL, healer, allies, healAmount);
    }

    _tryShieldBlock(attacker, target) {
        const shieldBlock = AbilityRegistry.shieldBlock;
        if (shieldBlock && shieldBlock.hasAttackSpecial(target)) {
            return shieldBlock.tryActivate(attacker, target, 0, this.game, this.fx);
        }
        return false;
    }

    _onKill(attacker, target) {
        const killGold = (target.constructor.cost || 0) * 0.2;
        console.log('cost', target.constructor.cost)
        console.log('killGold for', attacker.owner, killGold)
        if (killGold > 0) {
            this.game.addGold(attacker.owner, killGold);
        }
        if (attacker.owner === 'player') {
            this.game.events.emit(GameEvents.HERO_EXP, 10 + Math.floor(target.maxHp / 10));
        }
        this.game.events.emit(GameEvents.UNIT_KILLED, attacker, target);
    }
}
