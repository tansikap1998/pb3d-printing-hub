// Tiny stand-in for the Claude Messages API used by the e2e tests (ANTHROPIC_BASE_URL).
// Records each request body to test-results/anthropic-requests.json.
import http from "node:http"
import fs from "node:fs"
import path from "node:path"

const port = Number(process.argv[2] || 3199)
const log = path.join(process.cwd(), "test-results", "anthropic-requests.json")

http.createServer((req, res) => {
  if (req.method === "GET") { res.end("ok"); return }
  let body = ""
  req.on("data", c => (body += c))
  req.on("end", () => {
    const json = JSON.parse(body || "{}")
    fs.mkdirSync(path.dirname(log), { recursive: true })
    const all = fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, "utf8")) : []
    all.push({ url: req.url, headers: { "x-api-key": req.headers["x-api-key"], authorization: req.headers.authorization }, body: json })
    fs.writeFileSync(log, JSON.stringify(all))

    const prompt = JSON.stringify(json.messages ?? [])
    const img = (json.messages?.[0]?.content ?? []).find?.(b => b.type === "image")
    if (img) {
      const notSlicer = Buffer.from(img.source.data, "base64").toString("latin1").includes("NOT-SLICER")
      const read = notSlicer
        ? { found: false, total_grams: null, total_minutes: null, plates: null, note: "" }
        : { found: true, total_grams: 363.58, total_minutes: 668, plates: 7, note: "จากแถว Total" }
      res.setHeader("content-type", "application/json")
      res.end(JSON.stringify({
        id: "msg_mock", type: "message", role: "assistant", model: json.model,
        content: [{ type: "text", text: JSON.stringify(read) }],
        stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 },
      }))
      return
    }
    const refuse = prompt.includes("REFUSE-ME")
    const copy = {
      titles: ["ขาตั้งมือถือรุ่นแมว พิมพ์ 3 มิติ ปรับองศาได้", "ขาตั้งโทรศัพท์ลายแมว ตั้งโต๊ะ", "  ขาตั้งมือถือรุ่นแมว พิมพ์ 3 มิติ ปรับองศาได้  "],
      short_description: "ขาตั้งมือถือน่ารักสำหรับโต๊ะทำงาน",
      description: "วางมือถือได้มั่นคง ดูคลิปสบายตา\n\n\n\nสินค้าพิมพ์ 3 มิติ อาจเห็นเส้นชั้นพิมพ์เล็กน้อย",
      bullet_points: ["- ปรับองศาได้ 3 ระดับ", "วัสดุ PLA"],
      hashtags: ["ขาตั้งมือถือ", "#3D Printing"],
    }
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({
      id: "msg_mock", type: "message", role: "assistant", model: json.model,
      content: refuse ? [] : [{ type: "text", text: JSON.stringify(copy) }],
      stop_reason: refuse ? "refusal" : "end_turn", stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10 },
    }))
  })
}).listen(port)
