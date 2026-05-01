"use client"

import Link from 'next/link'
import { useState } from 'react'

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<'TH' | 'EN'>('TH')

  const content = {
    TH: {
      title: "นโยบายความเป็นส่วนตัว (Privacy Policy)",
      lastUpdated: "อัปเดตล่าสุด: 1 พฤษภาคม 2026",
      sections: [
        {
          title: "1. ข้อมูลที่เราเก็บรวบรวม",
          body: "เรารวบรวมข้อมูลส่วนบุคคลที่คุณให้เราโดยตรง เช่น ชื่อ, อีเมล, หมายเลขโทรศัพท์, ที่อยู่จัดส่ง และไฟล์ 3D (STL/3MF) เมื่อคุณใช้บริการของเราหรือติดต่อเรา"
        },
        {
          title: "2. วัตถุประสงค์ในการใช้ข้อมูล",
          body: "เราใช้ข้อมูลของคุณเพื่อ:\n- ประมวลผลและจัดส่งคำสั่งซื้อ 3D Printing ของคุณ\n- คำนวณราคาและประเมินความเป็นไปได้ของชิ้นงาน\n- ติดต่อสื่อสารเกี่ยวกับสถานะคำสั่งซื้อ\n- ปรับปรุงบริการและประสบการณ์ผู้ใช้"
        },
        {
          title: "3. ระยะเวลาการเก็บรักษา (Retention Period)",
          body: "เราเก็บรักษาข้อมูลส่วนบุคคลของคุณตราบเท่าที่จำเป็นเพื่อให้บรรลุวัตถุประสงค์ที่ระบุไว้ ไฟล์ 3D ที่อัปโหลดจะถูกลบโดยอัตโนมัติภายใน 30 วันหลังจากคำสั่งซื้อเสร็จสมบูรณ์เพื่อความปลอดภัยของทรัพย์สินทางปัญญาของคุณ"
        },
        {
          title: "4. สิทธิ์ของเจ้าของข้อมูล (Data Subject Rights)",
          body: "ภายใต้กฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA) คุณมีสิทธิ์ในการ:\n- ขอเข้าถึงและรับสำเนาข้อมูลของคุณ\n- ขอให้แก้ไขข้อมูลที่ไม่ถูกต้อง\n- ขอให้ลบหรือทำลายข้อมูล (Right to be Forgotten)\n- คัดค้านการประมวลผลข้อมูล"
        },
        {
          title: "5. การติดต่อเรา (Contact & DPO)",
          body: "หากคุณมีคำถามเกี่ยวกับนโยบายนี้ หรือต้องการใช้สิทธิ์ของคุณ กรุณาติดต่อ เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) ของเราที่:\nอีเมล: privacy@pb3dprinting.com\nLine OA: @pb3d"
        }
      ]
    },
    EN: {
      title: "Privacy Policy",
      lastUpdated: "Last Updated: May 1, 2026",
      sections: [
        {
          title: "1. Information We Collect",
          body: "We collect personal information you provide directly to us, such as your name, email, phone number, shipping address, and 3D files (STL/3MF) when you use our services or contact us."
        },
        {
          title: "2. How We Use Your Information",
          body: "We use your information to:\n- Process and deliver your 3D Printing orders\n- Calculate pricing and evaluate printability\n- Communicate regarding order status\n- Improve our services and user experience"
        },
        {
          title: "3. Retention Period",
          body: "We retain your personal data as long as necessary to fulfill the stated purposes. Uploaded 3D files are automatically deleted within 30 days after order completion to ensure the security of your intellectual property."
        },
        {
          title: "4. Data Subject Rights",
          body: "Under the Personal Data Protection Act (PDPA), you have the right to:\n- Access and obtain a copy of your data\n- Request correction of inaccurate data\n- Request deletion or destruction of data (Right to be Forgotten)\n- Object to data processing"
        },
        {
          title: "5. Contact Us (DPO)",
          body: "If you have questions about this policy or wish to exercise your rights, please contact our Data Protection Officer (DPO) at:\nEmail: privacy@pb3dprinting.com\nLine OA: @pb3d"
        }
      ]
    }
  }

  const t = content[lang]

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20 pb-32">
      <nav className="px-8 py-8 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
        <button onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')} className="font-header text-[10px] tracking-[0.4em] uppercase hover:opacity-50 border border-white/10 px-4 py-2 rounded-full">
          {lang === 'TH' ? 'ENGLISH' : 'ภาษาไทย'}
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-16">
        <div className="mb-12">
          <h1 className="font-header text-4xl uppercase tracking-tighter mb-4">{t.title}</h1>
          <p className="font-header text-[10px] tracking-[0.3em] uppercase opacity-40">{t.lastUpdated}</p>
        </div>

        <div className="space-y-12">
          {t.sections.map((section, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-3xl p-8">
              <h2 className="font-header text-xl uppercase tracking-widest text-white mb-6">{section.title}</h2>
              <div className="font-body text-white/60 leading-relaxed space-y-4 whitespace-pre-wrap text-sm">
                {section.body}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
