import * as THREE from 'three'

let _gradMap = null

export function toonGradMap() {
  if (_gradMap) return _gradMap
  // 3 discrete bands: deep shadow → mid → lit highlight
  const data = new Uint8Array([
    30,  30,  30,  255,
    120, 120, 120, 255,
    255, 255, 255, 255,
  ])
  _gradMap = new THREE.DataTexture(data, 3, 1)
  _gradMap.minFilter = THREE.NearestFilter
  _gradMap.magFilter = THREE.NearestFilter
  _gradMap.needsUpdate = true
  return _gradMap
}

export function toon(color, extra = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradMap(), ...extra })
}
