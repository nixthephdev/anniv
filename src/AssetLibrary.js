import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// Loads and caches CC0 GLTF models from public/assets/city-kit/ (see its
// README.txt for source/license), and clones them into placed instances.
// Models load async and pop in when ready — same pattern already used by
// Player.js / BoyfriendNPC.js for their optional GLB characters.

const loader = new GLTFLoader()
const _cache = new Map()   // name -> Promise<THREE.Group> (the loaded template)

function _load(name) {
  if (!_cache.has(name)) {
    const base = import.meta.env.BASE_URL
    _cache.set(name, loader.loadAsync(`${base}assets/city-kit/${name}.glb`).then(gltf => gltf.scene))
  }
  return _cache.get(name)
}

// baseOffset: Kenney's City Kit models are pivoted 1 local unit above their
// base (their modular-stacking convention) — scaled by `scale` so the base
// still lands on the ground instead of sinking halfway into it.
export async function placeModel(scene, name, { x, z, y = 0, rotY = 0, scale = 1, baseOffset = 1 }) {
  const template = await _load(name)
  const instance = template.clone(true)
  instance.position.set(x, y + baseOffset * scale, z)
  instance.rotation.y = rotY
  instance.scale.setScalar(scale)
  instance.traverse(c => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
  })
  scene.add(instance)
  return instance
}
