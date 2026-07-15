import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js'
import { OutlinePass }    from 'three/addons/postprocessing/OutlinePass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass }     from 'three/addons/postprocessing/OutputPass.js'
import { Terrain }      from './Terrain.js'
import { Sky }          from './Sky.js'
import { Player, isMobile } from './Player.js'
import { Dog }          from './Dog.js'
import { MemorySpots }  from './MemorySpots.js'
import { PhotoFrames }  from './PhotoFrames.js'
import { Particles }    from './Particles.js'
import { AudioManager } from './AudioManager.js'
import { UI }           from './UI.js'
import { SMBuilding }    from './SMBuilding.js'
import { Terminal }   from './Terminal.js'
import { Roads }          from './Roads.js'
import { Cars }           from './Cars.js'
import { Physics }        from './Physics.js'
import { BoyfriendNPC }  from './BoyfriendNPC.js'
import { Houses }        from './Houses.js'
import { Plaza }          from './Plaza.js'
import { CityBuildings } from './CityBuildings.js'

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
      ? Math.min(window.devicePixelRatio, 1.25)
      : Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    // Shadows double every draw call (extra depth pass) — desktop only.
    // The toon art style holds up fine without them on phones.
    this.renderer.shadowMap.enabled = !isMobile
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      // composer resize is handled in _setupPostProcessing
    })
  }

  _setupScene() {
    this.scene = new THREE.Scene()
    // Soft sky-blue fog — denser on mobile so the shorter draw distance
    // fades out gracefully instead of popping
    this.scene.fog = new THREE.FogExp2(0xb8d8f5, isMobile ? 0.009 : 0.0055)

    const far = isMobile ? 170 : 280
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, far)
    this.camera.position.set(0, 5, 15)
  }

  _setupLights() {
    // Bright directional sun — toon needs strong directionality for clean shadow steps
    const sun = new THREE.DirectionalLight(0xfff5d0, 3.2)
    this._sunOffset = new THREE.Vector3(60, 100, -130)   // fixed offset, recentred on player each frame
    sun.position.copy(this._sunOffset)
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
    // Target must be in the scene graph for its world matrix (and therefore
    // the shadow frustum) to update when we move it every frame below.
    this.scene.add(sun.target)
    this.sun = sun

    // Cool fill from behind — gives the anime rim-light look
    const fill = new THREE.DirectionalLight(0x9ec8f5, 0.7)
    fill.position.set(-40, 30, 80)
    this.scene.add(fill)

    // Hemisphere — saturated sky blue → warm golden ground
    const hemi = new THREE.HemisphereLight(0x6ab4f5, 0x7ab84a, 1.4)
    this.scene.add(hemi)

    // Ambient: keep shadows from going pitch black
    const ambient = new THREE.AmbientLight(0xfff0d8, 0.55)
    this.scene.add(ambient)
  }

  _setupPostProcessing() {
    // Mobile: skip the composer entirely — it renders to an offscreen target
    // and copies to screen, a full extra fullscreen pass phones can't afford
    if (isMobile) {
      this.composer = null
      return
    }

    const size = new THREE.Vector2(window.innerWidth, window.innerHeight)
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    // Outline pass — black cel-shading outline on player + dog
    if (!isMobile) {
      this.outlinePass = new OutlinePass(size, this.scene, this.camera)
      this.outlinePass.edgeStrength  = 4.5
      this.outlinePass.edgeGlow      = 0
      this.outlinePass.edgeThickness = 1.2
      this.outlinePass.visibleEdgeColor.set('#1a1a2e')
      this.outlinePass.hiddenEdgeColor.set('#1a1a2e')
      const outlined = []
      this.player.charGroup.traverse(c => { if (c.isMesh) outlined.push(c) })
      this.dog.group.traverse(c => { if (c.isMesh) outlined.push(c) })
      this.outlinePass.selectedObjects = outlined
      this.composer.addPass(this.outlinePass)

      // Subtle bloom — just enough to give the world a soft anime glow
      const bloom = new UnrealBloomPass(size, 0.22, 0.5, 0.88)
      this.composer.addPass(bloom)
    }

    this.composer.addPass(new OutputPass())

    window.addEventListener('resize', () => {
      this.composer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  async init() {
    this.terrain     = new Terrain(this.scene)
    this.sky         = new Sky(this.scene)
    this.particles   = new Particles(this.scene)
    this.memorySpots = new MemorySpots(this.scene, this.terrain)
    this.photoFrames = new PhotoFrames(this.scene, this.terrain)
    this.smBuilding  = new SMBuilding(this.scene)
    this.terminal    = new Terminal(this.scene)
    this.roads       = new Roads(this.scene)
    this.audio       = new AudioManager()
    this.ui          = new UI(this.audio)
    this.player      = new Player(this.camera, this.scene, this.terrain, this.ui, this.memorySpots)
    this.dog         = new Dog(this.scene, this.terrain)
    this.cars        = new Cars(this.scene)
    this.boyfriendNPC = new BoyfriendNPC(this.scene, this.terrain)
    this.houses       = new Houses(this.scene)
    this.plaza        = new Plaza(this.scene)
    this.cityBuildings = new CityBuildings(this.scene)

    this._setupAudioFeedback()
    this._setupPostProcessing()

    // Physics — async WASM init; player falls back to terrain-height until ready
    this.physics = new Physics()
    this.physics.init(this.terrain).then(() => {
      // Ensure player is above terrain before creating the physics capsule,
      // so it never spawns inside the heightfield and falls through
      const groundY = this.terrain.getHeightAt(this.player.pos.x, this.player.pos.z)
      if (this.player.pos.y < groundY + 0.5) this.player.pos.y = groundY + 0.5
      this.player.initPhysics(this.physics)
    })

    await new Promise(r => setTimeout(r, 600))
  }

  // ── Audio feedback for memory spots ─────────────────────────────────────

  _setupAudioFeedback() {
    document.addEventListener('quiz:correct', () => this.audio.playChime())
    document.addEventListener('memory:collected', () => this.audio.playChime())
  }

  // Recentre the sun's shadow frustum on the player each frame — the frustum
  // itself stays a fixed ±110 box (cheap, unchanged shadow-map resolution),
  // it just follows the player around the now much bigger world instead of
  // being pinned to the origin, so distant zones still get dynamic shadows.
  _updateSunFollow(playerPos) {
    this.sun.position.set(
      playerPos.x + this._sunOffset.x,
      this._sunOffset.y,
      playerPos.z + this._sunOffset.z
    )
    this.sun.target.position.set(playerPos.x, 0, playerPos.z)
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
    this._updateSunFollow(this.player.getPosition())
    this.dog.update(delta, this.player.getPosition())
    this.terrain.update(elapsed)
    this.particles.update(elapsed)
    this.memorySpots.update(elapsed, this.player.getPosition())
    this.photoFrames.update(elapsed)
    this.sky.update(elapsed, this.player.getPosition())
    this.smBuilding.update(elapsed, this.player.getPosition())
    this.cars.update(delta)
    this.boyfriendNPC.update(delta, this.player.getPosition())

    if (this.physics?.world) this.physics.step()

    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }
}
