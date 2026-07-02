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
import { SMBuilding, SM_POSITION } from './SMBuilding.js'
import { Terminal }   from './Terminal.js'
import { Roads }          from './Roads.js'
import { Cars }           from './Cars.js'
import { Physics }        from './Physics.js'
import { BoyfriendNPC }  from './BoyfriendNPC.js'

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
      // composer resize is handled in _setupPostProcessing
    })
  }

  _setupScene() {
    this.scene = new THREE.Scene()
    // Soft sky-blue fog — toon palette
    this.scene.fog = new THREE.FogExp2(0xb8d8f5, 0.0055)

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 280)
    this.camera.position.set(0, 5, 15)
  }

  _setupLights() {
    // Bright directional sun — toon needs strong directionality for clean shadow steps
    const sun = new THREE.DirectionalLight(0xfff5d0, 3.2)
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
    this.memorySpots = new MemorySpots(this.scene)
    this.photoFrames = new PhotoFrames(this.scene)
    this.smBuilding  = new SMBuilding(this.scene)
    this.terminal    = new Terminal(this.scene)
    this.roads       = new Roads(this.scene)
    this.audio       = new AudioManager()
    this.ui          = new UI(this.audio)
    this.player      = new Player(this.camera, this.scene, this.terrain, this.ui, this.memorySpots)
    this.dog         = new Dog(this.scene, this.terrain)
    this.cars        = new Cars(this.scene)
    this.boyfriendNPC = new BoyfriendNPC(this.scene, this.terrain)

    this._setupQuestHUD()
    this._setupSMTransition()
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

  _setupQuestHUD() {
    this._questHUD   = document.getElementById('quest-hud')
    this._questDist  = document.getElementById('quest-dist')
    this._arrowWrap  = document.getElementById('quest-arrow-wrap')
    this._arrowSVG   = document.getElementById('quest-arrow-svg')
    this._questDone  = false

    document.addEventListener('game:start', () => {
      this._questHUD.classList.add('visible')
      this._arrowWrap.classList.add('visible')
    })
  }

  _setupSMTransition() {
    document.addEventListener('quest:sm_reached', () => {
      this._questDone = true
      this._questHUD.classList.remove('visible')
      this._arrowWrap.classList.remove('visible')
      this._showSMStory()
    })
  }

  _showSMStory() {
    const PANELS = [
      { icon: '💭', name: '...', text: "The entrance of SM Legazpi comes into view. Your heart beats a little faster — you know he's here somewhere." },
      { icon: '💚', name: 'Him', text: '"Hey!! Over here!!" He pops up near the entrance, waving both arms with that big goofy smile you love.' },
      { icon: '😱', name: 'You', text: "Before you can even reach him — someone grabs him from behind, laughing, and drags him straight inside the mall!" },
      { icon: '🏃', name: 'You', text: '"Wait for me!!" You break into a run, pushing past the crowd, following him inside...' },
    ]

    const overlay = document.getElementById('sm-story-overlay')
    const iconEl  = document.getElementById('sm-story-icon')
    const nameEl  = document.getElementById('sm-story-name')
    const textEl  = document.getElementById('sm-story-text')
    const dotsEl  = document.getElementById('sm-story-dots')

    dotsEl.innerHTML = PANELS.map((_, i) => `<div class="sm-sdot" data-i="${i}"></div>`).join('')
    const dotEls = dotsEl.querySelectorAll('.sm-sdot')

    let idx = 0
    let transitioning = false

    const refreshDots = () => {
      dotEls.forEach((d, i) => {
        d.className = 'sm-sdot' + (i < idx ? ' done' : i === idx ? ' active' : '')
      })
    }

    const showPanel = () => {
      iconEl.textContent = PANELS[idx].icon
      nameEl.textContent = PANELS[idx].name
      textEl.textContent = PANELS[idx].text
      textEl.style.opacity = '1'
      refreshDots()
    }

    const advance = () => {
      if (transitioning) return
      transitioning = true

      idx++
      if (idx >= PANELS.length) {
        overlay.classList.remove('dimmed')
        overlay.removeEventListener('click', advance)
        setTimeout(() => {
          overlay.classList.remove('visible')
          this._showSMTransition()
        }, 500)
        return
      }

      textEl.style.opacity = '0'
      setTimeout(() => {
        showPanel()
        transitioning = false
      }, 180)
    }

    overlay.addEventListener('click', advance)
    overlay.classList.add('visible')
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add('dimmed')
      showPanel()
    }))
  }

  _showSMTransition() {
    const el = document.getElementById('world-transition')
    el.classList.add('visible')
    requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.add('faded'))
    )
  }

  _updateQuestCompass(playerPos, cameraYaw) {
    if (this._questDone) return

    const dx   = SM_POSITION.x - playerPos.x
    const dz   = SM_POSITION.z - playerPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    // Distance label
    this._questDist.textContent = dist > 1000
      ? `${(dist / 1000).toFixed(1)} km`
      : `${Math.round(dist)} m away`

    // World-space angle to SM, then subtract player's camera yaw so arrow
    // is relative to where she's facing (0° = forward)
    const worldAngle  = Math.atan2(dx, -dz)          // angle in world XZ
    const relAngle    = worldAngle - cameraYaw        // relative to camera
    const deg         = relAngle * (180 / Math.PI)

    this._arrowSVG.style.transform = `rotate(${deg}deg)`
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
    this.smBuilding.update(elapsed, this.player.getPosition())
    this.cars.update(delta)
    this._updateQuestCompass(this.player.getPosition(), this.player.cameraYaw)

    if (this.physics?.world) this.physics.step()

    this.composer.render()
  }
}
