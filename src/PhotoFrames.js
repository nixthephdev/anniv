import * as THREE from 'three'
import { CONFIG } from './config.js'

export class PhotoFrames {
  constructor(scene) {
    this.scene = scene
    this.loader = new THREE.TextureLoader()
    this._build()
  }

  _build() {
    CONFIG.photoFrames.forEach(frame => {
      if (frame.heartShape) {
        this._buildHeartFrame(frame)
      } else {
        this._buildRectFrame(frame)
      }
    })
  }

  // ── Heart-shaped frame ──────────────────────────────────────────────────
  _buildHeartFrame(frame) {
    const group = new THREE.Group()
    const { x, z } = frame.position

    const shape = this._heartShape(1.4)

    // Glowing pink fill (placeholder — replace mat with photo texture when ready)
    const fillMat = frame.src
      ? new THREE.MeshBasicMaterial({ map: this._loadPhoto(frame.src), side: THREE.DoubleSide })
      : this._heartPlaceholderMat()

    const fillGeo = new THREE.ShapeGeometry(shape, 32)
    const fill = new THREE.Mesh(fillGeo, fillMat)
    fill.position.z = 0.02
    group.add(fill)

    // Extruded border/frame
    const borderGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.12, bevelEnabled: true, bevelThickness: 0.06,
      bevelSize: 0.06, bevelSegments: 4,
    })
    const borderMat = new THREE.MeshLambertMaterial({ color: 0xc2185b, emissive: 0x7b0033, emissiveIntensity: 0.4 })
    const border = new THREE.Mesh(borderGeo, borderMat)
    border.position.z = -0.06
    group.add(border)

    // Soft pink point light — makes it glow on the ground
    const light = new THREE.PointLight(0xff69b4, 1.0, 10)
    light.position.set(0, 0, 1)
    group.add(light)

    // Subtle outer halo ring (billboard)
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff69b4, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    })
    const haloGeo = new THREE.ShapeGeometry(this._heartShape(1.85), 32)
    const halo = new THREE.Mesh(haloGeo, haloMat)
    halo.position.z = -0.01
    group.add(halo)

    // Label sprite below the heart
    if (frame.label) {
      const sprite = this._makeLabel(frame.label)
      sprite.position.set(0, -2.0, 0)
      group.add(sprite)
    }

    // Stand post
    const standMat = new THREE.MeshLambertMaterial({ color: 0x880e4f })
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 6), standMat)
    stand.position.set(0, -2.2, 0)
    group.add(stand)

    // Positioning: hearts are centered around 0,0 after the shape, lift up
    group.position.set(x, 3.2, z)
    group.rotation.y = Math.atan2(-x, -z)  // face player spawn

    // Store for gentle pulse animation
    group.userData.haloMat = haloMat
    group.userData.light = light
    group.userData.isHeart = true
    this._heartGroups = this._heartGroups || []
    this._heartGroups.push(group)

    this.scene.add(group)
  }

  _heartPlaceholderMat() {
    // Canvas gradient simulating a sweet photo placeholder
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 256
    const ctx = canvas.getContext('2d')

    // Background gradient
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
    grad.addColorStop(0, '#ff80ab')
    grad.addColorStop(0.6, '#c2185b')
    grad.addColorStop(1, '#880e4f')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 256)

    // "Our photo" text
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = 'bold 20px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('📸 Our Photo', 128, 108)
    ctx.font = '14px Georgia, serif'
    ctx.fillStyle = 'rgba(255,236,240,0.8)'
    ctx.fillText('Legazpi Blvd · 3PM', 128, 140)
    ctx.fillText('🌸', 128, 168)

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  }

  _heartShape(size = 1) {
    // Standard Three.js heart (from official docs), scaled by `size`
    const s = size / 10   // normalize to unit scale
    const shape = new THREE.Shape()
    shape.moveTo(0,        s * 5)
    shape.bezierCurveTo(  s * 5,  s * 5,  s * 4,  0,       0,       0)
    shape.bezierCurveTo( -s * 6,  0,      -s * 6,  s * 7,  -s * 6,  s * 7)
    shape.bezierCurveTo( -s * 6,  s * 11, -s * 3,  s * 15.4, 0,    s * 19)
    shape.bezierCurveTo(  s * 3,  s * 15.4, s * 6, s * 11,  s * 6,  s * 7)
    shape.bezierCurveTo(  s * 6,  s * 7,  s * 6,   0,       s * 10, 0)
    shape.bezierCurveTo(  s * 7,  0,      s * 5,   s * 5,   0,      s * 5)
    return shape
  }

  _loadPhoto(src) {
    return this.loader.load(`/photos/${src}`)
  }

  // ── Standard rectangular frame ──────────────────────────────────────────
  _buildRectFrame(frame) {
    const group = new THREE.Group()
    const { x, z } = frame.position

    const frameMat = new THREE.MeshLambertMaterial({ color: 0x8b0060 })
    group.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.08), frameMat))

    this.loader.load(
      `/photos/${frame.src}`,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        const photo = new THREE.Mesh(
          new THREE.PlaneGeometry(2.1, 1.55),
          new THREE.MeshBasicMaterial({ map: tex })
        )
        photo.position.z = 0.05
        group.add(photo)
      },
      undefined,
      () => {
        const ph = new THREE.Mesh(
          new THREE.PlaneGeometry(2.1, 1.55),
          new THREE.MeshBasicMaterial({ color: 0x3d0050 })
        )
        ph.position.z = 0.05
        group.add(ph)
      }
    )

    if (frame.label) {
      const sprite = this._makeLabel(frame.label)
      sprite.position.set(0, -1.3, 0)
      group.add(sprite)
    }

    const standMat = new THREE.MeshLambertMaterial({ color: 0x5a0040 })
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.5, 6), standMat)
    stand.position.y = -1.5
    group.add(stand)

    group.position.set(x, 1.8, z)
    group.rotation.y = Math.atan2(x, z) + Math.PI
    this.scene.add(group)
  }

  _makeLabel(text) {
    const canvas = document.createElement('canvas')
    canvas.width = 240; canvas.height = 48
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'rgba(20,0,35,0.82)'
    ctx.roundRect(2, 2, 236, 44, 10)
    ctx.fill()
    ctx.fillStyle = '#ffb3cc'
    ctx.font = '15px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 120, 24)
    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(2.4, 0.48, 1)
    return sprite
  }

  // Call from World update loop for pulse effect
  update(elapsed) {
    if (!this._heartGroups) return
    this._heartGroups.forEach((group, i) => {
      const pulse = 0.9 + Math.sin(elapsed * 1.6 + i) * 0.1
      group.scale.set(pulse, pulse, 1)
      if (group.userData.haloMat) {
        group.userData.haloMat.opacity = 0.12 + Math.sin(elapsed * 2 + i) * 0.08
      }
      if (group.userData.light) {
        group.userData.light.intensity = 0.8 + Math.sin(elapsed * 2.5) * 0.4
      }
    })
  }
}
