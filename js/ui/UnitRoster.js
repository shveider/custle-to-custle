export class UnitRoster {
    constructor(game, assetRegistry) {
        this.game = game;
        this._assetRegistry = assetRegistry;
        this._playerEl = document.getElementById('roster-player');
        this._aiEl = document.getElementById('roster-ai');
    }

    update() {
        const counts = { player: {}, ai: {} };
        for (const u of this.game.entities.units) {
            if (u.curHp > 0) {
                counts[u.owner][u.defName] = (counts[u.owner][u.defName] || 0) + 1;
            }
        }

        this._render(this._playerEl, counts.player, 'player');
        this._render(this._aiEl, counts.ai, 'ai');
    }

    _render(container, counts, owner) {
        if (!container) return;
        const keys = Object.keys(counts);
        if (keys.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<span class="roster-label">' + (owner === 'player' ? 'Your army' : 'Enemy') + '</span>';
        keys.sort((a, b) => counts[b] - counts[a]);
        for (const type of keys) {
            const icon = this._assetRegistry.getIcon(type);
            const displayName = this._assetRegistry.getDisplayName(type);
            html += '<div class="roster-unit" title="' + displayName + '"><span class="roster-unit-icon">' + icon + '</span><span class="roster-unit-count">' + counts[type] + '</span></div>';
        }
        container.innerHTML = html;
    }
}
