let audioCtx;

function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function play(freq = 440, durationMs = 120, type = 'sine', volume = 0.05) {
    try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = volume;
        osc.connect(gain).connect(ctx.destination);
        const now = ctx.currentTime;
        osc.start(now);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
        osc.stop(now + durationMs / 1000);
    } catch (_) { }
}

export class SFXPlugin {
    constructor(name = 'sfx') {
        this.name = name;
        this.enabled = true;
        this.volume = 0.5;
    }

    init(game) {
        this.game = game;
        document.addEventListener('click', () => {
            try { getCtx().resume(); } catch (_) { }
        }, { once: true });

        game.events.on('combat:hit', () => { if (this.enabled) play(180, 100, 'square', 0.06 * this.volume * 2); });
        game.events.on('combat:crit', () => { if (this.enabled) play(280, 140, 'triangle', 0.07 * this.volume * 2); });
        game.events.on('game:start', () => { if (this.enabled) play(240, 120, 'sine', 0.04 * this.volume * 2); });
        game.events.on('unit:killed', (attacker) => {
            if (this.enabled && attacker.defName === 'mage') play(520, 180, 'sine', 0.05 * this.volume * 2);
            else if (this.enabled && attacker.defName === 'archer') play(360, 80, 'sawtooth', 0.04 * this.volume * 2);
        });
        game.events.on('game:end', (winner) => {
            if (this.enabled) {
                if (winner === 'player') play(660, 400, 'triangle', 0.06 * this.volume * 2);
                else play(160, 400, 'square', 0.06 * this.volume * 2);
            }
        });
    }

    toggle() {
        this.enabled = !this.enabled;
    }
}
