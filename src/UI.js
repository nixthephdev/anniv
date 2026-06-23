import { CONFIG } from './config.js'
import { AudioManager } from './AudioManager.js'

export class UI {
  constructor(audio) {
    this.audio = audio
    this._applyConfig()
    this._setupFinalScreen()
  }

  _applyConfig() {
    const titleEl = document.getElementById('start-title')
    const dateEl  = document.getElementById('start-date')
    const finalEl = document.getElementById('final-message')
    const finalSubEl = document.getElementById('final-sub')
    const hudTitle = document.getElementById('hud-title')

    if (titleEl) titleEl.textContent = `Happy Anniversary, ${CONFIG.herName}`
    if (dateEl)  dateEl.textContent  = `${CONFIG.anniversaryDate} · A World Made for You`
    if (finalEl) finalEl.textContent = CONFIG.finalTitle
    if (finalSubEl) finalSubEl.innerHTML = CONFIG.finalMessage.replace(/\n/g, '<br>')
    if (hudTitle) hudTitle.textContent = `${CONFIG.herName}'s World 🌸`
  }

  _setupFinalScreen() {
    document.getElementById('final-close')?.addEventListener('click', () => {
      document.getElementById('final-screen').classList.remove('visible')
      document.getElementById('hud').classList.add('visible')
      document.getElementById('crosshair').classList.add('visible')
      document.querySelector('canvas').requestPointerLock()
    })
  }

  startMusic() {
    this.audio.startMusic()
  }
}
