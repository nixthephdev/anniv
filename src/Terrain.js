import * as THREE from 'three'
import { toon, toonGradMap } from './toon.js'

const MOBILE = ('ontouchstart' in window) || navigator.maxTouchPoints > 0

function heightAt(x, z) {
  // One smooth hill centered near spawn, flat everywhere else
  const dist = Math.sqrt(x * x + (z - 2) * (z - 2))
  if (dist >= 26) return 0
  const t = dist / 26
  return 4.2 * (1 - t) * (1 - t)
}

function rngFrom(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export class Terrain {
  constructor(scene) {
    this.scene = scene
    this._windShader = null

    this._buildGround()
    this._buildGrassBlades()
    this._buildTrees()
  }

  // ── Ground with realistic canvas texture ──────────────────────────────

  _buildGround() {
    const size = 200, segs = MOBILE ? 80 : 110
    const geo = new THREE.PlaneGeometry(size, size, segs, segs)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      pos.setY(i, heightAt(x, z))
    }
    geo.computeVertexNormals()

    const tex = this._makeGrassTexture()
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(22, 22)

    const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: toonGradMap() })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.receiveShadow = true
    this.scene.add(mesh)

    // Store geo for getHeightAt
    this.geo = geo
  }

  _makeGrassTexture() {
    const S = 512
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = S
    const ctx = canvas.getContext('2d')
    const rng = rngFrom(112)

    // Base grass fill
    ctx.fillStyle = '#4a8a3e'
    ctx.fillRect(0, 0, S, S)

    // Color variation blobs
    for (let i = 0; i < 350; i++) {
      const x = rng() * S, y = rng() * S
      const r = 6 + rng() * 38
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      const bright = rng() > 0.45
      grad.addColorStop(0, bright
        ? `rgba(100,165,65,${0.15 + rng() * 0.3})`
        : `rgba(28,75,18,${0.12 + rng() * 0.28})`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }

    // Fine grass blade strokes
    for (let i = 0; i < 1200; i++) {
      const x = rng() * S, y = rng() * S
      const len = 3 + rng() * 14
      const lean = (rng() - 0.5) * 8
      const R = 35 + Math.floor(rng() * 55)
      const G = 95 + Math.floor(rng() * 85)
      const B = 15 + Math.floor(rng() * 35)
      ctx.strokeStyle = `rgba(${R},${G},${B},${0.35 + rng() * 0.55})`
      ctx.lineWidth = 0.4 + rng() * 1.2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + lean, y - len)
      ctx.stroke()
    }

    // Dirt patches
    for (let i = 0; i < 40; i++) {
      const x = rng() * S, y = rng() * S
      const r = 2 + rng() * 10
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, `rgba(110,75,35,${0.18 + rng() * 0.22})`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }

    // Subtle bright dew specks
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(200,240,180,${0.08 + rng() * 0.12})`
      ctx.beginPath()
      ctx.arc(rng() * S, rng() * S, 0.8 + rng() * 2, 0, Math.PI * 2)
      ctx.fill()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  // ── Grass blades — InstancedMesh + wind shader ────────────────────────

  _buildGrassBlades() {
    const count = MOBILE ? 3500 : 14000

    // Tapered blade: wide base, narrow mid, pointed tip
    const w = 0.048, h = 0.30
    const positions = new Float32Array([
      -w,        0,     0,   //  0 bot-left
       w,        0,     0,   //  1 bot-right
      -w * 0.55, h * 0.5, 0, //  2 mid-left
       w * 0.55, h * 0.5, 0, //  3 mid-right
       0,        h,     0,   //  4 tip
    ])
    const normals = new Float32Array([
      0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1,
    ])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('normal',   new THREE.BufferAttribute(normals,   3))
    geo.setIndex([0,1,2, 1,3,2, 2,3,4])

    const mat = new THREE.MeshToonMaterial({ side: THREE.DoubleSide, gradientMap: toonGradMap() })

    // Wind via onBeforeCompile (injects into Three.js's Lambert vertex shader)
    mat.onBeforeCompile = shader => {
      shader.uniforms.uTime = { value: 0 }
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float windH = transformed.y * 0.20;
        float wx = instanceMatrix[3][0];
        float wz = instanceMatrix[3][2];
        transformed.x += sin(uTime * 2.4 + wx * 0.28 + wz * 0.17) * windH;
        transformed.z += cos(uTime * 1.7 + wz * 0.21 + wx * 0.13) * windH * 0.55;`
      )
      this._windShader = shader
    }

    const mesh = new THREE.InstancedMesh(geo, mat, count)
    mesh.receiveShadow = true

    const dummy  = new THREE.Object3D()
    const rng    = rngFrom(77)
    const greens = [
      new THREE.Color(0x2e7d32), new THREE.Color(0x388e3c),
      new THREE.Color(0x43a047), new THREE.Color(0x4caf50),
      new THREE.Color(0x558b2f), new THREE.Color(0x33691e),
      new THREE.Color(0x66bb6a), new THREE.Color(0x7cb342),
    ]

    let placed = 0
    const attempts = count * 3
    for (let a = 0; a < attempts && placed < count; a++) {
      const angle = rng() * Math.PI * 2
      const dist  = 6 + rng() * 85
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist

      if (z < -44) continue   // skip road + SM zone

      dummy.position.set(x, heightAt(x, z), z)
      dummy.rotation.set(0, rng() * Math.PI * 2, (rng() - 0.5) * 0.35)
      dummy.scale.setScalar(0.55 + rng() * 0.9)
      dummy.updateMatrix()
      mesh.setMatrixAt(placed, dummy.matrix)
      mesh.setColorAt(placed, greens[Math.floor(rng() * greens.length)])
      placed++
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    this.scene.add(mesh)
    this._grassMesh = mesh
  }

  // ── Trees with bark texture and layered canopy ─────────────────────────

  _buildTrees() {
    const rng = rngFrom(42)
    const count = MOBILE ? 32 : 90   // draw calls are the mobile bottleneck

    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2
      const dist  = 14 + rng() * 78
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      if (z < -44) continue   // skip road + SM zone
      this._placeTree(x, z, rng)
    }
  }

  _placeTree(x, z, rng) {
    const y = heightAt(x, z)
    const group = new THREE.Group()
    group.position.set(x, y, z)

    const h = 3.8 + rng() * 4.5

    // ── Trunk ──
    const trunkMat = this._getBarkMat()
    const segments = rng() > 0.3 ? 8 : 6
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 + rng() * 0.06, 0.2 + rng() * 0.08, h, segments),
      trunkMat
    )
    trunk.position.y = h / 2
    trunk.castShadow = true
    group.add(trunk)

    // Root flares (2-3 thick base fins) — desktop only, they're pure detail
    if (!MOBILE) {
      const flareMat = this._getBarkMat()
      for (let f = 0; f < 3; f++) {
        const fa = (f / 3) * Math.PI * 2
        const flare = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.5, 0.08),
          flareMat
        )
        flare.position.set(Math.cos(fa) * 0.22, 0.25, Math.sin(fa) * 0.22)
        flare.rotation.y = fa
        group.add(flare)
      }
    }

    // ── Foliage: 1 main + 4-7 satellite blobs ──
    const baseR = 1.8 + rng() * 1.6
    const foliageMats = [
      toon(0x1b7a28),
      toon(0x27913a),
      toon(0x34a84e),
      toon(0x4bbf5e),
      toon(0x3d8c30),
    ]

    // Main central blob
    const main = new THREE.Mesh(
      new THREE.SphereGeometry(baseR, MOBILE ? 7 : 9, MOBILE ? 6 : 8),
      foliageMats[1]
    )
    main.position.y = h + baseR * 0.55
    main.castShadow = true
    group.add(main)

    // Satellite blobs — fewer on mobile (each blob is a draw call)
    const blobCount = MOBILE ? 2 : 4 + Math.floor(rng() * 5)
    for (let b = 0; b < blobCount; b++) {
      const ba = (b / blobCount) * Math.PI * 2 + rng() * 0.6
      const bd = baseR * (0.4 + rng() * 0.65)
      const br = baseR * (0.38 + rng() * 0.45)
      const bh = h + baseR * (0.1 + rng() * 0.9)

      const blob = new THREE.Mesh(
        new THREE.SphereGeometry(br, MOBILE ? 6 : 8, MOBILE ? 5 : 7),
        foliageMats[Math.floor(rng() * foliageMats.length)]
      )
      blob.position.set(Math.cos(ba) * bd, bh, Math.sin(ba) * bd)
      blob.castShadow = true
      group.add(blob)
    }

    // Bright sunlit top
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(baseR * 0.42, 7, 6),
      foliageMats[3]
    )
    top.position.y = h + baseR * 1.55
    group.add(top)

    this.scene.add(group)
  }

  _getBarkMat() {
    if (this._barkMat) return this._barkMat

    const S = 128, H = 256
    const canvas = document.createElement('canvas')
    canvas.width = S; canvas.height = H
    const ctx = canvas.getContext('2d')
    const rng = rngFrom(333)

    // Base bark color
    ctx.fillStyle = '#6d4c41'
    ctx.fillRect(0, 0, S, H)

    // Vertical grain streaks
    for (let i = 0; i < 60; i++) {
      const x = rng() * S
      const w = 0.5 + rng() * 3.5
      ctx.fillStyle = rng() > 0.5
        ? `rgba(0,0,0,${0.08 + rng() * 0.2})`
        : `rgba(255,190,140,${0.04 + rng() * 0.1})`
      ctx.fillRect(x, 0, w, H)
    }

    // Horizontal cracks / knot rings
    for (let i = 0; i < 8; i++) {
      const y = rng() * H
      ctx.strokeStyle = `rgba(0,0,0,${0.12 + rng() * 0.18})`
      ctx.lineWidth = 0.8 + rng() * 2
      ctx.beginPath()
      ctx.moveTo(0, y + (rng() - 0.5) * 4)
      for (let sx = 0; sx < S; sx += 8) {
        ctx.lineTo(sx, y + (rng() - 0.5) * 5)
      }
      ctx.stroke()
    }

    // Moss patches (green tint)
    for (let i = 0; i < 12; i++) {
      const x = rng() * S, y = H - rng() * H * 0.4  // lower half
      const r = 4 + rng() * 14
      ctx.fillStyle = `rgba(50,100,30,${0.06 + rng() * 0.12})`
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 1)
    tex.colorSpace = THREE.SRGBColorSpace

    this._barkMat = new THREE.MeshToonMaterial({ map: tex, gradientMap: toonGradMap() })
    return this._barkMat
  }

  // ── Flowers with proper petal shapes ──────────────────────────────────

  _buildFlowers() {
    const rng = rngFrom(7)
    const count = MOBILE ? 180 : 320

    const flowerDefs = [
      { color: 0xf48fb1, petals: 8,  petalLen: 0.14, petalW: 0.055, center: 0xf9a825 },
      { color: 0xfff176, petals: 12, petalLen: 0.16, petalW: 0.045, center: 0xff6f00 },
      { color: 0xffffff, petals: 7,  petalLen: 0.13, petalW: 0.05,  center: 0xfdd835 },
      { color: 0xce93d8, petals: 6,  petalLen: 0.15, petalW: 0.06,  center: 0xf3e5f5 },
      { color: 0xff4081, petals: 9,  petalLen: 0.17, petalW: 0.05,  center: 0xfff9c4 },
      { color: 0xff7043, petals: 8,  petalLen: 0.14, petalW: 0.052, center: 0xffee58 },
    ]

    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2
      const dist  = 6 + rng() * 72
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      if (z < -44) continue   // skip road + SM zone

      const y = heightAt(x, z)
      const def = flowerDefs[Math.floor(rng() * flowerDefs.length)]

      const group = this._makeFlower(def, rng)
      group.position.set(x, y, z)
      group.rotation.y = rng() * Math.PI * 2
      this.scene.add(group)
    }
  }

  _makeFlower(def, rng) {
    const group = new THREE.Group()

    // ── Stem ──
    const stemH = 0.22 + rng() * 0.14
    const stemMat = toon(0x33691e)
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.018, stemH, 5),
      stemMat
    )
    stem.position.y = stemH / 2
    group.add(stem)

    // ── Leaves on stem ──
    const leafMat = toon(0x388e3c, { side: THREE.DoubleSide })
    const leafShape = new THREE.Shape()
    leafShape.moveTo(0, 0)
    leafShape.quadraticCurveTo(0.065, 0.04, 0.045, 0.13)
    leafShape.quadraticCurveTo(0, 0.09, -0.015, 0)

    const leafGeo = new THREE.ShapeGeometry(leafShape, 5)
    ;[
      { y: stemH * 0.28, rz: 0.9,  ry: 0 },
      { y: stemH * 0.52, rz: -0.75, ry: Math.PI },
    ].forEach(({ y, rz, ry }) => {
      const leaf = new THREE.Mesh(leafGeo, leafMat)
      leaf.position.y = y
      leaf.rotation.set(0, ry, rz)
      group.add(leaf)
    })

    // ── Petals ──
    const petalShape = new THREE.Shape()
    const pw = def.petalW, pl = def.petalLen
    petalShape.moveTo(0, 0)
    petalShape.quadraticCurveTo( pw, pl * 0.35,  pw * 0.35, pl)
    petalShape.quadraticCurveTo( 0,  pl + pw * 0.3, -pw * 0.35, pl)
    petalShape.quadraticCurveTo(-pw, pl * 0.35,  0, 0)
    const petalGeo = new THREE.ShapeGeometry(petalShape, 7)
    const petalMat = toon(def.color, { side: THREE.DoubleSide })

    const flowerTop = stemH + 0.01
    for (let p = 0; p < def.petals; p++) {
      const a = (p / def.petals) * Math.PI * 2
      const petal = new THREE.Mesh(petalGeo, petalMat)
      // Petal shape is in XY plane pointing +Y; rotate to lay outward in XZ
      petal.rotation.order = 'YXZ'
      petal.rotation.x = -(Math.PI / 2) + 0.28   // flatten + slight upward tilt
      petal.rotation.y = a
      petal.position.y = flowerTop
      group.add(petal)
    }

    // ── Center (stamen) ──
    const cenMat = toon(def.center, {
      emissive: new THREE.Color(def.center).multiplyScalar(0.3),
    })
    const cen = new THREE.Mesh(new THREE.SphereGeometry(pw * 0.9, 8, 7), cenMat)
    cen.position.y = flowerTop + 0.008
    group.add(cen)

    // ── Small stamen dots ──
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4 })
    for (let d = 0; d < 5; d++) {
      const da = rng() * Math.PI * 2
      const dr = rng() * pw * 0.6
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 4, 4), dotMat)
      dot.position.set(
        Math.cos(da) * dr,
        flowerTop + pw * 0.9 + 0.005,
        Math.sin(da) * dr
      )
      group.add(dot)
    }

    return group
  }

  // ── Path ──────────────────────────────────────────────────────────────

  _buildPath() {
    const rng    = rngFrom(13)
    const stoneColors = [0xa1887f, 0x90a4ae, 0xbcaaa4, 0x8d6e63]
    const waypoints = [
      { x:  0, z:  0 }, { x:  5, z: -8  }, { x: 12, z: -12 },
      { x: 18, z: -14 }, { x: -5, z: -16 }, { x: -15, z: -20 },
      { x: -5, z: -30 }, { x:  0, z: -38 }, { x:  5, z: -50 },
      { x:  0, z: -62 },
    ]
    waypoints.forEach(({ x, z }) => {
      for (let s = 0; s < 5; s++) {
        const ox = (rng() - 0.5) * 2.2, oz = (rng() - 0.5) * 2.2
        const col = stoneColors[Math.floor(rng() * stoneColors.length)]
        const mat = toon(col)
        const sx = 0.22 + rng() * 0.22
        const sy = 0.04 + rng() * 0.04
        const sz = 0.22 + rng() * 0.22
        const stone = new THREE.Mesh(
          new THREE.BoxGeometry(sx, sy, sz),
          mat
        )
        stone.position.set(x + ox, heightAt(x + ox, z + oz) + sy / 2, z + oz)
        stone.rotation.y = rng() * Math.PI
        stone.receiveShadow = true
        this.scene.add(stone)
      }
    })
  }

  // ── Scattered rocks ───────────────────────────────────────────────────

  _buildRocks() {
    const rng = rngFrom(55)
    const rockColors = [0x9e9e9e, 0x78909c, 0xa1887f, 0xb0bec5]

    for (let i = 0; i < (MOBILE ? 20 : 40); i++) {
      const angle = rng() * Math.PI * 2
      const dist  = 18 + rng() * 65
      const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist
      if (z < -44) continue   // skip road + SM zone

      const y = heightAt(x, z)
      const s = 0.18 + rng() * 0.55
      const col = rockColors[Math.floor(rng() * rockColors.length)]

      const mat = toon(col)
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat)
      rock.position.set(x, y + s * 0.35, z)
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
      rock.castShadow = true
      rock.receiveShadow = true
      this.scene.add(rock)

      // Small pebbles around rock
      for (let p = 0; p < 3; p++) {
        const ps = 0.04 + rng() * 0.1
        const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(ps, 0), mat)
        pebble.position.set(
          x + (rng() - 0.5) * 0.6,
          y + ps * 0.4,
          z + (rng() - 0.5) * 0.6
        )
        pebble.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
        this.scene.add(pebble)
      }
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  getHeightAt(x, z) {
    return heightAt(x, z)
  }

  update(elapsed) {
    if (this._windShader) {
      this._windShader.uniforms.uTime.value = elapsed
    }
  }
}
