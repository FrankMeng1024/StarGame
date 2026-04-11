// audio.js — Web Audio API procedural sound system
// Lazy AudioContext creation (Chrome autoplay policy: requires user gesture)

let _ctx = null;
let _masterGain = null;
let _musicGain = null;
let _countdownInterval = null;

function _getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = isMuted() ? 0 : 1;
    _masterGain.connect(_ctx.destination);
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ── Mute toggle ───────────────────────────────────────────────
export function isMuted() {
  return localStorage.getItem('starcatcher_muted') === '1';
}

export function setMuted(val) {
  localStorage.setItem('starcatcher_muted', val ? '1' : '0');
  if (_masterGain) _masterGain.gain.value = val ? 0 : 1;
}

export function toggleMute() {
  setMuted(!isMuted());
  return isMuted();
}

// ── Tone helpers ──────────────────────────────────────────────
function _tone(freq, type, duration, volume, startTime) {
  const ctx = _getCtx();
  const t = startTime ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(_masterGain);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function _sweep(freqStart, freqEnd, type, duration, volume) {
  const ctx = _getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t);
  osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(_masterGain);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

// ── Sound effects ─────────────────────────────────────────────
export function playCatch() {
  _tone(880, 'sine', 0.08, 0.4);
}

export function playDebrisCatch() {
  _tone(220, 'sawtooth', 0.12, 0.3);
}

export function playLevelComplete() {
  const ctx = _getCtx();
  const t = ctx.currentTime;
  // do-mi-sol fanfare
  _tone(523, 'sine', 0.15, 0.5, t);
  _tone(659, 'sine', 0.15, 0.5, t + 0.17);
  _tone(784, 'sine', 0.25, 0.6, t + 0.34);
}

export function playTimeExt() {
  _sweep(400, 800, 'sine', 0.15, 0.35);
}

// ── Countdown warning ─────────────────────────────────────────
export function startCountdownBeeps() {
  if (_countdownInterval) return;
  _countdownInterval = setInterval(() => {
    _tone(100, 'square', 0.06, 0.25);
  }, 2000);
  _tone(100, 'square', 0.06, 0.25); // immediate first beep
}

export function stopCountdownBeeps() {
  if (_countdownInterval) {
    clearInterval(_countdownInterval);
    _countdownInterval = null;
  }
}

// ── Background music (ambient loop) ──────────────────────────
// Am-F-C-G chord progression with melody and twinkling arpeggio layers
const CHORDS = [
  [220, 261, 329, 392], // Am  (A3 C4 E4 G4)
  [174, 220, 261, 349], // F   (F3 A3 C4 F4)
  [261, 329, 392, 523], // C   (C4 E4 G4 C5)
  [196, 246, 294, 392], // G   (G3 B3 D4 G4)
];
const CHORD_DUR = 2.0; // seconds per chord
const CHORD_VOL = 0.04;

// Am pentatonic scale: A C D E G (and octave variants)
const PENTATONIC = [220, 261, 294, 329, 392, 440, 523, 587, 659, 784];
// Melody motif: E-D-C-A-C-D-E-G over 2 chord cycles (8 beats × 0.5s each)
const MELODY_MOTIF = [329, 294, 261, 220, 261, 294, 329, 392];
const MELODY_VOL  = 0.025; // softer than chords
const MELODY_DUR  = 0.45;  // slightly shorter than the beat for a staccato feel

// Twinkling: random high pentatonic notes via triangle oscillator
const TWINKLE_HIGH = [659, 784, 880, 1047, 1175]; // E5-G5-A5-C6-D6
const TWINKLE_VOL  = 0.015;
const TWINKLE_DUR  = 0.3;

function _scheduleChord(chordIdx, startTime) {
  const ctx = _getCtx();
  const freqs = CHORDS[chordIdx % CHORDS.length];
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(CHORD_VOL, startTime + 0.1);
    gain.gain.setValueAtTime(CHORD_VOL, startTime + CHORD_DUR - 0.2);
    gain.gain.linearRampToValueAtTime(0, startTime + CHORD_DUR);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(startTime);
    osc.stop(startTime + CHORD_DUR + 0.05);
  }
}

// Schedule one melody note
function _scheduleMelodyNote(noteIdx, startTime) {
  const ctx = _getCtx();
  const freq = MELODY_MOTIF[noteIdx % MELODY_MOTIF.length];
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq * 2; // one octave up from chord
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(MELODY_VOL, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + MELODY_DUR);
  osc.connect(gain);
  gain.connect(_masterGain);
  osc.start(startTime);
  osc.stop(startTime + MELODY_DUR + 0.05);
}

// Schedule random twinkle arpeggio note
function _scheduleTwinkle(startTime) {
  const ctx  = _getCtx();
  const freq = TWINKLE_HIGH[Math.floor(Math.random() * TWINKLE_HIGH.length)];
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(TWINKLE_VOL, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + TWINKLE_DUR);
  osc.connect(gain);
  gain.connect(_masterGain);
  osc.start(startTime);
  osc.stop(startTime + TWINKLE_DUR + 0.05);
}

let _musicRunning = false;
let _musicChordIdx  = 0;
let _musicBeatIdx   = 0;  // sub-beat counter within the motif (0-7)
let _musicCycleIdx  = 0;  // which 8-beat cycle we're on (for variation)
let _musicNextTime  = 0;
let _musicLoop      = null;

// Half-beat interval: each chord lasts 2s, melody has 8 notes per 2 chords = 0.5s/note
const BEAT = CHORD_DUR / 4; // 0.5s per melody note

function _musicTick() {
  if (!_musicRunning) return;
  const ctx = _getCtx();

  while (_musicNextTime < ctx.currentTime + 0.8) {
    // Schedule chord (every 4 beats = every CHORD_DUR seconds)
    if (_musicBeatIdx % 4 === 0) {
      // Subtle rhythm variation: skip chord on every 16th cycle beat-0 (slight pause feel)
      const skipChord = (_musicCycleIdx % 16 === 15 && _musicBeatIdx === 0);
      if (!skipChord) {
        _scheduleChord(_musicChordIdx, _musicNextTime);
      }
      _musicChordIdx = (_musicChordIdx + 1) % CHORDS.length;
    }

    // Schedule melody note
    _scheduleMelodyNote(_musicBeatIdx, _musicNextTime);

    // Schedule 0–2 twinkles at random offsets within this beat
    const twinkleCount = Math.random() < 0.5 ? 1 : (Math.random() < 0.4 ? 2 : 0);
    for (let i = 0; i < twinkleCount; i++) {
      const offset = Math.random() * BEAT * 0.8;
      _scheduleTwinkle(_musicNextTime + offset);
    }

    _musicBeatIdx++;
    if (_musicBeatIdx >= 8) {
      _musicBeatIdx = 0;
      _musicCycleIdx++;
    }
    _musicNextTime += BEAT;
  }

  _musicLoop = setTimeout(_musicTick, 200);
}

export function startMusic() {
  if (_musicRunning) return;
  _musicRunning = true;
  const ctx = _getCtx();
  _musicChordIdx = 0;
  _musicBeatIdx  = 0;
  _musicCycleIdx = 0;
  _musicNextTime = ctx.currentTime + 0.1;
  _musicTick();
}

export function stopMusic() {
  _musicRunning = false;
  if (_musicLoop) { clearTimeout(_musicLoop); _musicLoop = null; }
}
