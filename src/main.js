import * as THREE from 'three'
import { World } from './World.js'

const canvas = document.createElement('canvas')
document.body.appendChild(canvas)

const world = new World(canvas)

// Loading progress simulation + real asset loading
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

document.addEventListener('game:start', () => {
  world.start()
})
