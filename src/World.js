import * as THREE from 'three'
import { Terrain } from './Terrain.js'
import { Sky } from './Sky.js'
import { Player } from './Player.js'
import { MemorySpots } from './MemorySpots.js'
import { PhotoFrames } from './PhotoFrames.js'
import { Particles } from './Particles.js'
import { AudioManager } from './AudioManager.js'
import { UI } from './UI.js'

export class World {
  constructor(canvas) {
    this.canvas = canvas
    this.clock = new THREE.Clock()
    this._setupRenderer()
    this._setupScene()
    this._setupLights()
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
  }

  _setupScene() {
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x1a0030, 0.018)

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300)
    this.camera.position.set(0, 2, 5)

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  _setupLights() {
    // Ambient — soft purple/pink
    const ambient = new THREE.AmbientLight(0x3d0060, 1.2)
    this.scene.add(ambient)

    // Directional — warm golden "moon"
    const moon = new THREE.DirectionalLight(0xffd6e0, 1.8)
    moon.position.set(30, 60, -20)
    moon.castShadow = true
    moon.shadow.mapSize.set(2048, 2048)
    moon.shadow.camera.near = 0.5
    moon.shadow.camera.far = 200
    moon.shadow.camera.left = -80
    moon.shadow.camera.right = 80
    moon.shadow.camera.top = 80
    moon.shadow.camera.bottom = -80
    moon.shadow.bias = -0.0005
    this.scene.add(moon)

    // Hemisphere — sky/ground color bounce
    const hemi = new THREE.HemisphereLight(0x6a0070, 0x220030, 0.6)
    this.scene.add(hemi)

    // Warm fill from below
    const fill = new THREE.PointLight(0xff4080, 0.8, 60)
    fill.position.set(0, 1, 0)
    this.scene.add(fill)
  }

  async init() {
    this.terrain = new Terrain(this.scene)
    this.sky = new Sky(this.scene)
    this.particles = new Particles(this.scene)
    this.memorySpots = new MemorySpots(this.scene)
    this.photoFrames = new PhotoFrames(this.scene)
    this.audio = new AudioManager()
    this.ui = new UI(this.audio)
    this.player = new Player(this.camera, this.scene, this.terrain, this.ui, this.memorySpots)

    // Small artificial delay so loading bar looks intentional
    await new Promise(r => setTimeout(r, 600))
  }

  start() {
    this.clock.start()
    this._loop()
  }

  _loop() {
    requestAnimationFrame(() => this._loop())
    const delta = Math.min(this.clock.getDelta(), 0.05)
    const elapsed = this.clock.getElapsedTime()

    this.player.update(delta)
    this.particles.update(elapsed)
    this.memorySpots.update(elapsed, this.player.getPosition())
    this.photoFrames.update(elapsed)
    this.sky.update(elapsed)

    this.renderer.render(this.scene, this.camera)
  }
}
