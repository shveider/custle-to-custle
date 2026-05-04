const PROJECTILE_KIND = {
    archer: 'arrow',
    mage: 'bolt',
    supreme: 'bolt',
    necromancer: 'fire',
};

const IMPACT_KIND = {
    mage: 'magic',
    supreme: 'magic',
    assassin: 'spark',
    giant: 'spark',
    necromancer: 'magic',
};

export class CombatSystem {
    constructor(game, fxSystem, config) {
        this.game = game;
        this.fx = fxSystem;
        this.config = config;
        this._setupListeners();
    }

    _setupListeners() {
        this.game.events.on('unit:attack', (attacker, target) => this._resolveAttack(attacker, target));
        this.game.events.on('unit:attackCastle', (attacker) => this._attackCastle(attacker));
    }

    _resolveAttack(attacker, target) {
        if (!attacker.hasResource()) return;
        attacker.spendResource();

        if (this._tryShieldBlock(target)) return;

        let dmg = attacker.dmg;
        if (this._applyPiercing(attacker, target)) {
            dmg *= 1 + (attacker.special.piercing || 0);
        }

        if (attacker.isRanged) {
            const kind = PROJECTILE_KIND[attacker.defName] || 'fire';
            const dist = Math.min(Math.abs(target.x - attacker.x), attacker.range);
            this.fx.spawnProjectile(kind, attacker.x, attacker.dir, Math.max(40, dist));
        }

        target.damage(dmg);

        const impactKind = IMPACT_KIND[attacker.defName] || 'hit';
        this.fx.spawnImpact(target.x, impactKind);
        this.fx.spawnDamageNumber(target.x, dmg, false);

        this.game.events.emit('combat:hit', attacker, target, dmg);

        this._tryCriticalStrike(attacker, target, dmg);
        this._tryLineAttack(attacker, target, dmg);
        this._tryChainLightning(attacker, target, dmg);
        this._tryAreaAttack(attacker, target, dmg);
        this._tryNecromancerSummon(attacker);

        if (!target.isAlive) {
            this._onKill(attacker, target);
        }
    }

    _attackCastle(attacker) {
        if (!attacker.hasResource()) return;
        attacker.spendResource();

        let dmg = attacker.dmg;
        if (attacker.special.siege) {
            dmg = Math.round(dmg * (attacker.special.castleBonus || 1.0));
        }

        if (attacker.isRanged) {
            const kind = PROJECTILE_KIND[attacker.defName] || 'fire';
            const targetX = attacker.owner === 'player'
                ? this.config.aiCastleX
                : this.config.playerCastleX;
            const dist = Math.abs(targetX - attacker.x);
            this.fx.spawnProjectile(kind, attacker.x, attacker.dir, Math.max(60, Math.min(dist, attacker.range)));
        }

        if (attacker.special.line) {
            this._attackLineToCastle(attacker, attacker.dmg);
        }

        const castleOwner = attacker.owner === 'player' ? 'ai' : 'player';
        this.game.damageCastle(castleOwner, dmg);
        this.game.events.emit('combat:castleHit', attacker, castleOwner, dmg);
    }

    _tryShieldBlock(target) {
        const chance = target.special.shieldBlock;
        if (chance !== undefined && Math.random() < chance) {
            this.fx.spawnShieldBlock(target.x);
            this.fx.spawnImpact(target.x, 'shield');
            this.game.events.emit('combat:blocked', target);
            return true;
        }
        return false;
    }

    _applyPiercing(attacker, target) {
        return attacker.special.piercing !== undefined && target.defName === 'hero';
    }

    _tryCriticalStrike(attacker, target, baseDmg) {
        if (attacker.special.criticalStrike !== undefined) {
            if (Math.random() < attacker.special.criticalStrike) {
                const critDmg = baseDmg * (attacker.special.critMultiplier || 1.8);
                target.damage(critDmg);
                this.fx.spawnImpact(target.x, 'spark', true);
                this.fx.spawnDamageNumber(target.x, critDmg, true);
                this.game.events.emit('combat:crit', attacker, target, critDmg);
            }
        }
    }

    _tryLineAttack(attacker, target, dmg) {
        if (!attacker.special.line) return;
        const range = attacker.special.lineRange || attacker.range;
        const enemies = this.game.entities.findEnemy(attacker.owner).filter(o =>
            o.id !== target.id && (
                (attacker.dir === 1 && o.x >= target.x && o.x - attacker.x <= range) ||
                (attacker.dir === -1 && o.x <= target.x && attacker.x - o.x <= range)
            )
        );
        for (const e of enemies) {
            e.damage(dmg);
            this.fx.spawnImpact(e.x, 'magic');
        }
    }

    _tryChainLightning(attacker, target, dmg) {
        if (attacker.special.chain === undefined) return;
        const range = attacker.special.chainRange || 120;
        const nearby = this.game.entities.findEnemy(attacker.owner).filter(o =>
            o.id !== target.id && Math.abs(o.x - target.x) < range
        );
        if (nearby.length > 0) {
            const sec = nearby[0];
            const chainDmg = dmg * attacker.special.chain;
            sec.damage(chainDmg);
            this.fx.spawnChainLightning(target.x, sec.x);
            this.fx.spawnImpact(sec.x, 'lightning');
            this.fx.spawnDamageNumber(sec.x, chainDmg, false);
        }
    }

    _tryAreaAttack(attacker, target, dmg) {
        if (attacker.special.area === undefined) return;
        if (Math.random() >= attacker.special.area) return;

        const radius = attacker.special.areaRadius || 60;
        const mult = attacker.special.areaMultiplier || 0.6;
        this.fx.spawnAreaAttack(target.x, radius);

        const nearby = this.game.entities.findEnemy(attacker.owner).filter(o =>
            o.id !== target.id && Math.abs(o.x - target.x) < radius
        );
        for (const e of nearby) {
            const areaDmg = dmg * mult;
            e.damage(areaDmg);
            this.fx.spawnImpact(e.x, 'spark');
        }
    }

    _tryNecromancerSummon(attacker) {
        if (attacker.defName !== 'necromancer') return;
        if (attacker.special.summon === undefined) return;
        if (Math.random() >= attacker.special.summon) return;

        const offset = attacker.special.summonOffset || 30;
        const sx = attacker.x + (attacker.dir * offset);
        this.game.events.emit('unit:summon', attacker.owner, 'skeleton', { x: sx, parent: attacker });
    }

    _attackLineToCastle(attacker, dmg) {
        const range = attacker.special.lineRange || attacker.range;
        const castleOwner = attacker.owner === 'player' ? 'ai' : 'player';
        const enemies = this.game.entities.findEnemy(attacker.owner).filter(o =>
            (attacker.dir === 1 && o.x >= attacker.x && o.x - attacker.x <= range) ||
            (attacker.dir === -1 && o.x <= attacker.x && attacker.x - o.x <= range)
        );
        for (const e of enemies) {
            e.damage(dmg);
            this.fx.spawnImpact(e.x, 'magic');
        }
    }

    _onKill(attacker, target) {
        const killGold = (target.constructor.cost || 0) * 0.2;
        if (killGold > 0) {
            this.game.addGold(attacker.owner, killGold);
        }
        if (attacker.owner === 'player') {
            this.game.events.emit('hero:exp', 10 + Math.floor(target.maxHp / 10));
        }
        this.game.events.emit('unit:killed', attacker, target);
    }
}
