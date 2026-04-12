// audio.js — Web Audio API procedural sound system
// Lazy AudioContext creation (Chrome autoplay policy: requires user gesture)

let _ctx = null;
let _masterGain = null;
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

// ── Background music (ambient drone pad) ─────────────────────
// CR-054: Single coherent ethereal ambient track — drone pad + sparse high arpeggios.
// No chord+melody dual-layer that caused "two merged tracks" feel.
// Architecture: slow-attack drone root (A3+A4 detuned) + LFO filter sweep + sparse high arpeggio notes.

const DRONE_NOTES  = [220, 440.8]; // A3 + A4 slightly detuned (+0.8 Hz) for subtle beating shimmer
const DRONE_VOL    = 0.028;        // quiet drone pad volume
const ARPEGGIO_SCALE = [440, 494, 554, 659, 740, 880, 988]; // A pentatonic + passing tones (A4-A5)
const ARPEGGIO_VOL = 0.012;        // sparse arpeggio very soft
const ARPEGGIO_SUSTAIN = 1.4;      // each note sustains gently

let _musicRunning = false;
let _droneOscs    = [];            // persistent drone oscillators
let _droneGain    = null;          // drone gain node
let _filterNode   = null;          // shared LPF for drone
let _filterLfoDir = 1;             // LFO sweep direction
let _filterFreq   = 500;           // current filter frequency
let _arpeggioLoop = null;          // arpeggio scheduling interval
let _arpeggioPhase = 0;            // arpeggio note index (cycles through scale)

function _startDrone() {
  const ctx = _getCtx();
  _droneGain = ctx.createGain();
  _droneGain.gain.setValueAtTime(0, ctx.currentTime);
  _droneGain.gain.linearRampToValueAtTime(DRONE_VOL, ctx.currentTime + 3.5); // slow fade-in

  _filterNode = ctx.createBiquadFilter();
  _filterNode.type = 'lowpass';
  _filterNode.frequency.value = _filterFreq;
  _filterNode.Q.value = 1.2;

  _droneGain.connect(_filterNode);
  _filterNode.connect(_masterGain);

  for (const baseFreq of DRONE_NOTES) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq;
    osc.connect(_droneGain);
    osc.start();
    _droneOscs.push(osc);
  }

  // Soft sub-drone: triangle wave one octave below, very quiet
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'triangle';
  subOsc.frequency.value = 110; // A2
  subGain.gain.value = 0.008;
  subOsc.connect(subGain);
  subGain.connect(_droneGain); // route through _droneGain so it fades on stopMusic()
  subOsc.start();
  _droneOscs.push(subOsc);
}

function _stopDrone() {
  const ctx = _ctx;
  if (!ctx) return;
  if (_droneGain) {
    _droneGain.gain.setValueAtTime(_droneGain.gain.value, ctx.currentTime);
    _droneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
  }
  setTimeout(() => {
    for (const osc of _droneOscs) { try { osc.stop(); } catch (_) {} }
    _droneOscs = [];
    _droneGain = null;
    _filterNode = null;
  }, 1100);
}

function _tickFilter() {
  if (!_musicRunning || !_filterNode) return;
  // Slowly sweep filter frequency: 400→1200→400 Hz, step every 250ms
  _filterFreq += _filterLfoDir * 4;
  if (_filterFreq >= 1200) { _filterFreq = 1200; _filterLfoDir = -1; }
  if (_filterFreq <= 400)  { _filterFreq = 400;  _filterLfoDir = 1; }
  _filterNode.frequency.setTargetAtTime(_filterFreq, _ctx.currentTime, 0.3);
}

function _scheduleArpeggioNote() {
  if (!_musicRunning) return;
  // Only fire with ~40% probability each interval to keep sparse
  if (Math.random() > 0.4) return;

  const ctx = _getCtx();
  const freq = ARPEGGIO_SCALE[_arpeggioPhase % ARPEGGIO_SCALE.length];
  _arpeggioPhase++;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;

  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(ARPEGGIO_VOL, t + 0.12); // gentle attack
  gain.gain.setValueAtTime(ARPEGGIO_VOL, t + ARPEGGIO_SUSTAIN * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ARPEGGIO_SUSTAIN);

  osc.connect(gain);
  gain.connect(_masterGain);
  osc.start(t);
  osc.stop(t + ARPEGGIO_SUSTAIN + 0.1);
}

let _filterTick = null;

export function startMusic() {
  if (_musicRunning) return;
  _musicRunning = true;
  _filterFreq  = 500;
  _filterLfoDir = 1;
  _arpeggioPhase = 0;
  _startDrone();
  // Filter LFO: tick every 250ms
  _filterTick = setInterval(_tickFilter, 250);
  // Sparse arpeggio: fire every 1.8s (with 40% probability = ~0.8 notes/s on avg)
  _arpeggioLoop = setInterval(_scheduleArpeggioNote, 1800);
}

export function stopMusic() {
  _musicRunning = false;
  if (_filterTick)   { clearInterval(_filterTick);   _filterTick   = null; }
  if (_arpeggioLoop) { clearInterval(_arpeggioLoop); _arpeggioLoop = null; }
  _stopDrone();
}
