// Procedural sound effects + music using Web Audio API — matches Galaga feel
// No external assets needed

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let themeInterval: ReturnType<typeof setInterval> | null = null;
let themeStep = 0;
let themePlaying = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.95;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.6;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(masterGain);
  }
  return ctx;
}

export function initAudio(): void {
  const resume = () => {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
    window.removeEventListener('keydown', resume);
    window.removeEventListener('click', resume);
  };
  window.addEventListener('keydown', resume);
  window.addEventListener('click', resume);
}

// ── Helpers ──

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  dest: AudioNode,
  freqEnd?: number,
  delay: number = 0,
): void {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t = ac.currentTime + delay;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
  }

  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + duration);
}

function noise(duration: number, volume: number, dest: AudioNode, delay: number = 0): void {
  const ac = getCtx();
  const bufferSize = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const gain = ac.createGain();
  const t = ac.currentTime + delay;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  source.connect(gain);
  gain.connect(dest);
  source.start(t);
}

// ── Sound effects (matching Galaga) ──

// Firing torpedo — short high-pitched zap
export function playShoot(): void {
  const dest = sfxGain ?? getCtx().destination;
  tone(1200, 0.06, 'square', 0.3, dest, 200);
}

// Enemy killed — descending buzz + crunch
export function playEnemyHit(): void {
  const dest = sfxGain ?? getCtx().destination;
  tone(300, 0.12, 'sawtooth', 0.35, dest, 60);
  noise(0.08, 0.25, dest, 0.03);
}

// Boss hurt — metallic clang
export function playBossHurt(): void {
  const dest = sfxGain ?? getCtx().destination;
  tone(600, 0.15, 'triangle', 0.3, dest, 300);
  tone(150, 0.1, 'square', 0.2, dest);
}

// Boss death — big explosion with descending tone
export function playBossDeath(): void {
  const dest = sfxGain ?? getCtx().destination;
  tone(400, 0.4, 'sawtooth', 0.45, dest, 30);
  noise(0.35, 0.4, dest, 0.05);
  tone(200, 0.3, 'square', 0.25, dest, 50, 0.1);
  noise(0.25, 0.3, dest, 0.15);
}

// Player death — long descending wail + explosion
export function playPlayerDeath(): void {
  const dest = sfxGain ?? getCtx().destination;
  tone(800, 0.5, 'sawtooth', 0.45, dest, 40);
  tone(600, 0.4, 'square', 0.25, dest, 30, 0.05);
  noise(0.4, 0.4, dest, 0.1);
  noise(0.3, 0.3, dest, 0.25);
}

// Enemy diving — swooping oscillation
export function playDiving(): void {
  const dest = sfxGain ?? getCtx().destination;
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t = ac.currentTime;

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.linearRampToValueAtTime(800, t + 0.15);
  osc.frequency.linearRampToValueAtTime(300, t + 0.3);

  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

  osc.connect(gain);
  gain.connect(dest as AudioNode);
  osc.start(t);
  osc.stop(t + 0.35);
}

// Level start — ascending arpeggio fanfare
export function playLevelStart(): void {
  const dest = sfxGain ?? getCtx().destination;
  const notes = [262, 330, 392, 523, 659, 784];
  notes.forEach((freq, i) => {
    tone(freq, 0.15, 'square', 0.25, dest, undefined, i * 0.08);
  });
}

// Menu select — two quick chirps
export function playMenuSelect(): void {
  const dest = sfxGain ?? getCtx().destination;
  tone(660, 0.05, 'square', 0.2, dest);
  tone(880, 0.08, 'square', 0.2, dest, undefined, 0.06);
}

// Score submit success — triumphant ascending
export function playScoreSubmit(): void {
  const dest = sfxGain ?? getCtx().destination;
  tone(523, 0.12, 'square', 0.25, dest);
  tone(659, 0.12, 'square', 0.25, dest, undefined, 0.12);
  tone(784, 0.12, 'square', 0.25, dest, undefined, 0.24);
  tone(1047, 0.25, 'triangle', 0.3, dest, undefined, 0.36);
}

// ── Theme music — looping Galaga-style melody ──

// Midnight Starship theme — minor key, spacey, 8-bit feel
const THEME_BPM = 140;
const BEAT = 60 / THEME_BPM;

// Notes in Hz (0 = rest)
const MELODY: number[] = [
  // Phrase 1 — mysterious minor intro
  330, 0, 294, 0, 262, 0, 294, 330,
  392, 0, 330, 0, 294, 0, 262, 0,
  // Phrase 2 — ascending tension
  349, 0, 392, 0, 440, 0, 392, 349,
  330, 0, 294, 0, 262, 0, 0, 0,
  // Phrase 3 — high energy
  523, 0, 494, 0, 440, 0, 392, 440,
  494, 0, 523, 0, 587, 0, 523, 0,
  // Phrase 4 — resolution
  440, 0, 392, 0, 349, 0, 330, 294,
  262, 0, 330, 0, 262, 0, 0, 0,
];

const BASS: number[] = [
  // Phrase 1
  131, 0, 0, 0, 131, 0, 0, 0,
  147, 0, 0, 0, 147, 0, 0, 0,
  // Phrase 2
  175, 0, 0, 0, 175, 0, 0, 0,
  165, 0, 0, 0, 131, 0, 0, 0,
  // Phrase 3
  220, 0, 0, 0, 220, 0, 0, 0,
  247, 0, 0, 0, 262, 0, 0, 0,
  // Phrase 4
  220, 0, 0, 0, 175, 0, 0, 0,
  131, 0, 0, 0, 131, 0, 0, 0,
];

export function startTheme(): void {
  if (themePlaying) return;
  themePlaying = true;
  themeStep = 0;

  const dest = musicGain ?? getCtx().destination;
  const stepDuration = BEAT / 2; // 16th notes

  themeInterval = setInterval(() => {
    const idx = themeStep % MELODY.length;

    // Melody voice
    const melodyNote = MELODY[idx];
    if (melodyNote > 0) {
      tone(melodyNote, stepDuration * 0.8, 'square', 0.2, dest);
    }

    // Bass voice
    const bassNote = BASS[idx];
    if (bassNote > 0) {
      tone(bassNote, stepDuration * 1.5, 'triangle', 0.25, dest);
    }

    // Hi-hat on every other step
    if (themeStep % 2 === 0) {
      noise(0.03, 0.08, dest);
    }

    // Kick on every 4th step
    if (themeStep % 4 === 0) {
      tone(60, 0.1, 'sine', 0.25, dest, 30);
    }

    themeStep++;
  }, stepDuration * 1000);
}

export function stopTheme(): void {
  if (themeInterval !== null) {
    clearInterval(themeInterval);
    themeInterval = null;
  }
  themePlaying = false;
}

export function isThemePlaying(): boolean {
  return themePlaying;
}
