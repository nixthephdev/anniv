import * as THREE from 'three'
import { CONFIG } from './config.js'

const TRIGGER_DIST = 5
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0

/**
 * MemorySpots — glowing collectible beacons.
 *
 * Chapter 1 (walk to SM): all spots hidden and inactive.
 * Chapter 2 ('chapter2:start'): regular spots appear; collect in any order.
 * All regular spots collected → 'memories:complete' → final 💖 spot unlocks.
 * Final spot collected → popup → dismiss → 'finale:reached'.
 *
 * Events dispatched on document:
 *   'memory:collected'   detail: { spot, count, total }
 *   'memories:complete'
 *   'finale:reached'
 */
export class MemorySpots {
  constructor(scene, terrain) {
    this.scene   = scene
    this.terrain = terrain
    this.orbs    = []          // all spot groups (userData carries config)
    this.active  = false       // becomes true at chapter2:start
    this.popupOpen = false
    this._pendingFinal = false

    this._build()
    this._setupPopupDismiss()

    document.addEventListener('chapter2:start', () => this._activate())
  }

  // Paved zones (road + SM grounds) sit flat at y=0, like Player._getGroundHeight
  _groundY(x, z) {
    if (z <= -48 && z >= -115) return 0
    return this.terrain.getHeightAt(x, z)
  }

  _build() {
    CONFIG.memorySpots.forEach(spot => {
      const group = new THREE.Group()
      const gy = this._groundY(spot.position.x, spot.position.z)
      group.position.set(spot.position.x, gy, spot.position.z)
      group.userData = { ...spot, visited: false }
      group.visible = false   // hidden until chapter 2

      const accent = spot.isFinal ? 0xff4d88 : 0xff8fb8

      // Ground ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.09, 8, 40),
        new THREE.MeshBasicMaterial({ color: accent })
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.08
      group.add(ring)
      group.userData.ring = ring

      // Inner glow disc
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(1.5, 32),
        new THREE.MeshBasicMaterial({
          color: accent, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
        })
      )
      disc.rotation.x = -Math.PI / 2
      disc.position.y = 0.07
      group.add(disc)
      group.userData.disc = disc

      // Light beam (additive so it glows without a real light)
      const beamH = spot.isFinal ? 14 : 8
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.55, beamH, 10, 1, true),
        new THREE.MeshBasicMaterial({
          color: accent, transparent: true, opacity: 0.22,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
      beam.position.y = beamH / 2
      group.add(beam)
      group.userData.beam = beam

      // Floating orb
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.34, 1),
        new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: accent,
          emissiveIntensity: 1.8, roughness: 0.25,
        })
      )
      orb.position.y = 1.6
      group.add(orb)
      group.userData.orb = orb

      // Emoji icon sprite floating above
      const sprite = this._makeIconSprite(spot.icon)
      sprite.position.y = 2.6
      group.add(sprite)
      group.userData.sprite = sprite

      // The final spot gets one real light — it's the climax, worth the cost
      if (spot.isFinal) {
        const light = new THREE.PointLight(accent, 2.2, 18)
        light.position.y = 2
        group.add(light)
      }

      this.orbs.push(group)
      this.scene.add(group)
    })
  }

  _makeIconSprite(icon) {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 128
    const ctx = cv.getContext('2d')
    ctx.font = '96px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(icon, 64, 72)
    const tex = new THREE.CanvasTexture(cv)
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    )
    sprite.scale.set(1.1, 1.1, 1)
    return sprite
  }

  // ── Chapter flow ────────────────────────────────────────────────────────

  _activate() {
    this.active = true
    this.orbs.forEach(g => { if (!g.userData.isFinal) g.visible = true })
  }

  _unlockFinal() {
    const final = this.orbs.find(g => g.userData.isFinal)
    if (final) final.visible = true
    document.dispatchEvent(new CustomEvent('memories:complete'))
  }

  _regularCount() { return this.orbs.filter(g => !g.userData.isFinal).length }
  _collectedCount() {
    return this.orbs.filter(g => !g.userData.isFinal && g.userData.visited).length
  }

  /** Compass target: nearest unvisited regular spot, else the final spot. */
  getCompassTarget(playerPos) {
    if (!this.active) return null
    const unvisited = this.orbs.filter(g => !g.userData.visited && g.visible)
    if (unvisited.length === 0) return null
    let best = null, bestD = Infinity
    unvisited.forEach(g => {
      const dx = g.position.x - playerPos.x
      const dz = g.position.z - playerPos.z
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d < bestD) { bestD = d; best = g }
    })
    return { x: best.position.x, z: best.position.z, dist: bestD, spot: best.userData }
  }

  // ── Per-frame animation ────────────────────────────────────────────────

  update(elapsed, _playerPos) {
    this.orbs.forEach((g, i) => {
      if (!g.visible) return
      const d = g.userData
      if (d.visited) return
      const t = elapsed + i * 1.7
      if (d.orb) {
        d.orb.position.y = 1.6 + Math.sin(t * 1.8) * 0.22
        d.orb.rotation.y = t * 1.2
      }
      if (d.sprite) d.sprite.position.y = 2.6 + Math.sin(t * 1.8) * 0.22
      if (d.ring) {
        const s = 1 + Math.sin(t * 2.4) * 0.12
        d.ring.scale.set(s, s, 1)
      }
      if (d.disc) d.disc.material.opacity = 0.1 + (Math.sin(t * 2.4) * 0.5 + 0.5) * 0.14
      if (d.beam) d.beam.material.opacity = 0.16 + (Math.sin(t * 2) * 0.5 + 0.5) * 0.12
    })
  }

  // ── Proximity + popup ──────────────────────────────────────────────────

  checkProximity(playerPos) {
    if (!this.active || this.popupOpen) return
    this.orbs.forEach(group => {
      const d = group.userData
      if (d.visited || !group.visible) return
      const dx = group.position.x - playerPos.x
      const dz = group.position.z - playerPos.z
      if (Math.sqrt(dx * dx + dz * dz) < TRIGGER_DIST) {
        d.visited = true
        this._markCollected(group)
        this._showPopup(d)
      }
    })
  }

  _markCollected(group) {
    const d = group.userData
    // Quiet "collected" look: beam + orb + sprite gone, ring settles soft white
    if (d.beam)   d.beam.visible = false
    if (d.orb)    d.orb.visible = false
    if (d.sprite) d.sprite.visible = false
    if (d.ring) {
      d.ring.material.color.set(0xfff2f6)
      d.ring.scale.set(1, 1, 1)
    }
    if (d.disc) d.disc.material.opacity = 0.06

    if (!d.isFinal) {
      const count = this._collectedCount()
      const total = this._regularCount()
      document.dispatchEvent(new CustomEvent('memory:collected', {
        detail: { spot: d, count, total },
      }))
      if (count === total) this._unlockFinal()
    }
  }

  _showPopup(spot) {
    this.popupOpen = true
    this._pendingFinal = !!spot.isFinal
    const popup  = document.getElementById('memory-popup')
    const contEl = document.getElementById('memory-continue')
    document.getElementById('memory-icon').textContent  = spot.icon
    document.getElementById('memory-title').textContent = spot.title
    document.getElementById('memory-text').textContent  = spot.message

    // Quiz gate: she has to answer before she can continue
    this._quizDone = !spot.quiz
    if (spot.quiz) {
      this._buildQuiz(spot.quiz)
      document.getElementById('memory-quiz').style.display = 'block'
      contEl.textContent = 'sagutin mo muna 😉'
    } else {
      document.getElementById('memory-quiz').style.display = 'none'
      contEl.textContent = 'i-tap o pindutin ang E 💕'
    }

    popup.classList.add('visible')
    // Small grace period so the same movement keys / taps don't insta-dismiss
    this._popupReadyAt = performance.now() + 900

    // Desktop: free the mouse so she can click the quiz answers
    if (!IS_TOUCH && document.pointerLockElement) document.exitPointerLock()
  }

  _buildQuiz(quiz) {
    document.getElementById('quiz-q').textContent = quiz.question
    const optsEl = document.getElementById('quiz-options')
    const fbEl   = document.getElementById('quiz-feedback')
    fbEl.textContent = ''
    fbEl.className = ''
    optsEl.innerHTML = ''
    this._quizButtons = []
    quiz.options.forEach((opt, i) => {
      const btn = document.createElement('button')
      btn.className = 'quiz-opt'
      btn.textContent = opt
      btn.addEventListener('click', e => {
        e.stopPropagation()
        this._answer(i, quiz)
      })
      btn.addEventListener('touchend', e => {
        e.preventDefault()
        e.stopPropagation()
        this._answer(i, quiz)
      })
      optsEl.appendChild(btn)
      this._quizButtons.push(btn)
    })
  }

  _answer(i, quiz) {
    if (this._quizDone || !this.popupOpen) return
    const btn  = this._quizButtons[i]
    if (!btn || btn.disabled) return
    const fbEl = document.getElementById('quiz-feedback')
    const correct = quiz.correct === 'all' || i === quiz.correct

    if (correct) {
      this._quizDone = true
      btn.classList.add('right')
      fbEl.textContent = quiz.right
      fbEl.className = 'right'
      document.getElementById('memory-continue').textContent = 'i-tap o pindutin ang E 💕'
      // Don't let the answering tap also dismiss the popup
      this._popupReadyAt = performance.now() + 700
      document.dispatchEvent(new CustomEvent('quiz:correct'))
    } else {
      btn.classList.add('wrong')
      btn.disabled = true
      fbEl.textContent = quiz.wrong
      fbEl.className = 'wrong'
    }
  }

  _setupPopupDismiss() {
    const dismiss = () => {
      if (!this.popupOpen) return
      if (!this._quizDone) return
      if (performance.now() < (this._popupReadyAt || 0)) return
      this.popupOpen = false
      document.getElementById('memory-popup').classList.remove('visible')
      if (this._pendingFinal) {
        this._pendingFinal = false
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('finale:reached'))
        }, 600)
      } else if (!IS_TOUCH) {
        // Back to playing — re-capture the mouse
        document.getElementById('game-canvas')?.requestPointerLock()
      }
    }
    // Desktop: clicks land on document; E / Enter / Space too. Digits answer.
    // Mobile: canvas touches are preventDefault'ed (joystick/camera), so the
    // popup card itself is the tap target (pointer-events enabled via CSS).
    const popup = document.getElementById('memory-popup')
    popup.addEventListener('touchend', e => {
      if (e.target.closest('#memory-quiz')) return   // quiz taps handled above
      e.preventDefault()
      dismiss()
    })
    document.addEventListener('click', e => {
      if (e.target.closest('#memory-quiz')) return
      dismiss()
    })
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') dismiss()
      // 1/2/3 answer the quiz from the keyboard
      const digit = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[e.code]
      if (digit !== undefined && this.popupOpen && !this._quizDone) {
        this._quizButtons?.[digit]?.click()
      }
    })
  }
}
