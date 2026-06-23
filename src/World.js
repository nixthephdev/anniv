import * as THREE from 'three'
import { Terrain }      from './Terrain.js'
import { Sky }          from './Sky.js'
import { Player, isMobile } from './Player.js'
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
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !isMobile,   // antialias costs on mobile
    })
    this.renderer.setPixelRatio(isMobile
      ? Math.min(window.devicePixelRatio, 1.5)
      : Math.min(window.devicePixelRatio, 2))
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
    // Soft atmospheric haze — slightly warm to match morning sun
    this.scene.fog = new THREE.FogExp2(0xd4eaf5, 0.007)

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 280)
    this.camera.position.set(0, 5, 15)
  }

  _setupLights() {
    // Primary sun — warm golden morning angle
    const sun = new THREE.DirectionalLight(0xfff3cd, 2.6)
    sun.position.set(60, 100, -130)
    sun.castShadow = true
    sun.shadow.mapSize.set(isMobile ? 512 : 2048, isMobile ? 512 : 2048)
    sun.shadow.camera.near   = 1
    sun.shadow.camera.far    = 280
    sun.shadow.camera.left   = -110
    sun.shadow.camera.right  =  110
    sun.shadow.camera.top    =  110
    sun.shadow.camera.bottom = -110
    sun.shadow.bias          = -0.0003
    sun.shadow.normalBias    = 0.02
    this.scene.add(sun)

    // Soft opposing fill — stops shadows going pure black
    const fill = new THREE.DirectionalLight(0xc8e6f8, 0.55)
    fill.position.set(-40, 30, 80)
    this.scene.add(fill)

    // Hemisphere — rich sky blue → warm green ground bounce
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x5d9e3c, 1.1)
    this.scene.add(hemi)

    // Ambient: very light warm fill so nothing is pitch dark
    const ambient = new THREE.AmbientLight(0xfff8e8, 0.45)
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
    this.terrain.update(elapsed)
    this.particles.update(elapsed)
    this.memorySpots.update(elapsed, this.player.getPosition())
    this.photoFrames.update(elapsed)
    this.sky.update(elapsed)

    this.renderer.render(this.scene, this.camera)
  }
}
