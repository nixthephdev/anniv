import * as THREE from 'three'
import { Terrain }      from './Terrain.js'
import { Sky }          from './Sky.js'
import { Player }       from './Player.js'
import { Dog }          from './Dog.js'
import { MemorySpots }  from './MemorySpots.js'
import { PhotoFrames }  from './PhotoFrames.js'
import { Particles }    from './Particles.js'
import { AudioManager } from './AudioManager.js'
import { UI }           from './UI.js'

export class World {
  constructor(canvas) {
    this.canvas = canvas
    this.clock  = new THREE.Clock()
    this._setupRenderer()
    this._setupScene()
    this._setupLights()
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  _setupScene() {
    this.scene  = new THREE.Scene()
    // Morning: light blue-white fog for depth
    this.scene.fog = new THREE.FogExp2(0xc8e6f5, 0.009)

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 280)
    this.camera.position.set(0, 5, 15)
  }

  _setupLights() {
    // Bright morning sun (directional)
    const sun = new THREE.DirectionalLight(0xfff8e1, 2.2)
    sun.position.set(80, 120, -160)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near   = 0.5
    sun.shadow.camera.far    = 250
    sun.shadow.camera.left   = -100
    sun.shadow.camera.right  =  100
    sun.shadow.camera.top    =  100
    sun.shadow.camera.bottom = -100
    sun.shadow.bias          = -0.0004
    this.scene.add(sun)

    // Hemisphere light — sky blue top, green ground bounce
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4caf50, 1.0)
    this.scene.add(hemi)

    // Soft ambient fill so shadows aren't too dark
    const ambient = new THREE.AmbientLight(0xffe0b2, 0.6)
    this.scene.add(ambient)
  }

  async init() {
    this.terrain     = new Terrain(this.scene)
    this.sky         = new Sky(this.scene)
    this.particles   = new Particles(this.scene)
    this.memorySpots = new MemorySpots(this.scene)
    this.photoFrames = new PhotoFrames(this.scene)
    this.audio       = new AudioManager()
    this.ui          = new UI(this.audio)
    this.player      = new Player(this.camera, this.scene, this.terrain, this.ui, this.memorySpots)
    this.dog         = new Dog(this.scene, this.terrain)

    await new Promise(r => setTimeout(r, 600))
  }

  start() {
    this.clock.start()
    this._loop()
  }

  _loop() {
    requestAnimationFrame(() => this._loop())
    const delta   = Math.min(this.clock.getDelta(), 0.05)
    const elapsed = this.clock.getElapsedTime()

    this.player.update(delta)
    this.dog.update(delta, this.player.getPosition())
    this.particles.update(elapsed)
    this.memorySpots.update(elapsed, this.player.getPosition())
    this.photoFrames.update(elapsed)
    this.sky.update(elapsed)

    this.renderer.render(this.scene, this.camera)
  }
}
