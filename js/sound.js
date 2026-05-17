// Synthesized sound effects via Web Audio API. Zero asset files.
let ctx = null;
let muted = false;

function init() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (_) {
    ctx = null;
  }
  return ctx;
}

// Browsers require user gesture to start audio. Call this once on first click.
export function unlockAudio() {
  const c = init();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(m) { muted = !!m; }
export function isMuted() { return muted; }
export function toggleMuted() { muted = !muted; return muted; }

function note({ freq, type = 'square', dur = 0.1, vol = 0.12, attack = 0.005, freqEnd = null, delay = 0 }) {
  const c = init();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) {
    osc.frequency.linearRampToValueAtTime(freqEnd, t0 + dur);
  }
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur, vol = 0.1, delay = 0) {
  const c = init();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.value = vol;
  source.connect(gain).connect(c.destination);
  source.start(t0);
}

// === Public sounds ===

export function soundChestOpen() {
  note({ freq: 180, type: 'sawtooth', dur: 0.08, vol: 0.1 });
  note({ freq: 360, type: 'square', dur: 0.08, vol: 0.12, delay: 0.06 });
  note({ freq: 540, type: 'square', dur: 0.1, vol: 0.1, delay: 0.12 });
}

const DROP_PRESETS = {
  common:    [{ freq: 330, dur: 0.08 }],
  magic:     [{ freq: 440, dur: 0.1 }, { freq: 587, dur: 0.1, delay: 0.06 }],
  rare:      [{ freq: 523, dur: 0.1 }, { freq: 659, dur: 0.1, delay: 0.06 }, { freq: 784, dur: 0.16, delay: 0.12 }],
  epic:      [{ freq: 392, dur: 0.08 }, { freq: 523, dur: 0.08, delay: 0.06 }, { freq: 659, dur: 0.08, delay: 0.12 }, { freq: 880, dur: 0.18, delay: 0.18 }],
  legendary: [
    { freq: 523, dur: 0.08 },
    { freq: 659, dur: 0.08, delay: 0.06 },
    { freq: 784, dur: 0.08, delay: 0.12 },
    { freq: 1047, dur: 0.08, delay: 0.18 },
    { freq: 1319, dur: 0.3, delay: 0.24, freqEnd: 1568 },
  ],
  ancestral: [
    { freq: 130, type: 'sawtooth', dur: 0.35, vol: 0.18, freqEnd: 65 },
    { freq: 523, dur: 0.1, delay: 0.15 },
    { freq: 659, dur: 0.1, delay: 0.23 },
    { freq: 880, dur: 0.1, delay: 0.31 },
    { freq: 1319, dur: 0.5, delay: 0.39, freqEnd: 1760, vol: 0.15 },
  ],
};

export function soundDrop(rarity) {
  const preset = DROP_PRESETS[rarity] || DROP_PRESETS.common;
  for (const n of preset) note({ type: 'square', vol: 0.12, ...n });
}

export function soundCoin() {
  note({ freq: 988, type: 'square', dur: 0.05, vol: 0.1 });
  note({ freq: 1480, type: 'square', dur: 0.08, vol: 0.1, delay: 0.04 });
}

export function soundHit() {
  noise(0.05, 0.18);
  note({ freq: 200, type: 'sawtooth', dur: 0.06, vol: 0.1, freqEnd: 80 });
}

export function soundCrit() {
  noise(0.07, 0.2);
  note({ freq: 300, type: 'sawtooth', dur: 0.08, vol: 0.15, freqEnd: 100 });
  note({ freq: 700, type: 'square', dur: 0.1, vol: 0.12, delay: 0.04 });
}

export function soundWin() {
  note({ freq: 523, dur: 0.1, vol: 0.12 });
  note({ freq: 659, dur: 0.1, vol: 0.12, delay: 0.08 });
  note({ freq: 784, dur: 0.2, vol: 0.12, delay: 0.16 });
}

export function soundLose() {
  note({ freq: 392, type: 'sawtooth', dur: 0.25, vol: 0.15, freqEnd: 165 });
}

export function soundAchievement() {
  note({ freq: 880, dur: 0.1, vol: 0.12 });
  note({ freq: 1047, dur: 0.1, vol: 0.12, delay: 0.08 });
  note({ freq: 1319, dur: 0.1, vol: 0.12, delay: 0.16 });
  note({ freq: 1568, dur: 0.3, vol: 0.13, delay: 0.24 });
}

export function soundUpgrade() {
  note({ freq: 440, dur: 0.06, vol: 0.12 });
  note({ freq: 587, dur: 0.06, vol: 0.12, delay: 0.05 });
  note({ freq: 880, dur: 0.16, vol: 0.12, delay: 0.1, freqEnd: 1175 });
}

export function soundClick() {
  note({ freq: 800, type: 'square', dur: 0.025, vol: 0.06 });
}

export function soundForge() {
  noise(0.06, 0.12);
  note({ freq: 220, type: 'square', dur: 0.05, vol: 0.1 });
  noise(0.06, 0.12, 0.1);
  note({ freq: 330, type: 'square', dur: 0.05, vol: 0.1, delay: 0.1 });
  note({ freq: 660, type: 'square', dur: 0.1, vol: 0.1, delay: 0.18 });
}

export function soundAscension() {
  // Dramatic ascending arpeggio
  const notes = [261, 329, 392, 523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => {
    note({ freq, dur: 0.12, vol: 0.13, delay: i * 0.08 });
  });
  note({ freq: 1568, dur: 0.6, vol: 0.15, delay: 0.7, freqEnd: 2093 });
}
