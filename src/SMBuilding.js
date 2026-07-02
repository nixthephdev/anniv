import * as THREE from 'three'

// SM City Legazpi — positioned north of the main road
// Player approaches from the south (from the park) across the road
export const SM_POSITION = new THREE.Vector3(0, 0, -92)
export const TRIGGER_RADIUS = 14

export class SMBuilding {
  constructor(scene) {
    this.scene   = scene
    this.arrived = false

    this._buildStructure()
    this._buildFacade()
    this._buildEntrance()
    this._buildSurroundings()
    this._buildQuestMarker()
    this._buildPortal()
  }

  // ── Main building volumes ────────────────────────────────────────────────

  _buildStructure() {
    const x = SM_POSITION.x
    const z = SM_POSITION.z

    // Grey concrete base / lower body
    const concMat = new THREE.MeshStandardMaterial({ color: 0xd0d0cc, roughness: 0.88, metalness: 0.03 })

    // Main body (wide, multi-story mall)
    const main = new THREE.Mesh(new THREE.BoxGeometry(60, 14, 22), concMat)
    main.position.set(x, 7, z)
    main.castShadow = main.receiveShadow = true
    this.scene.add(main)

    // Upper section (slightly narrower, more floors)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(56, 6, 20), concMat)
    upper.position.set(x, 17, z)
    upper.castShadow = upper.receiveShadow = true
    this.scene.add(upper)

    // Blue facade panel (upper front — matches the real photo)
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1a5fb4, roughness: 0.65, metalness: 0.08 })

    // Large blue panel covering the front upper face
    const bluePanel = new THREE.Mesh(new THREE.BoxGeometry(60, 15, 0.5), blueMat)
    bluePanel.position.set(x, 11.5, z + 11.26)
    this.scene.add(bluePanel)

    // Upper blue panel
    const blueUpper = new THREE.Mesh(new THREE.BoxGeometry(56, 7, 0.5), blueMat)
    blueUpper.position.set(x, 17, z + 10.26)
    this.scene.add(blueUpper)

    // Roof parapet
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xbcbcb8, roughness: 0.85, metalness: 0.05 })
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(62, 1.2, 22), roofMat)
    parapet.position.set(x, 20.6, z)
    this.scene.add(parapet)

    // Side wing extensions (malls usually have wings)
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 20), concMat)
      wing.position.set(x + side * 37, 4.5, z)
      wing.castShadow = wing.receiveShadow = true
      this.scene.add(wing)
    }
  }

  // ── Front facade: SM City Legazpi sign ──────────────────────────────────

  _buildFacade() {
    const x = SM_POSITION.x
    const z = SM_POSITION.z

    // Big canvas texture: SM circle logo + CITY LEGAZPI text
    const facadeTex = this._makeFacadeTexture()
    const facadeMat = new THREE.MeshStandardMaterial({
      map: facadeTex,
      roughness: 0.4, metalness: 0.1,
      emissive: new THREE.Color(0x0a1f55),
      emissiveIntensity: 0.12,
    })

    // Large sign board on the front blue panel
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), facadeMat)
    sign.position.set(x, 12, z + 11.8)
    this.scene.add(sign)

    // Billboard accent lights (wash the sign from below)
    const signLight1 = new THREE.SpotLight(0xffffff, 1.8, 30, Math.PI / 7, 0.35)
    signLight1.position.set(x - 8, 4, z + 16)
    signLight1.target.position.set(x - 8, 14, z + 12)
    this.scene.add(signLight1)
    this.scene.add(signLight1.target)

    const signLight2 = new THREE.SpotLight(0xffffff, 1.8, 30, Math.PI / 7, 0.35)
    signLight2.position.set(x + 8, 4, z + 16)
    signLight2.target.position.set(x + 8, 14, z + 12)
    this.scene.add(signLight2)
    this.scene.add(signLight2.target)
  }

  _makeFacadeTexture() {
    const W = 780, H = 560
    const cv  = document.createElement('canvas')
    cv.width  = W; cv.height = H
    const ctx = cv.getContext('2d')

    // Blue background (SM City Legazpi signature blue)
    ctx.fillStyle = '#1565c0'
    ctx.fillRect(0, 0, W, H)

    // Subtle top-to-bottom gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, 'rgba(30,80,200,0.0)')
    grad.addColorStop(1, 'rgba(0,20,80,0.35)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // ── SM Circle Logo ──────────────────────────────────────────────────
    const cx = W * 0.5, cy = H * 0.42
    const R  = H * 0.30   // outer circle radius

    // Drop shadow behind circle
    ctx.shadowColor   = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur    = 28
    ctx.shadowOffsetY = 6

    // Outer navy ring
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = '#0d2d6e'
    ctx.fill()
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

    // White inner circle
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2)
    ctx.fillStyle = '#f5f5f5'
    ctx.fill()

    // Thin inner navy border
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2)
    ctx.strokeStyle = '#0d2d6e'
    ctx.lineWidth   = R * 0.045
    ctx.stroke()

    // "SM" bold text in navy
    ctx.fillStyle    = '#0d2d6e'
    ctx.font         = `900 ${R * 1.08}px 'Arial Black', Arial, sans-serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SM', cx, cy + R * 0.02)

    // ── CITY LEGAZPI text ───────────────────────────────────────────────
    ctx.shadowColor   = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur    = 10
    ctx.shadowOffsetY = 3

    // "CITY"
    ctx.fillStyle    = '#ffffff'
    ctx.font         = `900 ${H * 0.115}px 'Arial Black', Arial, sans-serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.letterSpacing = '0.06em'
    ctx.fillText('CITY', cx, cy + R + H * 0.105)

    // "LEGAZPI"
    ctx.font      = `900 ${H * 0.096}px 'Arial Black', Arial, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.fillText('LEGAZPI', cx, cy + R + H * 0.21)

    ctx.shadowBlur = 0

    return new THREE.CanvasTexture(cv)
  }

  // ── Ground-floor entrance ────────────────────────────────────────────────

  _buildEntrance() {
    const x = SM_POSITION.x
    const z = SM_POSITION.z

    // Grey concrete entrance zone ground
    const entMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.88 })
    const entGround = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), entMat)
    entGround.rotation.x = -Math.PI / 2
    entGround.position.set(x, 0.07, z + 15)
    entGround.receiveShadow = true
    this.scene.add(entGround)

    // Wide entrance canopy
    const canopyMat  = new THREE.MeshStandardMaterial({ color: 0x1a5fb4, roughness: 0.65 })
    const canopy     = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 5), canopyMat)
    canopy.position.set(x, 4.8, z + 13.5)
    canopy.castShadow = true
    this.scene.add(canopy)

    // Canopy support columns
    const colMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.55, metalness: 0.2 })
    const colGeo = new THREE.CylinderGeometry(0.28, 0.32, 4.8, 8)
    for (const cx2 of [-9, -4.5, 0, 4.5, 9]) {
      const col = new THREE.Mesh(colGeo, colMat)
      col.position.set(x + cx2, 2.4, z + 15.9)
      col.castShadow = true
      this.scene.add(col)
    }

    // Glass doors (wide entrance)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88bbdd, roughness: 0.05, metalness: 0.1,
      transparent: true, opacity: 0.42,
    })
    const doors = new THREE.Mesh(new THREE.BoxGeometry(18, 3.6, 0.12), glassMat)
    doors.position.set(x, 1.8, z + 11.15)
    this.scene.add(doors)

    // Glass window strip above doors
    const winStrip = new THREE.Mesh(new THREE.BoxGeometry(18, 1.4, 0.12), glassMat)
    winStrip.position.set(x, 4.4, z + 11.15)
    this.scene.add(winStrip)

    // Door frames
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.4, metalness: 0.5 })
    for (const fx of [-7.5, -3.5, 0.5, 4.5, 8.5]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.8, 0.2), frameMat)
      frame.position.set(x + fx, 1.9, z + 11.05)
      this.scene.add(frame)
    }

    // Entrance red accent stripe (matches real SM's red stripe above entrance)
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.5, metalness: 0.05 })
    const redStripe = new THREE.Mesh(new THREE.BoxGeometry(60, 0.7, 0.5), redMat)
    redStripe.position.set(x, 5.6, z + 11.15)
    this.scene.add(redStripe)
  }

  // ── Surroundings: trees, parking lot, road edge ──────────────────────────

  _buildSurroundings(x = SM_POSITION.x, z = SM_POSITION.z) {
    // Parking lot — center at z=-80, spans z=-75 to z=-85 (clear of road+sidewalk)
    const lotMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95, metalness: 0.0 })
    const lot    = new THREE.Mesh(new THREE.PlaneGeometry(70, 10), lotMat)
    lot.rotation.x = -Math.PI / 2
    lot.position.set(x, 0.04, z + 12)
    lot.receiveShadow = true
    this.scene.add(lot)

    // Parking lines — polygonOffset so they stay on top without fighting
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.85,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    })
    for (let lx = -32; lx < 32; lx += 3.2) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 5), lineMat)
      line.rotation.x = -Math.PI / 2
      line.position.set(x + lx, 0.04, z + 12)
      this.scene.add(line)
    }

    // Trees flanking the building
    const trunkMat   = new THREE.MeshStandardMaterial({ color: 0x5d3d1e, roughness: 0.9 })
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.82 })

    const treeSpots = [
      [-34, 18], [-28, 18], [28, 18], [34, 18],
      [-34, 12], [34, 12],
    ]
    for (const [tx, tz] of treeSpots) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 3, 6), trunkMat)
      trunk.position.set(x + tx, 1.5, z + tz)
      trunk.castShadow = true
      this.scene.add(trunk)

      const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 7), foliageMat)
      leaves.position.set(x + tx, 4.2, z + tz)
      leaves.castShadow = true
      this.scene.add(leaves)
    }

    // Flagpoles with SM flags (simple colored boxes)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.5 })
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.7 })
    for (const fx of [-20, 20]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 10, 6), poleMat)
      pole.position.set(x + fx, 5, z + 16)
      this.scene.add(pole)

      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), flagMat)
      flag.position.set(x + fx + 1.1, 9.4, z + 16)
      this.scene.add(flag)
    }
  }

  // ── Quest marker (glowing gold orb + beam above the building) ────────────

  _buildQuestMarker() {
    const x = SM_POSITION.x
    const z = SM_POSITION.z

    this._markerGroup = new THREE.Group()
    this._markerGroup.position.set(x, 26, z + 5)

    // Outer ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffee44, emissive: 0xffcc00,
      emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.2,
    })
    this._markerGroup.add(new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.14, 8, 28), ringMat))

    // Inner orb
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffee44,
      emissiveIntensity: 2.2, roughness: 0.1, metalness: 0.05,
    })
    this._markerGroup.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), orbMat))

    // Vertical light beam — kept short so it never touches the ground
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xffee44, emissive: 0xffcc00,
      emissiveIntensity: 0.7, roughness: 0.5,
      transparent: true, opacity: 0.28,
    })
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 10, 5), beamMat)
    beam.position.y = -5
    this._markerGroup.add(beam)

    const qLight = new THREE.PointLight(0xffdd44, 2.0, 35)
    this._markerGroup.add(qLight)

    this.scene.add(this._markerGroup)
  }

  // ── Glowing ground portal at SM entrance ─────────────────────────────────

  _buildPortal() {
    // Place portal just inside the parking lot entrance — player walks through here
    const px = SM_POSITION.x
    const pz = SM_POSITION.z + 15   // z = -77 (parking lot entrance area)

    this._portalGroup = new THREE.Group()
    this._portalGroup.position.set(px, 0.1, pz)

    // Outer glowing ring
    const outerMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7 })
    const outer = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.28, 8, 52), outerMat)
    outer.rotation.x = -Math.PI / 2
    this._portalGroup.add(outer)

    // Middle ring
    const midMat = new THREE.MeshBasicMaterial({ color: 0x88eeff })
    const mid = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.14, 8, 48), midMat)
    mid.rotation.x = -Math.PI / 2
    this._portalGroup.add(mid)

    // Inner fill disc
    this._portalFill = new THREE.Mesh(
      new THREE.CircleGeometry(3.5, 48),
      new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    )
    this._portalFill.rotation.x = -Math.PI / 2
    this._portalGroup.add(this._portalFill)

    // Atmospheric glow light
    this._portalLight = new THREE.PointLight(0x4fc3f7, 1.6, 14)
    this._portalLight.position.y = 1.5
    this._portalGroup.add(this._portalLight)

    this.scene.add(this._portalGroup)
    this._portalPos = new THREE.Vector3(px, 0, pz)
  }

  // ── Per-frame update ───────────────────────────────────────────────────

  update(elapsed, playerPos) {
    if (this.arrived) return

    if (this._markerGroup) {
      this._markerGroup.position.y = 26 + Math.sin(elapsed * 1.5) * 0.65
      this._markerGroup.rotation.y = elapsed * 0.85
    }

    // Animate portal pulse
    if (this._portalGroup) {
      const s = 0.93 + Math.sin(elapsed * 2.2) * 0.07
      this._portalGroup.scale.set(s, 1, s)
      if (this._portalFill)  this._portalFill.material.opacity = 0.12 + Math.sin(elapsed * 2.5) * 0.07
      if (this._portalLight) this._portalLight.intensity = 1.2 + Math.sin(elapsed * 3.0) * 0.5
    }

    // Trigger when player steps into the portal circle
    if (this._portalPos) {
      const dx = playerPos.x - this._portalPos.x
      const dz = playerPos.z - this._portalPos.z
      if (Math.sqrt(dx * dx + dz * dz) < 4.5) {
        this.arrived = true
        if (this._markerGroup) this._markerGroup.visible = false
        document.dispatchEvent(new CustomEvent('quest:sm_reached'))
      }
    }
  }

  getPosition() { return SM_POSITION }
}
