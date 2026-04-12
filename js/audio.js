// audio.js — Web Audio API procedural sound system
// Lazy AudioContext creation (Chrome autoplay policy: requires user gesture)
// CR-058: Reverted to original chord-progression music (pre-Sprint 17)

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

// Constellation reveal: ascending pentatonic tone for each edge lit
// idx = 0-based edge index, total = total number of edges
export function playRevealNote(idx, total) {
  // C major pentatonic ascending: C4 D4 E4 G4 A4 C5 D5 E5 G5 A5
  const PENTA = [261, 294, 330, 392, 440, 523, 587, 659, 784, 880];
  const noteIdx = Math.round((idx / Math.max(total - 1, 1)) * (PENTA.length - 1));
  const freq = PENTA[Math.min(noteIdx, PENTA.length - 1)];
  _tone(freq, 'sine', 0.25, 0.35);
  // Small harmonic shimmer (5th above)
  _tone(freq * 1.5, 'triangle', 0.15, 0.18);
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
// CR-059: Reverted to Sprint 5 original — pure Am-F-C-G sine chord loop
// Simple 4-note chord progression at low volume, no melody/arpeggio layers
const CHORDS = [
  [220, 261, 329, 392], // Am  (A3 C4 E4 G4)
  [174, 220, 261, 349], // F   (F3 A3 C4 F4)
  [261, 329, 392, 523], // C   (C4 E4 G4 C5)
  [196, 246, 294, 392], // G   (G3 B3 D4 G4)
];
const CHORD_DUR = 2.0; // seconds per chord
const CHORD_VOL = 0.04;

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

let _musicRunning = false;
let _musicChordIdx = 0;
let _musicNextTime = 0;
let _musicLoop     = null;

function _musicTick() {
  if (!_musicRunning) return;
  const ctx = _getCtx();
  while (_musicNextTime < ctx.currentTime + 0.5) {
    _scheduleChord(_musicChordIdx, _musicNextTime);
    _musicChordIdx = (_musicChordIdx + 1) % CHORDS.length;
    _musicNextTime += CHORD_DUR;
  }
  _musicLoop = setTimeout(_musicTick, 200);
}

export function startMusic() {
  if (_musicRunning) return;
  _musicRunning = true;
  const ctx = _getCtx();
  _musicChordIdx = 0;
  _musicNextTime = ctx.currentTime + 0.1;
  _musicTick();
}

export function stopMusic() {
  _musicRunning = false;
  if (_musicLoop) { clearTimeout(_musicLoop); _musicLoop = null; }
}
