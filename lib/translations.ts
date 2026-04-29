export type Language = 'TH' | 'EN';

export const translations = {
  TH: {
    nav: {
      about: "เกี่ยวกับเรา",
      materials: "วัสดุ",
      order: "สั่งพิมพ์เลย",
      start: "เริ่มโปรเจกต์",
    },
    hero: {
      subtitle: "อนาคตของการผลิต",
      title1: "เปลี่ยนดิจิทัล",
      title2: "ให้เป็นชิ้นงานจริง",
      desc: "เราเชื่อมโยงจินตนาการของคุณสู่โลกความเป็นจริงด้วยการพิมพ์ 3 มิติระดับอุตสาหกรรม รวดเร็ว แม่นยำ และเป็นระบบดิจิทัล 100%",
      status: "สถานะระบบ",
      online: "ออนไลน์ — จัดส่งใน 48 ชม.",
    },
    materials: {
      title: "คัดสรรวัสดุ.",
      subtitle: "รายการที่ 01 — พลาสติกวิศวกรรม",
      details: "รายละเอียดวัสดุ",
      suitable: "เหมาะสำหรับ",
      properties: "คุณสมบัติเด่น",
      cta: "สั่งพิมพ์ด้วยวัสดุนี้เลย",
      items: {
        PLA: {
          details: "วัสดุมาตรฐานที่ผิวเนียนและละเอียดที่สุด ให้สีสันสดใสคล้ายพลาสติกของเล่นเกรดพรีเมียม พิมพ์ง่ายและไม่บิดรูป เหมาะสำหรับงานโชว์รายละเอียด",
          bestFor: "โมเดลตั้งโชว์, ฟิกเกอร์, งานศิลปะ, ต้นแบบที่เน้นความสวยงาม",
        },
        PETG: {
          details: "ส่วนผสมที่ลงตัวระหว่างความแข็งของ PLA และความเหนียวของ ABS ผิวเงางาม ทนแดดทนฝน และกันน้ำได้ดีเยี่ยม เหมือนพลาสติกขวดน้ำที่แข็งแรงพิเศษ",
          bestFor: "อุปกรณ์ในสวน, ขาตั้งกล้อง, ชิ้นส่วนที่ต้องโดนน้ำหรือใช้งานกลางแจ้ง",
        },
        CarbonFiber: {
          details: "พลาสติกผสมเส้นใยคาร์บอนแท้ ให้ผิวสัมผัส 'ดำด้าน' ที่หรูหราและสากมือ แข็งแกร่งสูงมาก ไม่บิดงอเมื่อรับแรงกด เหมาะสำหรับงานที่ต้องการความเท่และดุดัน",
          bestFor: "โดรนแข่ง, อะไหล่รถยนต์, อุปกรณ์ที่ต้องการความแข็งแรงและน้ำหนักเบา",
        },
        Nylon: {
          details: "ราชาแห่งความเหนียวและลื่น ทนแรงเสียดสีได้ดีเยี่ยม ไม่แตกหักง่ายเมื่อถูกกระแทกแรงๆ ผิวสัมผัสกึ่งเงาเหมือนพลาสติกวิศวกรรมในเครื่องจักร",
          bestFor: "เฟืองเกียร์, ข้อต่อที่ต้องขยับบ่อย, บูชรองล้อ, อุปกรณ์รับแรงกระแทกสูง",
        }
      }
    },
    upload: {
      title: "อัปโหลดไฟล์ 3D",
      settings: "การตั้งค่าการพิมพ์",
      dimensions: "ขนาดชิ้นงาน",
      technology: "เทคโนโลยี",
      material: "วัสดุ",
      detail: "รายละเอียด & อินฟิล",
      layer: "ความหนาชั้น",
      infill: "ความหนาแน่น",
      color: "สี",
      notes: "หมายเหตุ",
      estimate: "ประเมินราคา",
      calculating: "กำลังคำนวณ...",
      reestimate: "ประเมินราคาใหม่",
      summary: "สรุปรายการ",
      total: "ยอดรวม",
      checkout: "ชำระเงิน",
      anyColor: "ตามใจร้าน (ลด ฿2/g)",
    }
  },
  EN: {
    nav: {
      about: "About",
      materials: "Materials",
      order: "Order Now",
      start: "Start Project",
    },
    hero: {
      subtitle: "Future of Manufacturing",
      title1: "Digital",
      title2: "into Physical",
      desc: "We bridge the gap between imagination and reality with industrial-grade 3D additive manufacturing. Fast, precise, and purely digital.",
      status: "System Status",
      online: "Online — 48H Delivery",
    },
    materials: {
      title: "Material Curated.",
      subtitle: "Selection 01 — Engineering Plastics",
      details: "Material Insight",
      suitable: "Best For",
      properties: "Technical Properties",
      cta: "Order with this material",
      items: {
        PLA: {
          details: "The gold standard for detail. Provides a smooth, matte-to-semi-gloss finish similar to high-grade injection molded plastic. It's rigid and retains dimensions perfectly.",
          bestFor: "Display models, tabletop miniatures, architectural mockups, and aesthetic prototypes.",
        },
        PETG: {
          details: "The perfect hybrid of strength and ease. It offers the durability of industrial plastics with a glossy finish. Highly resistant to water and chemicals, like a heavy-duty water bottle.",
          bestFor: "Functional outdoor gear, mechanical brackets, and waterproof containers.",
        },
        CarbonFiber: {
          details: "Infused with genuine carbon fibers, this material delivers a stunning 'Matte Black' finish. It is exceptionally rigid and won't flex under pressure, perfect for high-tech aesthetics.",
          bestFor: "Drone frames, automotive interior parts, and ultra-light structural components.",
        },
        Nylon: {
          details: "The king of durability. Known for its incredible toughness and low-friction properties. It can withstand heavy impacts and repeated mechanical stress without cracking.",
          bestFor: "Gears, sliding bushings, snap-fit joints, and heavy-duty mechanical assemblies.",
        }
      }
    },
    upload: {
      title: "Upload 3D File",
      settings: "Print Settings",
      dimensions: "Dimensions",
      technology: "Technology",
      material: "Material",
      detail: "Detail & Infill",
      layer: "Layer Height",
      infill: "Infill Density",
      color: "Color",
      notes: "Notes",
      estimate: "Estimate Price",
      calculating: "Calculating...",
      reestimate: "Re-estimate",
      summary: "Models List",
      total: "Total Amount",
      checkout: "Checkout",
      anyColor: "AnyColor (Discount ฿2/g)",
    }
  }
};
