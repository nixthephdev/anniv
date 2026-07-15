import { placeModel } from './AssetLibrary.js'

// Naga City district landmarks built from the Kenney "City Kit (Commercial)"
// CC0 pack (see public/assets/city-kit/README.txt) instead of hand-coded
// primitives — real modeled facades/windows read as an actual city much
// faster than boxes-and-cylinders can.
export class CityBuildings {
  constructor(scene) {
    this.scene = scene
    this._build()
  }

  _build() {
    // BPO office tower — business district edge, east of the Avenue
    placeModel(this.scene, 'building-skyscraper-c', { x: 120, z: 110, scale: 8 })

    // Second mall — a small complex of two joined buildings
    placeModel(this.scene, 'building-l', { x: 88,  z: 150, scale: 6 })
    placeModel(this.scene, 'building-m', { x: 104, z: 150, scale: 6, rotY: -0.35 })

    // Museum
    placeModel(this.scene, 'building-i', { x: 40, z: 180, scale: 6 })
  }
}
