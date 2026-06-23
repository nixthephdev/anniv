export class AudioManager {
  constructor() {
    this.audio = null
    this.started = false
  }

  startMusic() {
    if (this.started) return
    this.started = true
    this.audio = new Audio('/audio/music.mp3')
    this.audio.loop = true
    this.audio.volume = 0.35
    this.audio.play().catch(() => {
      // Autoplay blocked — user interaction already happened via button click, should be fine
      document.addEventListener('click', () => this.audio.play(), { once: true })
    })
  }

  stop() {
    if (this.audio) this.audio.pause()
  }

  setVolume(v) {
    if (this.audio) this.audio.volume = v
  }
}
