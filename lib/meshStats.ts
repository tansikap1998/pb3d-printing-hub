import * as THREE from "three"

/** Solid volume (cm³) and surface area (cm²) of triangle meshes, in mm coordinates.
 *  openEdges: edges not shared by exactly two triangles (0 = watertight; -1 = not checked). */
export interface MeshStats { volumeCm3: number; surfaceCm2: number; openEdges: number }

const MAX_EDGE_CHECK = 1_500_000 // triangles; bigger models skip the watertight check

/** Stats for everything under `root` (world transforms applied). Closed meshes give exact volumes. */
export function objectStats(root: THREE.Object3D): MeshStats {
  root.updateMatrixWorld(true)
  let vol = 0, area = 0, tris = 0
  root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry) { const g = m.geometry; tris += (g.getIndex()?.count ?? g.getAttribute("position")?.count ?? 0) / 3 } })
  const checkEdges = tris <= MAX_EDGE_CHECK
  const vid = new Map<string, number>(), edges = new Map<number, number>()
  const key = (v: THREE.Vector3) => {
    const k = `${Math.round(v.x * 1e3)},${Math.round(v.y * 1e3)},${Math.round(v.z * 1e3)}`
    let id = vid.get(k)
    if (id === undefined) { id = vid.size; vid.set(k, id) }
    return id
  }
  const edge = (p: number, q: number) => {
    if (p === q) return
    const k = p < q ? p * 8388608 + q : q * 8388608 + p
    edges.set(k, (edges.get(k) ?? 0) + 1)
  }
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
      if (checkEdges) { const ka = key(a), kb = key(b), kc = key(c); edge(ka, kb); edge(kb, kc); edge(kc, ka) }
    }
  })
  let open = 0
  if (checkEdges) edges.forEach(n => { if (n !== 2) open++ })
  return { volumeCm3: Math.abs(vol) / 1000, surfaceCm2: area / 100, openEdges: checkEdges ? open : -1 }
}

/** Stats of an STL geometry (no transforms). */
export function geometryStats(geo: THREE.BufferGeometry): MeshStats {
  return objectStats(new THREE.Mesh(geo))
}

/** Warnings shown under an uploaded file (Thai). */
export function fileWarnings(dims: { x: number; y: number; z: number }, stats: MeshStats | null): string[] {
  const w: string[] = []
  const max = Math.max(dims.x, dims.y, dims.z)
  if (max > 0 && max < 10)
    w.push(`ชิ้นงานเล็กมาก (${max.toFixed(1)} mm) ไฟล์อาจเป็นหน่วยนิ้ว`)
  if (stats && stats.openEdges > 0)
    w.push(`โมเดลไม่ปิดสนิท (ขอบเปิด ${stats.openEdges.toLocaleString()} จุด) ราคาอาจคลาดเคลื่อน ร้านจะตรวจให้`)
  if (stats && stats.volumeCm3 > 0 && max > 0) {
    const box = (dims.x * dims.y * dims.z) / 1000
    if (box > 0 && stats.volumeCm3 > box * 1.05) w.push("พื้นผิวโมเดลอาจซ้อนกันหรือหันผิดด้าน ร้านจะตรวจให้")
  }
  return w
}
