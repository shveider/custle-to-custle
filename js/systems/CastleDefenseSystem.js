"use strict";
import { GameEvents } from '../core/Events.js';

const GROUND_Y = 380; // Match CanvasRenderer.GROUND_Y

export class CastleDefenseSystem {
    constructor(game, fxSystem) {
        this.game = game;
        this.fx = fxSystem;
    }

    update(gameTimeMs) {
        for (const castle of this.game.entities.castles) {
            if (!castle.isAlive) continue;
            if (!castle.canAttack(gameTimeMs)) continue;

            const enemy = this.game.entities.nearestEnemyToCastle(castle, castle.defenseRange);
            if (!enemy) continue;

            castle.markAttacked(gameTimeMs);

            const dist = Math.abs(enemy.x - castle.x);
            const dir = castle.owner === 'player' ? 1 : -1;
            // Castle projectiles spawn from castle height (assume castle center at GROUND_Y - 40)
            const castleY = GROUND_Y - 40;
            this.fx.spawnProjectile(castle.defenseProjectileKind, castle.x, castleY, dir, Math.max(60, dist));

            enemy.damage(castle.defenseDamage);
            this.fx.spawnImpact(enemy.x, 'lightning');
            this.fx.spawnDamageNumber(enemy.x, castle.defenseDamage, false);

            this.game.events.emit(GameEvents.CASTLE_DEFENSE, castle, enemy);

            if (!enemy.isAlive) {
                this._onKill(castle, enemy);
            }
        }
    }

    _onKill(castle, target) {
        const killGold = (target.constructor.cost || 0) * 0.2;
        if (killGold > 0) {
            this.game.addGold(castle.owner, killGold);
        }
        this.game.events.emit(GameEvents.UNIT_KILLED, castle, target);
    }
}
