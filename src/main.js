import * as THREE from 'three'
import { World }        from './World.js'
import { OpeningScene } from './OpeningScene.js'

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'   // NOT querySelector('canvas') — #final-fx exists too
document.body.appendChild(canvas)

const world   = new World(canvas)
const opening = new OpeningScene()
window.__world = world   // test/debug hook

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

  // Dev shortcut (?dev=...) — jump straight into the world for testing
  if (new URLSearchParams(location.search).get('dev')) {
    document.getElementById('loading-screen').style.display = 'none'
    world.start()
    world.player.locked = true
    document.dispatchEvent(new CustomEvent('game:start'))
    return
  }

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
