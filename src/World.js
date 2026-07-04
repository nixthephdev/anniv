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

// ── Story panels ──────────────────────────────────────────────────────────

const PANELS_CHASE_INTRO = [
  { icon: '😱', name: 'You', text: 'HUY!! Bubbles just grabbed your phone and BOLTED!!' },
  { icon: '🐕', name: 'Bubbles', text: '"WOOF." (Translation: habulin mo muna ako, Ate. 😤)' },
  { icon: '🏃', name: 'Tip', text: 'Hold SHIFT (or the RUN button) to sprint — she\'s fast!' },
]

const PANELS_CHASE_DONE = [
  { icon: '🎉', name: 'You', text: 'GOTCHA!! Phone rescued. Bubbles shows absolutely zero remorse.' },
  { icon: '🐕', name: 'Bubbles', text: 'wag wag wag (she is very proud of herself)' },
  { icon: '💚', name: 'Him', text: 'New message: "Punta ka sa SM Legazpi 😊 may sasabihin ako sa\'yo." — Follow the compass!' },
]

const PANELS_SM_ARRIVAL = [
  { icon: '💭', name: '...', text: "The entrance of SM Legazpi comes into view. Your heart beats a little faster — you know he's here somewhere." },
  { icon: '💚', name: 'Him', text: '"Hey!! Over here!!" He pops up near the entrance, waving both arms with that big goofy smile you love.' },
  { icon: '😱', name: 'You', text: "Before you can even reach him — someone grabs him from behind, laughing, and drags him straight inside the mall!" },
  { icon: '🏃', name: 'You', text: '"Wait for me!!" You break into a run, pushing past the crowd, following him inside...' },
]

const PANELS_CHAPTER2 = [
  { icon: '💚', name: 'Him', text: '"HAHA gotcha!! You should\'ve seen your face 😆"' },
  { icon: '💖', name: 'Him', text: '"Listen... before anything else — I hid our favorite memories all over this world. Every glowing light out there is one of them."' },
  { icon: '✨', name: 'Him', text: '"Find them all, Moncakesss. I\'ll be waiting where they end. 💖"' },
]

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

    this._setupQuestHUD()
    this._setupChapterFlow()
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

  // ── Quest HUD ───────────────────────────────────────────────────────────

  _setupQuestHUD() {
    this._questHUD   = document.getElementById('quest-hud')
    this._questLabel = document.getElementById('quest-label')
    this._questName  = document.getElementById('quest-name')
    this._questDist  = document.getElementById('quest-dist')
    this._arrowWrap  = document.getElementById('quest-arrow-wrap')
    this._arrowSVG   = document.getElementById('quest-arrow-svg')
    this._arrowLabel = document.getElementById('quest-arrow-label')
    this._chapter    = -1   // -1 = story/idle, 0 = chase, 1 = find SM, 2 = memories

    document.addEventListener('game:start', () => {
      // Dev shortcuts (?dev=...) set up their own chapter state
      if (new URLSearchParams(location.search).get('dev')) return
      this._startChase()
    })

    document.addEventListener('quiz:correct', () => this.audio.playChime())

    document.addEventListener('memory:collected', e => {
      const { count, total } = e.detail
      this._questLabel.textContent = `💖 Memories · ${count}/${total}`
      this.audio.playChime()
    })

    document.addEventListener('memories:complete', () => {
      this._questLabel.textContent = '💖 Final Memory'
      this._questName.textContent  = 'Someone is waiting for you…'
      this.audio.playChime()
    })

    document.addEventListener('finale:reached', () => {
      this._chapter = 3   // done — compass off
      this._questHUD.classList.remove('visible')
      this._arrowWrap.classList.remove('visible')
    })
  }

  // ── Chapter flow: chase → SM arrival → transition → Chapter 2 ──────────

  _setupChapterFlow() {
    document.addEventListener('quest:sm_reached', () => {
      this._questHUD.classList.remove('visible')
      this._arrowWrap.classList.remove('visible')
      this._showStoryPanels(PANELS_SM_ARRIVAL, () => this._playSMTransition())
    })
  }

  _startChase() {
    this.dog.mode = 'flee'
    this._showStoryPanels(PANELS_CHASE_INTRO, () => {
      this._chapter = 0
      this._questLabel.textContent = '🐕 First Mission'
      this._questName.textContent  = 'Catch Bubbles!!'
      this._arrowLabel.textContent = '🐕'
      this._questHUD.classList.add('visible')
      this._arrowWrap.classList.add('visible')
    })
  }

  _onDogCaught() {
    this._chapter = -1
    this.dog.mode = 'follow'
    this.audio.playChime()
    this._questHUD.classList.remove('visible')
    this._arrowWrap.classList.remove('visible')
    this._showStoryPanels(PANELS_CHASE_DONE, () => this._startChapter1())
  }

  _startChapter1() {
    this._chapter = 1
    this._questLabel.textContent = '⭐ Quest'
    this._questName.textContent  = 'Find SM Legazpi'
    this._arrowLabel.textContent = 'SM'
    this._questHUD.classList.add('visible')
    this._arrowWrap.classList.add('visible')
  }

  _playSMTransition() {
    const el = document.getElementById('world-transition')
    el.classList.add('visible')
    requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.add('faded'))
    )

    // Hold the SM screen for a beat, fade it out, then open Chapter 2
    setTimeout(() => {
      el.classList.remove('faded')      // opacity → 0 (0.9s CSS transition)
      setTimeout(() => {
        el.classList.remove('visible')  // display: none
        this._showStoryPanels(PANELS_CHAPTER2, () => this._startChapter2())
      }, 950)
    }, 2600)
  }

  _startChapter2() {
    this._chapter = 2
    this._questLabel.textContent = '💖 Memories · 0/5'
    this._questName.textContent  = 'Relive our memories'
    this._arrowLabel.textContent = '💖'
    this._questHUD.classList.add('visible')
    this._arrowWrap.classList.add('visible')
    document.dispatchEvent(new CustomEvent('chapter2:start'))
  }

  /** Generic visual-novel dialogue sequence over the sm-story overlay. */
  _showStoryPanels(panels, onDone) {
    const overlay = document.getElementById('sm-story-overlay')
    const iconEl  = document.getElementById('sm-story-icon')
    const nameEl  = document.getElementById('sm-story-name')
    const textEl  = document.getElementById('sm-story-text')
    const dotsEl  = document.getElementById('sm-story-dots')

    dotsEl.innerHTML = panels.map((_, i) => `<div class="sm-sdot" data-i="${i}"></div>`).join('')
    const dotEls = dotsEl.querySelectorAll('.sm-sdot')

    let idx = 0
    let transitioning = false

    const refreshDots = () => {
      dotEls.forEach((d, i) => {
        d.className = 'sm-sdot' + (i < idx ? ' done' : i === idx ? ' active' : '')
      })
    }

    const showPanel = () => {
      iconEl.textContent = panels[idx].icon
      nameEl.textContent = panels[idx].name
      textEl.textContent = panels[idx].text
      textEl.style.opacity = '1'
      refreshDots()
    }

    const advance = () => {
      if (transitioning) return
      transitioning = true

      idx++
      if (idx >= panels.length) {
        overlay.classList.remove('dimmed')
        overlay.removeEventListener('click', advance)
        setTimeout(() => {
          overlay.classList.remove('visible')
          if (onDone) onDone()
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

  // ── Compass ─────────────────────────────────────────────────────────────

  _updateQuestCompass(playerPos, cameraYaw) {
    let tx, tz
    if (this._chapter === 0) {
      tx = this.dog.pos.x
      tz = this.dog.pos.z
    } else if (this._chapter === 1) {
      tx = SM_POSITION.x
      tz = SM_POSITION.z
    } else if (this._chapter === 2) {
      const target = this.memorySpots.getCompassTarget(playerPos)
      if (!target) return
      tx = target.x
      tz = target.z
    } else {
      return
    }

    const dx   = tx - playerPos.x
    const dz   = tz - playerPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    this._questDist.textContent = `${Math.round(dist)} m away`

    // World-space angle to target, minus camera yaw so the arrow is
    // relative to where she's facing (0° = forward)
    const worldAngle = Math.atan2(dx, -dz)
    const relAngle   = worldAngle - cameraYaw
    const deg        = relAngle * (180 / Math.PI)

    this._arrowSVG.style.transform = `rotate(${deg}deg)`
  }

  start() {
    this.clock.start()
    this._applyDevShortcuts()
    this._loop()
  }

  // Hidden testing shortcuts: ?dev=sm | ?dev=ch2 | ?dev=quiz | ?dev=final | ?dev=end
  _applyDevShortcuts() {
    const dev = new URLSearchParams(location.search).get('dev')
    if (!dev) return
    const tp = (x, z) => {
      this.player.pos.set(x, 0.5, z)
      this.player._physCollider?.setTranslation({ x, y: 2, z })
    }
    if (dev === 'sm') {
      this._startChapter1()
      tp(0, -70)
    }
    if (dev === 'ch2') {
      this.smBuilding.arrived = true
      this._startChapter2()
      tp(0, -70)
    }
    if (dev === 'quiz') {
      this.smBuilding.arrived = true
      this._startChapter2()
      tp(8, -78)   // right beside the first memory orb
    }
    if (dev === 'final') {
      this.smBuilding.arrived = true
      this._startChapter2()
      this.memorySpots.orbs.forEach(g => {
        if (!g.userData.isFinal) {
          g.userData.visited = true
          this.memorySpots._markCollected(g)
        }
      })
      tp(0, -29)
    }
    if (dev === 'end') {
      setTimeout(() => document.dispatchEvent(new CustomEvent('finale:reached')), 1500)
    }
  }

  _loop() {
    requestAnimationFrame(() => this._loop())
    const delta   = Math.min(this.clock.getDelta(), 0.05)
    const elapsed = this.clock.getElapsedTime()

    this.player.update(delta)
    this.dog.update(delta, this.player.getPosition())

    // Chase mission: caught Bubbles?
    if (this._chapter === 0) {
      const p = this.player.getPosition()
      const dx = this.dog.pos.x - p.x
      const dz = this.dog.pos.z - p.z
      if (dx * dx + dz * dz < 1.9 * 1.9) this._onDogCaught()
    }
    this.terrain.update(elapsed)
    this.particles.update(elapsed)
    this.memorySpots.update(elapsed, this.player.getPosition())
    this.photoFrames.update(elapsed)
    this.sky.update(elapsed)
    this.smBuilding.update(elapsed, this.player.getPosition())
    this.cars.update(delta)
    this.boyfriendNPC.update(delta, this.player.getPosition())
    this._updateQuestCompass(this.player.getPosition(), this.player.cameraYaw)

    if (this.physics?.world) this.physics.step()

    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }
}
