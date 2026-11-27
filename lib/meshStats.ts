import * as THREE from "three"

/** Solid volume (cm³) and surface area (cm²) of triangle meshes, in mm coordinates. */
export interface MeshStats { volumeCm3: number; surfaceCm2: number }

/** Stats for everything under `root` (world transforms applied). Closed meshes give exact volumes. */
export function objectStats(root: THREE.Object3D): MeshStats {
  root.updateMatrixWorld(true)
  let vol = 0, area = 0
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const ab = new THREE.Vector3(), ac = new THREE.Vector3()
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute | undefined
    if (!pos) return
    const idx = mesh.geometry.getIndex()
    const n = idx ? idx.count : pos.count
    const m = mesh.matrixWorld
    for (let i = 0; i + 2 < n; i += 3) {
      const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2
      a.fromBufferAttribute(pos, i0).applyMatrix4(m)
      b.fromBufferAttribute(pos, i1).applyMatrix4(m)
      c.fromBufferAttribute(pos, i2).applyMatrix4(m)
      vol += a.dot(ab.copy(b).cross(c)) / 6
      area += ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2
    }
  })
  return { volumeCm3: Math.abs(vol) / 1000, surfaceCm2: area / 100 }
}

/** Stats of an STL geometry (no transforms). */
export function geometryStats(geo: THREE.BufferGeometry): MeshStats {
  return objectStats(new THREE.Mesh(geo))
}
