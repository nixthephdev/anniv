import * as THREE from 'three'
import { World }        from './World.js'
import { OpeningScene } from './OpeningScene.js'

const canvas = document.createElement('canvas')
document.body.appendChild(canvas)

const world   = new World(canvas)
const opening = new OpeningScene()

// ── Loading progress ────────────────────────────────────────────────────
const bar = document.getElementById('loading-bar')
let progress = 0
const tick = setInterval(() => {
  progress = Math.min(progress + Math.random() * 12, 90)
  bar.style.width = progress + '%'
}, 120)

world.init().then(() => {
  clearInterval(tick)
  bar.style.width = '100%'
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('fade-out')
    setTimeout(() => {
      document.getElementById('loading-screen').style.display = 'none'
      document.getElementById('start-screen').classList.add('visible')
    }, 1000)
  }, 400)
})

// ── Start button → Opening scene → Game ────────────────────────────────
document.getElementById('start-btn').addEventListener('click', async () => {
  document.getElementById('start-screen').classList.remove('visible')
  const choice = await opening.play()
  world.start()
  document.dispatchEvent(new CustomEvent('game:start', { detail: { choice } }))
})

// ── Skip button → bypass intro, go straight to world (dev) ──────────────
document.getElementById('skip-btn').addEventListener('click', () => {
  document.getElementById('start-screen').classList.remove('visible')
  world.start()
  document.dispatchEvent(new CustomEvent('game:start'))
})
