// Minimal web audio sound effects without external assets
let audioCtx;
let audioContextUnlocked = false;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function unlockAudioContext() {
  if (audioContextUnlocked) return Promise.resolve();

  const ctx = getCtx();
  return ctx.resume().then(() => {
    audioContextUnlocked = true;
  });
}

// Add this event listener to unlock audio on first user interaction
document.addEventListener('click', function unlockAudio() {
  unlockAudioContext().then(() => {
    document.removeEventListener('click', unlockAudio);
  });
}, { once: true });

function play(freq = 440, durationMs = 120, type = 'sine', volume = 0.05) {
  // Respect user gesture requirement: if not unlocked, skip playing
  if (!audioCtx && !(window.AudioContext || window.webkitAudioContext)) return;
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      unlockAudioContext().then(() => play(freq, durationMs, type, volume));
      return;
    }

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
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

window.sfx = {
  hit() { play(180, 100, 'square', 0.06); },
  crit() { play(280, 140, 'triangle', 0.07); },
  magic() { play(520, 180, 'sine', 0.05); },
  arrow() { play(360, 80, 'sawtooth', 0.04); },
  spawn() { play(240, 120, 'sine', 0.04); },
  victory() { play(660, 400, 'triangle', 0.06); },
  defeat() { play(160, 400, 'square', 0.06); }
};
