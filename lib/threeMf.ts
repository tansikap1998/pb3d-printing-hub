import * as THREE from "three"
import { unzipSync, strFromU8 } from "three/examples/jsm/libs/fflate.module.js"

// 3MF reader for the upload page (browser only: uses DOMParser).
//
// three.js's ThreeMFLoader cannot read files saved by Bambu Studio, OrcaSlicer
// and PrusaSlicer 2.6+ (and most MakerWorld downloads): they use the 3MF
// "Production" extension, where the main model only lists components and each
// object's mesh lives in a separate file (3D/Objects/object_N.model) referenced
// with p:path. This reader follows those references, applies every component
// and build-item transform, and returns one child group per build item (plate
// object) with the triangles already in printer coordinates (mm).

const PROD_NS = "http://schemas.microsoft.com/3dmanufacturing/production/2015/06"

type Mat = number[] // 12 numbers, 3MF row-vector affine: [m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32]
const IDENTITY: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]

function parseMat(s: string | null): Mat {
  if (!s) return IDENTITY
  const n = s.trim().split(/\s+/).map(Number)
  return n.length === 12 && n.every(Number.isFinite) ? n : IDENTITY
}
/** a then b (apply a first): row vectors, so p' = p · A · B */
function mul(a: Mat, b: Mat): Mat {
  const A = [[a[0], a[1], a[2], 0], [a[3], a[4], a[5], 0], [a[6], a[7], a[8], 0], [a[9], a[10], a[11], 1]]
  const B = [[b[0], b[1], b[2], 0], [b[3], b[4], b[5], 0], [b[6], b[7], b[8], 0], [b[9], b[10], b[11], 1]]
  const C = A.map(r => [0, 1, 2, 3].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j] + r[3] * B[3][j]))
  return [C[0][0], C[0][1], C[0][2], C[1][0], C[1][1], C[1][2], C[2][0], C[2][1], C[2][2], C[3][0], C[3][1], C[3][2]]
}

interface ObjDef { mesh?: { v: Float32Array; t: Uint32Array }; components: { path: string; id: string; m: Mat }[]; name: string }

const normPath = (p: string) => "/" + p.replace(/^\/+/, "")
const byLocal = (el: Element, name: string) => Array.from(el.getElementsByTagNameNS("*", name))

export interface Parsed3MF {
  /** one entry per build item, triangles in mm (x, y, z per vertex, 3 vertices per triangle) */
  items: { name: string; positions: Float32Array }[]
}

/** Parse a .3mf (zip) into transformed triangle soups, one per build item. */
export function parse3MF(data: ArrayBuffer | Uint8Array): Parsed3MF {
  let zip: Record<string, Uint8Array>
  try { zip = unzipSync(data instanceof Uint8Array ? data : new Uint8Array(data)) }
  catch { throw new Error("ไฟล์ 3MF เสียหรือไม่ใช่ไฟล์ zip") }
  const files: Record<string, Uint8Array> = {}
  for (const [k, v] of Object.entries(zip)) files[normPath(k)] = v

  // main model: from _rels/.rels, else the usual location, else any .model
  let root = "/3D/3dmodel.model"
  const rels = files["/_rels/.rels"]
  if (rels) {
    const doc = new DOMParser().parseFromString(strFromU8(rels), "application/xml")
    const rel = byLocal(doc.documentElement, "Relationship").find(r => /3dmodel/i.test(r.getAttribute("Type") || ""))
    if (rel?.getAttribute("Target")) root = normPath(rel.getAttribute("Target")!)
  }
  if (!files[root]) root = Object.keys(files).find(k => k.toLowerCase().endsWith(".model")) || root
  if (!files[root]) throw new Error("ไม่พบโมเดลในไฟล์ 3MF")

  const docs = new Map<string, Document>()
  const doc = (path: string) => {
    if (!docs.has(path)) {
      const bytes = files[path]
      if (!bytes) throw new Error(`ไฟล์ 3MF อ้างถึง ${path} แต่ไม่มีในไฟล์`)
      const d = new DOMParser().parseFromString(strFromU8(bytes), "application/xml")
      if (d.getElementsByTagName("parsererror").length) throw new Error("อ่าน XML ในไฟล์ 3MF ไม่ได้")
      docs.set(path, d)
    }
    return docs.get(path)!
  }

  const objects = new Map<string, ObjDef>() // key: path#id
  const object = (path: string, id: string): ObjDef => {
    const key = `${path}#${id}`
    const cached = objects.get(key)
    if (cached) return cached
    const el = byLocal(doc(path).documentElement, "object").find(o => o.getAttribute("id") === id)
    if (!el) throw new Error(`ไม่พบชิ้นงาน id ${id} ในไฟล์ 3MF`)
    const def: ObjDef = { components: [], name: el.getAttribute("name") || "" }
    const meshEl = byLocal(el, "mesh")[0]
    if (meshEl) {
      const vs = byLocal(meshEl, "vertex"), ts = byLocal(meshEl, "triangle")
      const v = new Float32Array(vs.length * 3)
      vs.forEach((x, i) => { v[i * 3] = +x.getAttribute("x")!; v[i * 3 + 1] = +x.getAttribute("y")!; v[i * 3 + 2] = +x.getAttribute("z")! })
      const t = new Uint32Array(ts.length * 3)
      ts.forEach((x, i) => { t[i * 3] = +x.getAttribute("v1")!; t[i * 3 + 1] = +x.getAttribute("v2")!; t[i * 3 + 2] = +x.getAttribute("v3")! })
      def.mesh = { v, t }
    }
    for (const c of byLocal(el, "component")) {
      const p = c.getAttributeNS(PROD_NS, "path") || c.getAttribute("p:path")
      def.components.push({ path: p ? normPath(p) : path, id: c.getAttribute("objectid") || "", m: parseMat(c.getAttribute("transform")) })
    }
    objects.set(key, def)
    return def
  }

  // collect triangles of an object (and its components) under transform m
  const collect = (path: string, id: string, m: Mat, out: number[], depth = 0) => {
    if (depth > 16) throw new Error("โครงสร้างไฟล์ 3MF ซ้อนกันลึกเกินไป")
    const o = object(path, id)
    if (o.mesh) {
      const { v, t } = o.mesh
      for (let i = 0; i < t.length; i++) {
        const k = t[i] * 3
        if (k + 2 >= v.length) continue
        const x = v[k], y = v[k + 1], z = v[k + 2]
        out.push(x * m[0] + y * m[3] + z * m[6] + m[9], x * m[1] + y * m[4] + z * m[7] + m[10], x * m[2] + y * m[5] + z * m[8] + m[11])
      }
    }
    for (const c of o.components) collect(c.path, c.id, mul(c.m, m), out, depth + 1)
  }

  const rootDoc = doc(root)
  const buildEl = byLocal(rootDoc.documentElement, "build")[0]
  const itemEls = buildEl ? byLocal(buildEl, "item") : []
  const items: Parsed3MF["items"] = []
  for (const it of itemEls) {
    if (it.getAttribute("printable") === "0") continue
    const p = it.getAttributeNS(PROD_NS, "path") || it.getAttribute("p:path")
    const path = p ? normPath(p) : root
    const id = it.getAttribute("objectid") || ""
    const out: number[] = []
    collect(path, id, parseMat(it.getAttribute("transform")), out)
    if (out.length) items.push({ name: object(path, id).name, positions: new Float32Array(out) })
  }
  if (!items.length) throw new Error("ไม่พบชิ้นงานที่พิมพ์ได้ในไฟล์ 3MF")
  return { items }
}

/** Build a THREE.Group (one child per build item) for the preview and for measuring. */
export function group3MF(parsed: Parsed3MF): THREE.Group {
  const group = new THREE.Group()
  for (const it of parsed.items) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(it.positions, 3))
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.25, roughness: 0.55 }))
    mesh.name = it.name
    const child = new THREE.Group()
    child.name = it.name
    child.add(mesh)
    group.add(child)
  }
  return group
}

/** Fetch a (blob) URL and parse it. */
export async function load3MF(url: string): Promise<THREE.Group> {
  const buf = await (await fetch(url)).arrayBuffer()
  return group3MF(parse3MF(buf))
}
