/**
 * AudioManager — full WebAudio soundtrack, no files required.
 *
 * Music: if  public/audio/music.mp3  exists it is used (drop in "your song").
 * Otherwise a soft generative music-box piece plays — warm chords, gentle
 * melody, quiet enough to sit under the world (~background level).
 *
 * SFX (always synthesized): playChime() on memory collect,
 * playFireworkBurst() during the finale.
 */

const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12)

// Cmaj7 → Am7 → Fmaj7 → G — warm, hopeful, loops forever
const PROGRESSION = [
  { bass: 48, pad: [60, 64, 67, 71], pool: [72, 76, 79, 83, 84, 88] },   // Cmaj7
  { bass: 45, pad: [57, 60, 64, 67], pool: [72, 76, 79, 81, 84, 88] },   // Am7
  { bass: 41, pad: [53, 57, 60, 65], pool: [72, 77, 81, 84, 86, 89] },   // Fmaj7
  { bass: 43, pad: [55, 59, 62, 67], pool: [74, 78, 79, 83, 86, 90] },   // G
]

const BAR_SECONDS = 3.4          // ~70 bpm, 4 beats per chord
const LOOKAHEAD_MS = 200

export class AudioManager {
  constructor() {
    this.audio    = null    // <audio> element when music.mp3 exists
    this.started  = false
    this.ctx      = null
    this._nextBarTime = 0
    this._barIndex    = 0
    this._schedTimer  = null
  }

  // ── Bootstrapping ───────────────────────────────────────────────────────

  _ensureCtx() {
    if (this.ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    this.ctx = new AC()

    // Master + music bus
    this.master = this.ctx.createGain()
    this.master.gain.value = 1
    this.master.connect(this.ctx.destination)

    this.musicBus = this.ctx.createGain()
    this.musicBus.gain.value = 0.16
    this.musicBus.connect(this.master)

    this.sfxBus = this.ctx.createGain()
    this.sfxBus.gain.value = 0.5
    this.sfxBus.connect(this.master)

    // Simple generated-impulse reverb, shared by music + chimes
    this.reverb = this.ctx.createConvolver()
    this.reverb.buffer = this._makeImpulse(2.4, 2.6)
    this.reverbGain = this.ctx.createGain()
    this.reverbGain.gain.value = 0.5
    this.reverb.connect(this.reverbGain)
    this.reverbGain.connect(this.master)
  }

  _makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate
    const len  = Math.floor(rate * seconds)
    const buf  = this.ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
      }
    }
    return buf
  }

  // ── Music ───────────────────────────────────────────────────────────────

  startMusic() {
    if (this.started) return
    this.started = true

    // Prefer a real song if one was dropped into public/audio/
    let resolved = false
    const src = `${import.meta.env.BASE_URL}audio/music.mp3`
    const probe = new Audio(src)
    probe.loop = true
    probe.volume = 0.35
    probe.addEventListener('canplaythrough', () => {
      if (resolved) return
      resolved = true
      this.audio = probe
      probe.play().catch(() => {
        document.addEventListener('click', () => probe.play(), { once: true })
      })
    }, { once: true })
    probe.addEventListener('error', () => {
      if (resolved) return
      resolved = true
      this._startGenerative()
    }, { once: true })
    probe.load()
    // Safety net: if neither event fires (odd server responses), don't stay silent
    setTimeout(() => {
      if (!resolved) { resolved = true; this._startGenerative() }
    }, 4000)
  }

  _startGenerative() {
    this._ensureCtx()
    if (this.ctx.state === 'suspended') this.ctx.resume()

    this._nextBarTime = this.ctx.currentTime + 0.1
    this._barIndex    = 0
    this._schedTimer  = setInterval(() => this._scheduleAhead(), LOOKAHEAD_MS / 2)
  }

  _scheduleAhead() {
    while (this._nextBarTime < this.ctx.currentTime + LOOKAHEAD_MS / 1000 + 0.3) {
      this._scheduleBar(this._nextBarTime, PROGRESSION[this._barIndex % PROGRESSION.length])
      this._nextBarTime += BAR_SECONDS
      this._barIndex++
    }
  }

  _scheduleBar(t, chord) {
    // Soft pad — two low chord tones, slow swell
    for (const m of [chord.pad[0], chord.pad[2]]) {
      this._padNote(midiToFreq(m), t, BAR_SECONDS * 1.05, 0.05)
    }
    // Bass — one warm note per bar
    this._padNote(midiToFreq(chord.bass), t, BAR_SECONDS, 0.07, 'sine')

    // Music-box melody — 3–5 gentle notes from the chord pool
    const count = 3 + Math.floor(Math.random() * 3)
    const slots = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].sort(() => Math.random() - 0.5).slice(0, count)
    for (const beat of slots) {
      const m = chord.pool[Math.floor(Math.random() * chord.pool.length)]
      this._boxNote(midiToFreq(m), t + beat * (BAR_SECONDS / 4), 0.035 + Math.random() * 0.02)
    }
  }

  /** Music-box pluck: sine + bell partials, fast attack, long ring. */
  _boxNote(freq, t, vol) {
    const ctx = this.ctx
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1)
    g.connect(this.musicBus)
    g.connect(this.reverb)

    const partials = [[1, 1], [3.98, 0.28], [6.7, 0.08]]
    for (const [ratio, amt] of partials) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * ratio
      const og = ctx.createGain()
      og.gain.value = amt
      o.connect(og); og.connect(g)
      o.start(t); o.stop(t + 2.2)
    }
  }

  /** Pad/bass: soft triangle swell. */
  _padNote(freq, t, dur, vol, type = 'triangle') {
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(this.musicBus); g.connect(this.reverb)
    o.start(t); o.stop(t + dur + 0.1)
  }

  // ── SFX ─────────────────────────────────────────────────────────────────

  /** Sweet ascending sparkle — memory collected. */
  playChime() {
    this._ensureCtx()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    const t = this.ctx.currentTime + 0.02
    const notes = [88, 91, 96]   // E6 G6 C7
    notes.forEach((m, i) => {
      this._chimeNote(midiToFreq(m), t + i * 0.11, 0.16)
    })
  }

  _chimeNote(freq, t, vol) {
    const ctx = this.ctx
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
    g.connect(this.sfxBus)
    g.connect(this.reverb)
    for (const [ratio, amt] of [[1, 1], [4.2, 0.2]]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * ratio
      const og = ctx.createGain()
      og.gain.value = amt
      o.connect(og); og.connect(g)
      o.start(t); o.stop(t + 1.5)
    }
  }

  /** One distant firework: soft boom + crackle. Call repeatedly for a show. */
  playFireworkBurst() {
    this._ensureCtx()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    const ctx = this.ctx
    const t = ctx.currentTime + 0.02

    // Boom — filtered noise with falling pitch feel
    const boomDur = 0.9
    const noise = ctx.createBufferSource()
    noise.buffer = this._noiseBuffer(boomDur)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(420, t)
    lp.frequency.exponentialRampToValueAtTime(60, t + boomDur)
    const bg = ctx.createGain()
    bg.gain.setValueAtTime(0.0001, t)
    bg.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
    bg.gain.exponentialRampToValueAtTime(0.0001, t + boomDur)
    noise.connect(lp); lp.connect(bg); bg.connect(this.sfxBus); bg.connect(this.reverb)
    noise.start(t); noise.stop(t + boomDur)

    // Crackle — a few short bright ticks after the boom
    for (let i = 0; i < 6; i++) {
      const ct = t + 0.15 + Math.random() * 0.6
      const c = ctx.createBufferSource()
      c.buffer = this._noiseBuffer(0.05)
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 2500
      const cg = ctx.createGain()
      cg.gain.setValueAtTime(0.06, ct)
      cg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.05)
      c.connect(hp); hp.connect(cg); cg.connect(this.sfxBus)
      c.start(ct); c.stop(ct + 0.06)
    }
  }

  _noiseBuffer(seconds) {
    const rate = this.ctx.sampleRate
    const len = Math.floor(rate * seconds)
    const buf = this.ctx.createBuffer(1, len, rate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  // ── Controls ────────────────────────────────────────────────────────────

  /** Slightly lift the music for the finale. */
  finaleSwell() {
    if (this.audio) {
      this.audio.volume = Math.min(0.5, this.audio.volume + 0.12)
    } else if (this.musicBus) {
      const t = this.ctx.currentTime
      this.musicBus.gain.linearRampToValueAtTime(0.24, t + 2)
    }
  }

  stop() {
    if (this.audio) this.audio.pause()
    if (this._schedTimer) clearInterval(this._schedTimer)
  }

  setVolume(v) {
    if (this.audio) this.audio.volume = v
    if (this.musicBus) this.musicBus.gain.value = v * 0.45
  }
}
