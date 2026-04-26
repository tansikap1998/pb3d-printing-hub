"use client"

import { useState, useRef, useCallback } from "react"
import type { Technology, Material, InfillLevel, LayerHeight, EstimateResult } from "@/lib/priceCalculator"
import { formatTime } from "@/lib/priceCalculator"

interface ModelInfo {
  name: string; sizeX: number; sizeY: number; sizeZ: number; volumeCm3: number; hasError: boolean
}

const MATERIALS: Material[] = ["PLA", "ABS", "PETG", "ASA", "TPU", "Resin Standard"]
const LAYERS: LayerHeight[] = [0.12, 0.16, 0.20, 0.28]
const COLORS = ["#ffffff","#111111","#e53e3e","#3182ce","#38a169","#d69e2e","#9f7aea","#ed64a6"]

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

function ResultItem({ label,value,accent }: { label:string;value:string;accent?:boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={"text-lg font-bold "+(accent?"text-violet-600":"text-gray-800")}>{value}</p>
    </div>
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

  const handleFile=useCallback(async(file:File)=>{
    const buf=await file.arrayBuffer(); const parsed=parseSTLVolume(buf)
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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-[#1e1e2e] h-14 flex items-center justify-between px-6 sticky top-0 z-50 shadow-lg">
        <span className="text-white font-bold text-lg">PB<span className="text-violet-400">3D</span> Printing Hub</span>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">EN / <b className="text-white">TH</b></span>
          <button className="border border-gray-600 text-gray-300 px-3 py-1 rounded-lg text-sm">Logout</button>
        </div>
      </nav>
      <div className="grid grid-cols-[300px_1fr_320px] gap-4 max-w-[1400px] mx-auto p-4 pb-28 min-h-[calc(100vh-56px)]">
        <div className="bg-white rounded-2xl shadow-sm overflow-y-auto max-h-[calc(100vh-88px)] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-base">Print Settings</h2>
          </div>
          <Section title="Dimensions">
            {model ? (
              <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2 items-center mt-3">
                <span className="text-xs text-gray-500">Size (mm)</span>
                <span className="text-xs font-bold text-center text-red-500">X</span>
                <span className="text-xs font-bold text-center text-green-600">Y</span>
                <span className="text-xs font-bold text-center text-blue-600">Z</span>
                <div/>
                {[model.sizeX,model.sizeY,model.sizeZ].map((v,i)=>(
                  <input key={i} readOnly value={v} className="border border-gray-200 rounded-lg py-1.5 text-xs text-center bg-gray-50 w-full"/>
                ))}
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
          <div className="p-5 mt-auto">
            {result && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4 space-y-3">
                <ResultItem label="เวลาพิมพ์" value={formatTime(result.printTimeMin)}/>
                <ResultItem label="น้ำหนัก" value={result.weightG+" g"}/>
                <ResultItem label="ราคารวม" value={result.totalPrice+" THB"} accent/>
              </div>
            )}
            <button onClick={handleEstimate} disabled={!model||loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-violet-600 to-purple-500 shadow-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition">
              {loading?"⏳ กำลังคำนวณ...":result?"ประเมินราคาแล้ว ✓":"ประเมินราคา →"}
            </button>
          </div>
        </div>
        <div className="bg-[#1a1a2e] rounded-2xl flex flex-col items-center justify-center relative min-h-[460px] shadow-xl overflow-hidden">
          {model ? (
            <>
              <p className="absolute top-4 text-gray-400 text-sm">{model.name}</p>
              <div style={{width:180,height:90,background:"linear-gradient(135deg,#c8c8d8,#8888a8)",borderRadius:4,transform:"perspective(500px) rotateX(20deg) rotateY(-30deg)",boxShadow:"6px 6px 0 #7070a0,12px 12px 20px rgba(0,0,0,.5)"}} className="model-float"/>
              <div className="absolute bottom-5 left-5 text-xs font-bold leading-6">
                <div className="text-blue-400">Z ↑</div><div className="text-green-400">Y →</div><div className="text-red-400">X ↗</div>
              </div>
            </>
          ) : (
            <div onDragOver={e=>{e.preventDefault();setIsDragging(true)}} onDragLeave={()=>setIsDragging(false)} onDrop={onDrop}
              onClick={()=>fileRef.current?.click()}
              className={"flex flex-col items-center justify-center w-full h-full cursor-pointer "+(isDragging?"bg-violet-900/30":"")}>
              <div className="text-6xl mb-5">📦</div>
              <p className="text-white font-semibold text-xl mb-2">อัปโหลดไฟล์ 3D</p>
              <p className="text-gray-400 text-sm">รองรับ .stl ขนาดไม่เกิน 100 MB</p>
              <input ref={fileRef} type="file" accept=".stl" onChange={onFileChange} className="hidden"/>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-y-auto max-h-[calc(100vh-88px)] flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-bold text-base">Models</h2></div>
          <div className="p-4 flex flex-col gap-3">
            <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:bg-gray-50 transition">
              <div className="text-2xl text-gray-300 mb-1">＋</div>
              <p className="text-xs text-gray-400">Click or drag and drop to add a model</p>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] z-50 px-8 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-500 space-y-0.5">
          <div className="text-amber-500 font-semibold text-xs">🕐 คิวก่อนหน้า: ~3 days</div>
          {result && <div>เวลาพิมพ์: <b className="text-gray-800">{formatTime(result.printTimeMin)}</b></div>}
        </div>
        <div className="text-2xl font-black text-gray-900">{result?result.totalPrice+" THB":"– THB"}</div>
        <div className="flex gap-3">
          <button disabled={!result} className="px-5 py-2.5 border-2 border-gray-800 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-gray-50 transition">ขอใบเสนอราคา</button>
          <button disabled={!result} className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-30 hover:opacity-90 transition">ชำระเงิน</button>
        </div>
      </div>
    </div>
  )
            }
