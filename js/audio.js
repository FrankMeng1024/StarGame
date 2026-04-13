// audio.js — Web Audio API procedural sound system
// Lazy AudioContext creation (Chrome autoplay policy: requires user gesture)
// CR-058: Reverted to original chord-progression music (pre-Sprint 17)
// CR-093: Background music replaced with MP3 file (04-impact-moderato.mp3)

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
  if (_bgAudio) _bgAudio.muted = val;
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

// ── Background music (MP3 file loop) ─────────────────────────
// CR-093: Use 04-impact-moderato.mp3 as looping background music
const BG_MUSIC_SRC = 'audio-samples/04-impact-moderato.mp3';
const BG_MUSIC_VOLUME = 0.18;

let _bgAudio = null;

function _ensureBgAudio() {
  if (_bgAudio) return _bgAudio;
  _bgAudio = new Audio(BG_MUSIC_SRC);
  _bgAudio.loop = true;
  _bgAudio.volume = BG_MUSIC_VOLUME;
  _bgAudio.muted = isMuted();
  return _bgAudio;
}

export function startMusic() {
  const audio = _ensureBgAudio();
  if (!audio.paused) return;
  audio.currentTime = 0;
  audio.play().catch(() => {}); // autoplay policy: silently ignore if blocked
}

export function stopMusic() {
  if (!_bgAudio) return;
  _bgAudio.pause();
  _bgAudio.currentTime = 0;
}

/**
 * Set music playback tempo factor (countdown urgency effect).
 * factor=1.0 = normal speed, factor=1.35 = 35% faster.
 */
export function setMusicTempo(factor) {
  if (_bgAudio) _bgAudio.playbackRate = Math.max(0.1, factor);
}
