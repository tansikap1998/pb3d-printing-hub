"use client"

import { useState, useRef, useCallback, useEffect, useMemo, Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Center, Environment, ContactShadows } from "@react-three/drei"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import type { Technology, Material, InfillLevel, LayerHeight, EstimateResult } from "@/lib/priceCalculator"
import { formatTime } from "@/lib/priceCalculator"

interface ModelInfo {
  name: string; sizeX: number; sizeY: number; sizeZ: number; volumeCm3: number; hasError: boolean
}

const MATERIALS: Material[] = ["PLA", "ABS", "PETG", "ASA", "TPU", "Resin Standard"]
const LAYERS: LayerHeight[] = [0.12, 0.16, 0.20, 0.28]
const COLORS = ["#ffffff","#111111","#e53e3e","#3182ce","#38a169","#d69e2e","#9f7aea","#ed64a6"]
const PROMPTPAY_NUMBER = "0969163254"
const SHOP_NAME = "PB 3D Printing"

function parseSTLVolume(buffer: ArrayBuffer) {
  try {
    const view = new DataView(buffer)
    const triangleCount = view.getUint32(80, true)
    let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity,volume=0
    for (let i=0;i<triangleCount;i++) {
      const offset=84+i*50; const v: [number,number,number][]=[]
      for (let j=0;j<3;j++) {
        const x=view.getFloat32(offset+12+j*12,true),y=view.getFloat32(offset+16+j*12,true),z=view.getFloat32(offset+20+j*12,true)
        v.push([x,y,z]); minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z)
      }
      volume+=(v[0][0]*(v[1][1]*v[2][2]-v[2][1]*v[1][2])-v[0][1]*(v[1][0]*v[2][2]-v[2][0]*v[1][2])+v[0][2]*(v[1][0]*v[2][1]-v[2][0]*v[1][1]))/6
    }
    return { volume:Math.abs(volume)/1000, sizeX:parseFloat((maxX-minX).toFixed(2)), sizeY:parseFloat((maxY-minY).toFixed(2)), sizeZ:parseFloat((maxZ-minZ).toFixed(2)), hasError:false }
  } catch { return { volume:0,sizeX:0,sizeY:0,sizeZ:0,hasError:true } }
}

function buildPromptPayQR(phone: string, amount: number): string {
  function field(id: string, val: string) { return id + String(val.length).padStart(2,'0') + val }
  let p = phone.replace(/\D/g,'')
  if (p.length===10 && p[0]==='0') p = '0066' + p.slice(1)
  const merchantInfo = field('00','A000000677010111') + field('01',p)
  const raw = field('00','01') + field('01','12') + field('29',merchantInfo) +
    '5303764' + field('54',amount.toFixed(2)) + field('58','TH') +
    field('59',SHOP_NAME.slice(0,25)) + field('60','Bangkok') + '6304'
  function crc16(s: string) {
    let c=0xFFFF
    for(let i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(let j=0;j<8;j++)c=(c&0x8000)?(c<<1)^0x1021:(c<<1)}
    return(c&0xFFFF).toString(16).toUpperCase().padStart(4,'0')
  }
  return raw + crc16(raw)
}

function Section({ title, children }: { title:string; children:React.ReactNode }) {
  const [open,setOpen]=useState(true)
  return (
    <div className="border-b border-gray-100 px-5 py-4">
      <button onClick={()=>setOpen(o=>!o)} className="flex items-center justify-between w-full">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <span className="text-gray-400 text-xs">{open?"▲":"▼"}</span>
      </button>
      {open && children}
    </div>
  )
}

function ModelRenderer({ buffer, color }: { buffer: ArrayBuffer, color: string }) {
  const geometry = useMemo(() => {
    const loader = new STLLoader()
    return loader.parse(buffer)
  }, [buffer])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
    </mesh>
  )
}

export default function UploadPage() {
  const [model,setModel]=useState<ModelInfo|null>(null)
  const [technology,setTechnology]=useState<Technology>("FDM")
  const [material,setMaterial]=useState<Material>("PLA")
  const [color,setColor]=useState("#ffffff")
  const [infill,setInfill]=useState<InfillLevel>(25)
  const [layerHeight,setLayerHeight]=useState<LayerHeight>(0.16)
  const [quantity,setQuantity]=useState(1)
  const [result,setResult]=useState<EstimateResult|null>(null)
  const [loading,setLoading]=useState(false)
  const [isDragging,setIsDragging]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)

  // Customer info
  const [custEmail,setCustEmail]=useState("")
  const [custName,setCustName]=useState("")
  const [custPhone,setCustPhone]=useState("")
  const [custAddr,setCustAddr]=useState("")
  const [notes,setNotes]=useState("")
  const [showInfoModal,setShowInfoModal]=useState(false)

  // QR Payment
  const [showQR,setShowQR]=useState(false)
  const [orderNum,setOrderNum]=useState("")

  // Success
  const [showSuccess,setShowSuccess]=useState(false)
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)

  const handleFile=useCallback(async(file:File)=>{
    const buf=await file.arrayBuffer()
    setFileBuffer(buf)
    const parsed=parseSTLVolume(buf)
    setModel({name:file.name,sizeX:parsed.sizeX,sizeY:parsed.sizeY,sizeZ:parsed.sizeZ,volumeCm3:parsed.volume,hasError:parsed.hasError})
    setResult(null)
  },[])

  const onFileChange=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(f)handleFile(f)}
  const onDrop=(e:React.DragEvent)=>{e.preventDefault();setIsDragging(false);const f=e.dataTransfer.files?.[0];if(f)handleFile(f)}

  const handleEstimate=async()=>{
    if(!model)return; setLoading(true)
    try {
      const res=await fetch("/api/estimate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({volumeCm3:model.volumeCm3,technology,material,infill,layerHeight,quantity})})
      setResult(await res.json())
    } finally{setLoading(false)}
  }

  const infillLabels:{[K in InfillLevel]:string}={10:"เบา",25:"ปกติ",50:"แข็งแรง",80:"แข็งแรงมาก"}

  const handleCheckout = () => {
    if (!result || !model) return
    setShowInfoModal(true)
  }

  const handleConfirmOrder = async () => {
    if (!custEmail || !custName || !custPhone || !custAddr) return
    const num = 'PB3D-' + Date.now().toString(36).toUpperCase()
    setOrderNum(num)

    const order = {
      id: num, createdAt: new Date().toISOString(), status: 'pending',
      customer: { name: custName, email: custEmail, phone: custPhone, address: custAddr },
      items: { fileName: model?.name, material, technology, color, infill, layerHeight, quantity, notes },
      pricing: { total: result?.totalPrice, weightG: result?.weightG, printTimeMin: result?.printTimeMin },
      delivery: { trackingNumber: null }
    }

    // Save to localStorage (shared with admin via key)
    try {
      const existing = JSON.parse(localStorage.getItem('pb3d_orders') || '[]')
      existing.unshift(order)
      localStorage.setItem('pb3d_orders', JSON.stringify(existing))
    } catch(e) {}

    // Send email via mailto
    const subject = `[PB3D] คำสั่งซื้อ ${num} — ${custName}`
    const body = `คำสั่งซื้อใหม่\n\nORDER: ${num}\nวันที่: ${new Date().toLocaleString('th-TH')}\n\n📂 ไฟล์: ${model?.name}\n⚙️ วัสดุ: ${material} | ${technology}\n🎨 สี: ${color}\n📐 Layer: ${layerHeight}mm | Infill: ${infill}%\n🔢 จำนวน: ${quantity} ชิ้น\n\n💰 ราคารวม: ${result?.totalPrice} THB\n⏱ เวลาพิมพ์: ${formatTime(result?.printTimeMin||0)}\n⚖️ น้ำหนัก: ${result?.weightG}g\n\n👤 ${custName}\n📧 ${custEmail}\n📞 ${custPhone}\n📍 ${custAddr}\n\n💬 หมายเหตุ: ${notes||'—'}`

    window.location.href = `mailto:order@pb3dprint.com?cc=${encodeURIComponent(custEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    setShowInfoModal(false)
    setShowQR(true)
  }

  const handlePaymentDone = () => {
    setShowQR(false)
    setShowSuccess(true)
  }

  const totalAmount = result?.totalPrice || 0
  const qrPayload = showQR ? buildPromptPayQR(PROMPTPAY_NUMBER, totalAmount) : ''
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`

  const formReady = custEmail && custName && custPhone && custAddr

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-[#1e1e2e] h-14 flex items-center justify-between px-6 sticky top-0 z-50 shadow-lg">
        <a href="/" className="text-white font-bold text-lg">PB<span className="text-violet-400">3D</span> Printing Hub</a>
        <div className="flex items-center gap-3">
          <a href="/admin" className="border border-gray-600 text-gray-300 px-3 py-1 rounded-lg text-sm hover:border-violet-400 hover:text-violet-300 transition">Admin ⚙️</a>
        </div>
      </nav>

      <div className="grid grid-cols-[300px_1fr_320px] gap-4 max-w-[1400px] mx-auto p-4 pb-28 min-h-[calc(100vh-56px)]">

        {/* LEFT — Print Settings */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-fit max-h-[calc(100vh-180px)] sticky top-[72px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="font-bold text-base">Print Settings</h2>
          </div>
          <div className="overflow-y-auto flex-1 pb-10 custom-scrollbar">
            <Section title="Dimensions">
              {model ? (
                <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2 items-center mt-3">
                  <span className="text-xs text-gray-400 font-bold">Size (mm)</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-red-500 mb-1">X</span>
                    <input readOnly value={model.sizeX} className="border border-gray-100 rounded-lg py-1.5 text-xs text-center bg-gray-50 w-full font-mono"/>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-green-600 mb-1">Y</span>
                    <input readOnly value={model.sizeY} className="border border-gray-100 rounded-lg py-1.5 text-xs text-center bg-gray-50 w-full font-mono"/>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-blue-600 mb-1">Z</span>
                    <input readOnly value={model.sizeZ} className="border border-gray-100 rounded-lg py-1.5 text-xs text-center bg-gray-50 w-full font-mono"/>
                  </div>
                </div>
              ) : <p className="text-xs text-gray-400 mt-3 italic">อัปโหลดไฟล์เพื่อดูขนาด</p>}
            </Section>
          <Section title="Technology">
            <div className="flex gap-2 mt-3">
              {(["FDM","RESIN"] as Technology[]).map(t=>(
                <button key={t} onClick={()=>setTechnology(t)}
                  className={"px-5 py-1.5 rounded-full text-sm font-semibold border-2 transition "+(technology===t?(t==="FDM"?"border-green-500 text-green-700 bg-green-50":"border-violet-500 text-violet-700 bg-violet-50"):"border-gray-200 text-gray-500 bg-white")}>
                  {t}
                </button>
              ))}
            </div>
          </Section>
          <Section title="Material">
            <div className="flex justify-end mt-3">
              <select value={material} onChange={e=>setMaterial(e.target.value as Material)}
                className="border-[1.5px] border-gray-200 rounded-full px-4 py-1.5 text-sm font-semibold bg-gray-50 cursor-pointer focus:outline-none">
                {MATERIALS.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </Section>
          <Section title="Color">
            <div className="flex gap-2 mt-3 flex-wrap">
              {COLORS.map(c=>(
                <button key={c} onClick={()=>setColor(c)} style={{background:c,border:color===c?"2.5px solid #7c6af7":"2px solid #e0e0e0",transform:color===c?"scale(1.25)":"scale(1)",transition:"all .15s"}} className="w-6 h-6 rounded-full"/>
              ))}
            </div>
          </Section>
          <Section title="Infill">
            <div className="grid grid-cols-2 gap-2 mt-3">
              {([10,25,50,80] as InfillLevel[]).map(pct=>(
                <button key={pct} onClick={()=>setInfill(pct)}
                  className={"py-2 rounded-xl text-xs font-medium border-[1.5px] transition "+(infill===pct?"border-violet-500 bg-violet-50 text-violet-800 font-bold":"border-gray-200 bg-gray-50 text-gray-500")}>
                  {infillLabels[pct]} ({pct}%)
                </button>
              ))}
            </div>
          </Section>
          <Section title="Layer Height">
            <div className="flex justify-end mt-3">
              <select value={layerHeight} onChange={e=>setLayerHeight(Number(e.target.value) as LayerHeight)}
                className="border-[1.5px] border-gray-200 rounded-full px-4 py-1.5 text-sm font-semibold bg-gray-50 cursor-pointer focus:outline-none">
                {LAYERS.map(l=><option key={l} value={l}>{l} mm</option>)}
              </select>
            </div>
          </Section>
            <Section title="หมายเหตุ">
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
                className="mt-3 w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-violet-400"
                placeholder="รายละเอียดพิเศษ เช่น สีที่ต้องการ..."/>
            </Section>
          </div>
          
          <div className="p-5 border-t border-gray-50 bg-white rounded-b-2xl flex-shrink-0">
            {result && (
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-3 space-y-2">
                <div className="flex justify-between items-center"><span className="text-[10px] text-gray-500">เวลาพิมพ์</span><span className="text-sm font-bold text-gray-800">{formatTime(result.printTimeMin)}</span></div>
                <div className="flex justify-between items-center"><span className="text-[10px] text-gray-500">น้ำหนัก</span><span className="text-sm font-bold text-gray-800">{result.weightG} g</span></div>
              </div>
            )}
            <button onClick={handleEstimate} disabled={!model||loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-violet-600 to-purple-500 shadow-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition">
              {loading?"⏳ กำลังคำนวณ...":result?"ประเมินราคาใหม่":"ประเมินราคา →"}
            </button>
          </div>
        </div>
        </div>

        {/* CENTER — 3D Preview */}
        <div className="bg-[#121218] rounded-2xl flex flex-col items-center justify-center relative min-h-[460px] shadow-xl overflow-hidden group">
          {model && fileBuffer ? (
            <>
              <div className="absolute top-4 left-6 z-10 flex flex-col gap-1">
                <p className="text-white/90 font-bold text-sm tracking-wide">{model.name}</p>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-white/50 border border-white/5 uppercase">{technology}</span>
                  <span className="px-2 py-0.5 bg-violet-500/20 rounded text-[10px] text-violet-300 border border-violet-500/20">{material}</span>
                </div>
              </div>
              
              <div className="w-full h-full">
                <Canvas shadows camera={{ position: [150, 150, 150], fov: 35 }}>
                  <color attach="background" args={['#121218']} />
                  <ambientLight intensity={0.5} />
                  <spotLight position={[200, 200, 200]} angle={0.15} penumbra={1} intensity={1} castShadow />
                  <pointLight position={[-100, -100, -100]} intensity={0.5} />
                  
                  <Suspense fallback={null}>
                    <Center top>
                      <ModelRenderer buffer={fileBuffer} color={color} />
                    </Center>
                    <Environment preset="city" />
                    <ContactShadows position={[0, -0.5, 0]} opacity={0.4} scale={300} blur={2} far={4.5} />
                  </Suspense>
                  
                  <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
                </Canvas>
              </div>

              <div className="absolute bottom-5 left-5 text-[10px] font-bold space-y-1 opacity-50">
                <div className="flex items-center gap-2"><span className="w-8 h-[1px] bg-blue-400 inline-block"/> <span className="text-blue-400">Z-AXIS</span></div>
                <div className="flex items-center gap-2"><span className="w-8 h-[1px] bg-green-400 inline-block"/> <span className="text-green-400">Y-AXIS</span></div>
                <div className="flex items-center gap-2"><span className="w-8 h-[1px] bg-red-400 inline-block"/> <span className="text-red-400">X-AXIS</span></div>
              </div>
              
              <button onClick={()=>{setModel(null);setFileBuffer(null);setResult(null)}} 
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all flex items-center justify-center border border-white/10">
                ✕
              </button>
            </>
          ) : (
            <div onDragOver={e=>{e.preventDefault();setIsDragging(true)}} onDragLeave={()=>setIsDragging(false)} onDrop={onDrop}
              onClick={()=>fileRef.current?.click()}
              className={"flex flex-col items-center justify-center w-full h-full cursor-pointer "+(isDragging?"bg-violet-900/30":"")}>
              <div className="text-6xl mb-5">📦</div>
              <p className="text-white font-semibold text-xl mb-2">อัปโหลดไฟล์ 3D</p>
              <p className="text-gray-400 text-sm">รองรับ .stl และ .3mf ขนาดไม่เกิน 100 MB</p>
              <input ref={fileRef} type="file" accept=".stl,.3mf" onChange={onFileChange} className="hidden"/>
            </div>
          )}
        </div>

        {/* RIGHT — Models */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-fit max-h-[calc(100vh-180px)] sticky top-[72px]">
          <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0"><h2 className="font-bold text-base">Models List</h2></div>
          <div className="p-4 flex-1 overflow-y-auto pb-10 custom-scrollbar flex flex-col gap-3">
            <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-gray-100 rounded-xl p-5 text-center cursor-pointer hover:bg-gray-50 transition-colors group">
              <div className="text-2xl text-gray-200 mb-1 group-hover:text-violet-300 transition-colors">＋</div>
              <p className="text-[11px] text-gray-400">Click or drag and drop to add</p>
            </div>
            {model && (
              <div className="border-[1.5px] border-violet-400 rounded-xl p-3 bg-violet-50/40">
                <div className="flex gap-3 items-start">
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🧊</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{model.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{model.sizeX} × {model.sizeY} × {model.sizeZ} mm</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{material} · {infill}% · {layerHeight}mm</p>
                  </div>
                  <button onClick={()=>{setModel(null);setResult(null)}} className="text-gray-300 hover:text-red-400 px-1">🗑</button>
                </div>
                <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{technology}</span>
                  {result && <span className="bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full">{result.pricePerPc} THB/pc</span>}
                </div>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button onClick={()=>setQuantity(q=>Math.max(1,q-1))} className="w-7 h-7 rounded-full border-[1.5px] border-gray-200 flex items-center justify-center text-gray-500 hover:border-violet-400 transition">−</button>
                  <span className="font-bold text-sm w-5 text-center">{quantity}</span>
                  <button onClick={()=>setQuantity(q=>q+1)} className="w-7 h-7 rounded-full border-[1.5px] border-gray-200 flex items-center justify-center text-gray-500 hover:border-violet-400 transition">＋</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] z-50 px-8 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-500 space-y-0.5">
          <div className="text-amber-500 font-semibold text-xs">🕐 คิวก่อนหน้า: ~3 days</div>
          {result && <div>เวลาพิมพ์: <b className="text-gray-800">{formatTime(result.printTimeMin)}</b></div>}
        </div>
        <div className="text-2xl font-black text-gray-900">{result?result.totalPrice+" THB":"– THB"}</div>
        <div className="flex gap-3">
          <button disabled={!result} className="px-5 py-2.5 border-2 border-gray-800 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-gray-50 transition">ขอใบเสนอราคา</button>
          <button disabled={!result} onClick={handleCheckout}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-30 hover:opacity-90 transition">
            ชำระเงิน
          </button>
        </div>
      </div>

      {/* ── CUSTOMER INFO MODAL ── */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-500 px-6 py-5">
              <h3 className="text-white font-black text-xl">📋 ข้อมูลการสั่งซื้อ</h3>
              <p className="text-violet-200 text-sm mt-1">กรุณากรอกข้อมูลเพื่อยืนยันคำสั่งซื้อ</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">อีเมล *</label>
                <input type="email" value={custEmail} onChange={e=>setCustEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"/>
                <p className="text-xs text-gray-400 mt-1">ใช้รับการยืนยันและติดตามสถานะออเดอร์</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">ชื่อ-นามสกุล *</label>
                  <input type="text" value={custName} onChange={e=>setCustName(e.target.value)}
                    placeholder="สมชาย ใจดี"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">เบอร์โทร *</label>
                  <input type="tel" value={custPhone} onChange={e=>setCustPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">ที่อยู่จัดส่ง *</label>
                <textarea value={custAddr} onChange={e=>setCustAddr(e.target.value)} rows={3}
                  placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400 resize-none"/>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">ยอดชำระ</p>
                  <p className="font-black text-2xl text-violet-600">{result?.totalPrice} THB</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{model?.name}</div>
                  <div>{material} · {quantity} ชิ้น</div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={()=>setShowInfoModal(false)}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                ยกเลิก
              </button>
              <button onClick={handleConfirmOrder} disabled={!formReady}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-40 hover:opacity-90 transition">
                {formReady ? "ยืนยัน & ดูคิวอาร์ →" : "กรอกข้อมูลให้ครบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR PAYMENT MODAL ── */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 z-[210] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#1e1e2e] px-6 py-5 flex justify-between items-center">
              <h3 className="text-white font-black text-lg">💳 ชำระผ่าน PromptPay</h3>
              <button onClick={()=>setShowQR(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-500 text-sm mb-1">ยอดชำระ</p>
              <p className="font-black text-4xl text-violet-600 mb-5">{result?.totalPrice} THB</p>
              <div className="bg-white border-4 border-gray-100 rounded-2xl p-3 inline-block mb-4 shadow-inner">
                <img src={qrUrl} alt="QR PromptPay" className="w-48 h-48"/>
              </div>
              <p className="text-gray-500 text-xs mb-5">PromptPay — {SHOP_NAME} ({PROMPTPAY_NUMBER})</p>
              <div className="space-y-2 mb-6 text-left">
                {["เปิดแอปธนาคารของคุณ","สแกน QR Code ด้านบน","ตรวจสอบยอดและกดยืนยัน","กดปุ่มด้านล่างหลังโอนสำเร็จ"].map((s,i)=>(
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span>
                    {s}
                  </div>
                ))}
              </div>
              <button onClick={handlePaymentDone}
                className="w-full py-4 bg-green-500 hover:bg-green-400 text-white font-black rounded-xl transition text-base">
                ✅ โอนแล้ว — ยืนยันคำสั่งซื้อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {showSuccess && (
        <div className="fixed inset-0 bg-[#0a0a0f]/98 z-[220] flex flex-col items-center justify-center gap-4 text-center p-6">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-400 flex items-center justify-center text-green-400 text-4xl">✓</div>
          <h2 className="font-black text-5xl text-white">สั่งซื้อแล้ว!</h2>
          <p className="text-gray-400 max-w-sm leading-relaxed">คำสั่งซื้อถูกส่งเรียบร้อย ทีมงานจะยืนยันทางอีเมลและอัปเดตสถานะให้</p>
          <div className="bg-[#1e1e2e] border border-white/10 px-6 py-3 rounded-xl font-mono text-violet-300 text-sm tracking-wider">
            ORDER #{orderNum}
          </div>
          <p className="text-gray-500 text-sm">📧 ยืนยันส่งไปที่ {custEmail}</p>
          <div className="flex gap-3 mt-2">
            <a href="/" className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition">กลับหน้าแรก</a>
            <a href={`https://app.chalawan3d.com/login`} target="_blank" rel="noreferrer"
              className="px-8 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-500 transition">
              ติดตามออเดอร์ →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
