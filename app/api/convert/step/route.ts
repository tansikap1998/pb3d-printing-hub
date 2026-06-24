import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export const maxDuration = 30
export const runtime = 'nodejs'

// Resolve WASM path explicitly so Vercel bundles it correctly
const WASM_PATH = path.join(
  path.dirname(require.resolve('occt-import-js')),
  'occt-import-js.wasm'
)

function writeBinarySTL(meshes: any[]): Buffer {
  let triangleCount = 0
  for (const mesh of meshes) {
    triangleCount += mesh.index?.array?.length
      ? Math.floor(mesh.index.array.length / 3)
      : Math.floor(mesh.attributes.position.array.length / 9)
  }

  const buf = Buffer.alloc(80 + 4 + triangleCount * 50)
  buf.writeUInt32LE(triangleCount, 80)
  let off = 84

  for (const mesh of meshes) {
    const pos: number[] = mesh.attributes.position.array
    const nor: number[] | null = mesh.attributes.normal?.array ?? null
    const idx: number[] | null = mesh.index?.array ?? null

    if (idx) {
      for (let i = 0; i < idx.length; i += 3) {
        const v0 = idx[i] * 3, v1 = idx[i + 1] * 3, v2 = idx[i + 2] * 3
        const nx = nor ? (nor[v0] + nor[v1] + nor[v2]) / 3 : 0
        const ny = nor ? (nor[v0 + 1] + nor[v1 + 1] + nor[v2 + 1]) / 3 : 0
        const nz = nor ? (nor[v0 + 2] + nor[v1 + 2] + nor[v2 + 2]) / 3 : 0
        buf.writeFloatLE(nx, off); off += 4
        buf.writeFloatLE(ny, off); off += 4
        buf.writeFloatLE(nz, off); off += 4
        for (const vi of [v0, v1, v2]) {
          buf.writeFloatLE(pos[vi],     off); off += 4
          buf.writeFloatLE(pos[vi + 1], off); off += 4
          buf.writeFloatLE(pos[vi + 2], off); off += 4
        }
        buf.writeUInt16LE(0, off); off += 2
      }
    } else {
      for (let i = 0; i < pos.length; i += 9) {
        buf.writeFloatLE(0, off); off += 4
        buf.writeFloatLE(0, off); off += 4
        buf.writeFloatLE(0, off); off += 4
        for (let j = 0; j < 9; j++) { buf.writeFloatLE(pos[i + j], off); off += 4 }
        buf.writeUInt16LE(0, off); off += 2
      }
    }
  }
  return buf
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const occtimportjs = require('occt-import-js')
    const occt = await occtimportjs({
      locateFile: (filename: string) =>
        filename.endsWith('.wasm') ? WASM_PATH : filename,
    })

    const result = occt.ReadStepFile(new Uint8Array(buffer), {
      linearUnit: 'millimeter',
      linearDeflectionType: 'bounding_box_ratio',
      linearDeflection: 0.07,
    })

    if (!result.success || !result.meshes?.length) {
      return NextResponse.json({ error: 'STEP parse failed' }, { status: 422 })
    }

    // Bounding box across all meshes
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

    for (const mesh of result.meshes) {
      const pos: number[] = mesh.attributes.position.array
      for (let i = 0; i < pos.length; i += 3) {
        if (pos[i]   < minX) minX = pos[i]
        if (pos[i+1] < minY) minY = pos[i+1]
        if (pos[i+2] < minZ) minZ = pos[i+2]
        if (pos[i]   > maxX) maxX = pos[i]
        if (pos[i+1] > maxY) maxY = pos[i+1]
        if (pos[i+2] > maxZ) maxZ = pos[i+2]
      }
    }

    const dims = {
      x: isFinite(maxX) ? maxX - minX : 0,
      y: isFinite(maxY) ? maxY - minY : 0,
      z: isFinite(maxZ) ? maxZ - minZ : 0,
    }
    const volumeCm3 = Math.abs(dims.x * dims.y * dims.z) / 1000

    const stlBuf = writeBinarySTL(result.meshes)

    // Return STL as base64 + dims in same JSON response
    return NextResponse.json({
      dims,
      volumeCm3,
      stlBase64: stlBuf.toString('base64'),
      meshCount: result.meshes.length,
    })
  } catch (err) {
    console.error('STEP convert error:', err)
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
  }
}
