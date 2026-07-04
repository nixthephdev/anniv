import { CONFIG } from './config.js'

export class UI {
  constructor(audio) {
    this.audio = audio
    this._fxRunning = false
    this._applyConfig()
    this._setupFinalScreen()

    document.addEventListener('finale:reached', () => this._showFinale())
  }

  _applyConfig() {
    const titleEl = document.getElementById('start-title')
    const dateEl  = document.getElementById('start-date')
    const finalEl = document.getElementById('final-message')
    const finalSubEl = document.getElementById('final-sub')
    const hudTitle = document.getElementById('hud-title')

    if (titleEl) titleEl.textContent = `Happy Anniversary, ${CONFIG.herName}`
    if (dateEl)  dateEl.textContent  = `${CONFIG.anniversaryDate} · Mundong Ginawa Para Sa'yo`
    if (finalEl) finalEl.textContent = CONFIG.finalTitle
    if (finalSubEl) finalSubEl.innerHTML = CONFIG.finalMessage.replace(/\n/g, '<br>')
    if (hudTitle) hudTitle.textContent = `Mundo ni ${CONFIG.herName} 🌸`
  }

  // ── Finale ──────────────────────────────────────────────────────────────

  _showFinale() {
    document.getElementById('final-screen').classList.add('visible')
    document.getElementById('hud').classList.remove('visible')
    document.getElementById('crosshair')?.classList.remove('visible')
    if (document.pointerLockElement) document.exitPointerLock()

    this.audio.finaleSwell()
    this._startFX()

    // Firework bursts at loose random intervals while the screen is up
    const burst = () => {
      if (!this._fxRunning) return
      this.audio.playFireworkBurst()
      setTimeout(burst, 900 + Math.random() * 1600)
    }
    setTimeout(burst, 400)
  }

  _setupFinalScreen() {
    document.getElementById('final-close')?.addEventListener('click', () => {
      document.getElementById('final-screen').classList.remove('visible')
      document.getElementById('hud').classList.add('visible')
      this._stopFX()
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      if (!isTouch) document.getElementById('game-canvas')?.requestPointerLock()
    })
  }

  // ── Fireworks + falling petals on the final screen ─────────────────────

  _startFX() {
    if (this._fxRunning) return
    this._fxRunning = true

    const cv = document.getElementById('final-fx')
    const ctx = cv.getContext('2d')
    const fit = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight }
    fit()
    this._fxResize = fit
    window.addEventListener('resize', fit)

    const petals = []
    for (let i = 0; i < 26; i++) {
      petals.push({
        x: Math.random() * 1.2 - 0.1,        // fraction of width
        y: Math.random(),                     // fraction of height
        size: 5 + Math.random() * 7,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.6 + Math.random() * 0.9,
        fall: 0.018 + Math.random() * 0.03,   // fraction of height per second
        spin: Math.random() * Math.PI,
        hue: 330 + Math.random() * 20,
      })
    }

    const sparks = []   // firework particles
    let nextBurst = 0.5
    let elapsed = 0
    let last = performance.now()

    const spawnBurst = () => {
      const bx = (0.15 + Math.random() * 0.7) * cv.width
      const by = (0.12 + Math.random() * 0.4) * cv.height
      const hue = [340, 320, 45, 200, 0][Math.floor(Math.random() * 5)]
      const n = 42
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.2
        const sp = (0.25 + Math.random() * 0.55) * Math.min(cv.width, cv.height) * 0.45
        sparks.push({
          x: bx, y: by,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 1.1 + Math.random() * 0.5, age: 0,
          hue: hue + Math.random() * 25,
        })
      }
    }

    const tick = now => {
      if (!this._fxRunning) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      elapsed += dt

      ctx.clearRect(0, 0, cv.width, cv.height)

      // Fireworks
      if (elapsed > nextBurst) {
        spawnBurst()
        nextBurst = elapsed + 0.9 + Math.random() * 1.4
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.age += dt
        if (s.age >= s.life) { sparks.splice(i, 1); continue }
        s.vy += cv.height * 0.22 * dt          // gravity
        s.vx *= 0.985
        s.x += s.vx * dt
        s.y += s.vy * dt
        const f = 1 - s.age / s.life
        ctx.globalAlpha = f
        ctx.fillStyle = `hsl(${s.hue} 90% ${55 + f * 25}%)`
        ctx.beginPath()
        ctx.arc(s.x, s.y, 1.4 + f * 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Petals
      for (const p of petals) {
        p.y += p.fall * dt
        p.sway += p.swaySpeed * dt
        p.spin += dt * 0.8
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random() * 1.2 - 0.1 }
        const px = (p.x + Math.sin(p.sway) * 0.02) * cv.width
        const py = p.y * cv.height
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(Math.sin(p.spin) * 0.8)
        ctx.fillStyle = `hsla(${p.hue} 80% 78% / 0.85)`
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  _stopFX() {
    this._fxRunning = false
    if (this._fxResize) window.removeEventListener('resize', this._fxResize)
    const cv = document.getElementById('final-fx')
    cv?.getContext('2d')?.clearRect(0, 0, cv.width, cv.height)
  }

  startMusic() {
    this.audio.startMusic()
  }
}
