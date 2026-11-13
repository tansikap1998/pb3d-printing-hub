// Local stand-in for the Google Apps Script web app, for development and tests.
// It runs the real integrations/google-sheets/Code.gs inside a sandbox with
// in-memory fakes of the Google services it uses, persisted to a JSON file.
// Enabled only when SHEETS_EMULATOR_FILE is set — never used in production.
import fs from "fs"
import path from "path"
import vm from "vm"
import { randomUUID } from "crypto"

type Cell = string | number | boolean
interface State {
  sheets: Record<string, Cell[][]>
  props: Record<string, string>
  files: Record<string, { name: string; mimeType: string; base64: string }>
  cache?: Record<string, string>
}

let script: vm.Script | null = null
export function compiled() {
  if (!script) {
    const src = fs.readFileSync(path.join(process.cwd(), "integrations/google-sheets/Code.gs"), "utf8")
    script = new vm.Script(src, { filename: "Code.gs" })
  }
  return script
}

export function load(file: string): State {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) } catch { return { sheets: {}, props: {}, files: {} } }
}
function save(file: string, s: State) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(s))
  fs.renameSync(tmp, file)
}

/** Fakes of SpreadsheetApp / DriveApp / … that read and write `state`. */
export function fakeServices(state: State, secret?: string) {
  if (secret !== undefined) state.props.WEBHOOK_SECRET = secret

  const makeSheet = (name: string) => {
    const g = () => (state.sheets[name] ||= [])
    const lastRow = () => g().length
    const lastCol = () => g().reduce((m, r) => Math.max(m, r.length), 0)
    const range = (r: number, c: number, nr = 1, nc = 1) => {
      const api: any = {
        getValues: () => Array.from({ length: nr }, (_, i) =>
          Array.from({ length: nc }, (_, j) => g()[r - 1 + i]?.[c - 1 + j] ?? "")),
        setValues(v: Cell[][]) {
          v.forEach((row, i) => row.forEach((x, j) => {
            const grid = g()
            while (grid.length < r + i) grid.push([])
            // like Sheets: a leading apostrophe forces text and is not stored
            grid[r - 1 + i][c - 1 + j] = typeof x === "string" && x.startsWith("'") ? x.slice(1) : x
          }))
          return api
        },
        setValue(x: Cell) { return api.setValues([[x]]) },
        setFontWeight: () => api, setNumberFormat: () => api, setDataValidation: () => api,
      }
      return api
    }
    return {
      getLastRow: lastRow, getLastColumn: lastCol, getMaxRows: () => 1000, setFrozenRows() {},
      getRange: range,
      deleteRow(r: number) { g().splice(r - 1, 1) },
    }
  }

  const sheetObjs: Record<string, any> = {}
  const getSheet = (n: string) => (sheetObjs[n] ||= makeSheet(n))
  const blob = (bytes: Buffer, mimeType: string, name: string) => ({
    getBytes: () => bytes, getContentType: () => mimeType, getName: () => name,
  })

  const folder = {
    getId: () => "emulator-folder",
    createFile(b: any) {
      const id = randomUUID()
      state.files[id] = { name: b.getName(), mimeType: b.getContentType(), base64: Buffer.from(b.getBytes()).toString("base64") }
      return { getId: () => id }
    },
  }

  return {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n: string) => (state.sheets[n] ? getSheet(n) : null),
        insertSheet: (n: string) => { state.sheets[n] ||= []; return getSheet(n) },
      }),
      newDataValidation: () => {
        const b: any = { requireValueInList: () => b, setAllowInvalid: () => b, build: () => ({}) }
        return b
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => state.props[k] ?? null,
        setProperty: (k: string, v: string) => { state.props[k] = v },
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    // expiry is ignored in the emulator; tests reset the file instead
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => (state.cache ||= {})[k] ?? null,
        put: (k: string, v: string) => { (state.cache ||= {})[k] = v },
        remove: (k: string) => { delete (state.cache ||= {})[k] },
      }),
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (s: string) => ({ setMimeType: () => s }),
    },
    Logger: { log: (..._a: unknown[]) => {} },
    Utilities: {
      getUuid: () => randomUUID(),
      base64Decode: (s: string) => Buffer.from(s, "base64"),
      base64Encode: (b: Buffer) => Buffer.from(b).toString("base64"),
      newBlob: (bytes: Buffer, mimeType: string, name: string) => blob(Buffer.from(bytes), mimeType, name),
    },
    DriveApp: {
      createFolder: () => folder,
      getFolderById: () => folder,
      getFileById(id: string) {
        const f = state.files[id]
        if (!f) throw new Error("File not found")
        return { getBlob: () => blob(Buffer.from(f.base64, "base64"), f.mimeType, f.name) }
      },
    },
  }
}

/** Run one request through Code.gs's doPost and return its JSON reply. */
export function emulatorPost(file: string, secret: string, body: unknown): any {
  const state = load(file)
  const ctx = vm.createContext({ ...fakeServices(state, secret), console })
  compiled().runInContext(ctx)
  const out = ctx.doPost({ postData: { contents: JSON.stringify(body) } }) as string
  save(file, state)
  return JSON.parse(out)
}
