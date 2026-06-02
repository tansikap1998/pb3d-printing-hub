"use client" 

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { translations, Language } from '@/lib/translations'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Globe, Menu, X, Star, Zap, Shield, Clock, Package, ExternalLink } from 'lucide-react'

// Particle Background
const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationFrameId: number
    let particles: Particle[] = []
    const mouse = { x: 0, y: 0 }
    
    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      
      constructor(c: HTMLCanvasElement) {
        this.x = Math.random() * c.width
        this.y = Math.random() * c.height
        this.size = Math.random() * 1.2 + 0.3
        this.speedX = Math.random() * 0.2 - 0.1
        this.speedY = Math.random() * 0.2 - 0.1
        this.opacity = Math.random() * 0.15 + 0.05
      }
      
      update(c: HTMLCanvasElement) {
        this.x += this.speedX
        this.y += this.speedY
        if (this.x > c.width) this.x = 0
        else if (this.x < 0) this.x = c.width
        if (this.y > c.height) this.y = 0
        else if (this.y < 0) this.y = c.height
        
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 150) {
          this.x -= dx * 0.008
          this.y -= dy * 0.008
        }
      }
      
      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    
    const init = () => {
      particles = []
      for (let i = 0; i < 80; i++) {
        particles.push(new Particle(canvas))
      }
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.update(canvas)
        p.draw(ctx)
      })
      animationFrameId = requestAnimationFrame(animate)
    }
    
    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    })
    
    handleResize()
    init()
    animate()
    
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])
  
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

// Feature Card Component
const FeatureCard = ({ step, title, description, icon: Icon }: { step: string, title: string, description: string, icon: React.ElementType }) => (
  <motion.div 
    className="group relative p-8 rounded-2xl premium-card overflow-hidden"
    whileHover={{ y: -4 }}
    transition={{ duration: 0.2 }}
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-muted/30 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-medium text-muted-foreground tracking-widest">{step}</span>
        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <h3 className="text-lg font-semibold mb-3 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </motion.div>
)

// Material Card Component  
const MaterialCard = ({ material, isSelected, onClick, index }: { 
  material: { id: string, name: string, desc: string, price: string }, 
  isSelected: boolean, 
  onClick: () => void,
  index: number 
}) => (
  <motion.button
    onClick={onClick}
    className={`group relative p-6 rounded-xl border text-left transition-all duration-300 ${
      isSelected 
        ? 'bg-foreground text-background border-foreground' 
        : 'bg-card border-border hover:border-muted-foreground/50'
    }`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-start justify-between mb-4">
      <span className={`text-xs font-mono ${isSelected ? 'text-background/60' : 'text-muted-foreground'}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className={`text-xs font-medium ${isSelected ? 'text-background/80' : 'text-muted-foreground'}`}>
        {material.price}
      </span>
    </div>
    <h4 className="text-lg font-semibold mb-1 tracking-tight">{material.name}</h4>
    <p className={`text-xs ${isSelected ? 'text-background/70' : 'text-muted-foreground'}`}>{material.desc}</p>
  </motion.button>
)

// Review Card Component
const ReviewCard = ({ review, rating = 5 }: { review: string, rating?: number }) => (
  <div className="bg-card border border-border rounded-2xl p-8 hover:border-muted-foreground/30 transition-colors">
    <div className="flex gap-1 mb-4">
      {[...Array(rating)].map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-warning text-warning" />
      ))}
    </div>
    <p className="text-muted-foreground leading-relaxed font-serif italic text-lg">&ldquo;{review}&rdquo;</p>
  </div>
)

export default function Home() {
  const [lang, setLang] = useState<Language>('TH')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showFindFiles, setShowFindFiles] = useState(false)
  const [selectedMat, setSelectedMat] = useState<string>('PLA')
  const [scrolled, setScrolled] = useState(false)
  
  const t = translations[lang]
  const tTH = translations['TH']

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const MATERIALS = [
    { id: 'PLA', name: 'PLA', desc: lang === 'TH' ? 'มาตรฐาน · แม่นยำสูง' : 'Standard · High Detail', price: '฿3/g', details: tTH.materials.items.PLA.details, bestFor: tTH.materials.items.PLA.bestFor },
    { id: 'PETG', name: 'PETG', desc: lang === 'TH' ? 'ทนทาน · กันน้ำ' : 'Durable · Waterproof', price: '฿4/g', details: tTH.materials.items.PETG.details, bestFor: tTH.materials.items.PETG.bestFor },
    { id: 'ABS', name: 'ABS', desc: lang === 'TH' ? 'ทนร้อน · เหนียว' : 'Heat Resistant', price: '฿4/g', details: tTH.materials.items.ABS.details, bestFor: tTH.materials.items.ABS.bestFor },
    { id: 'ASA', name: 'ASA', desc: lang === 'TH' ? 'ทน UV · กลางแจ้ง' : 'UV Resistant', price: '฿5/g', details: tTH.materials.items.ASA.details, bestFor: tTH.materials.items.ASA.bestFor },
    { id: 'TPU', name: 'TPU', desc: lang === 'TH' ? 'ยืดหยุ่น · นุ่ม' : 'Flexible', price: '฿6/g', details: tTH.materials.items.TPU.details, bestFor: tTH.materials.items.TPU.bestFor },
    { id: 'CarbonFiber', name: 'Carbon Fiber', desc: lang === 'TH' ? 'แข็งแรง · น้ำหนักเบา' : 'Strong · Lightweight', price: '฿10/g', details: tTH.materials.items.CarbonFiber.details, bestFor: tTH.materials.items.CarbonFiber.bestFor },
  ]

  const selectedMaterial = MATERIALS.find(m => m.id === selectedMat) || MATERIALS[0]

  const showcaseImages = [
    "/showcase/showcase_1.png",
    "/showcase/showcase_2.png", 
    "/showcase/showcase_3.png",
    "/showcase/showcase_4.png",
    "/showcase/showcase_5.png",
    "/showcase/showcase_6.png",
  ]

  const MODEL_LIBRARIES = [
    { name: "Thingiverse", url: "https://www.thingiverse.com" },
    { name: "Printables", url: "https://www.printables.com" },
    { name: "Cults3D", url: "https://cults3d.com" },
    { name: "MakerWorld", url: "https://makerworld.com" },
    { name: "MyMiniFactory", url: "https://www.myminifactory.com" },
    { name: "Yeggi", url: "https://www.yeggi.com" }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground/10 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">P3</span>
            </div>
            <span className="font-semibold tracking-tight">PB3D Hub</span>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.howItWorks}
            </a>
            <a href="#materials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.materials}
            </a>
            <a href="#showcase" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Showcase
            </a>
            <button 
              onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="w-4 h-4" />
              {lang === 'TH' ? 'EN' : 'TH'}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button 
              onClick={() => setShowFindFiles(true)}
              className="text-sm px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t.hero.ctaSearch}
            </button>
            <Link 
              href="/upload" 
              className="flex items-center gap-2 text-sm px-5 py-2.5 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {t.nav.start}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 -mr-2"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-background border-t border-border"
            >
              <div className="px-6 py-6 space-y-4">
                <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="block text-sm py-2 text-muted-foreground hover:text-foreground">{t.nav.howItWorks}</a>
                <a href="#materials" onClick={() => setIsMenuOpen(false)} className="block text-sm py-2 text-muted-foreground hover:text-foreground">{t.nav.materials}</a>
                <a href="#showcase" onClick={() => setIsMenuOpen(false)} className="block text-sm py-2 text-muted-foreground hover:text-foreground">Showcase</a>
                <button onClick={() => { setLang(lang === 'TH' ? 'EN' : 'TH'); setIsMenuOpen(false); }} className="flex items-center gap-2 text-sm py-2 text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  {lang === 'TH' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
                </button>
                <div className="pt-4 border-t border-border space-y-3">
                  <button onClick={() => { setShowFindFiles(true); setIsMenuOpen(false); }} className="w-full text-sm py-3 border border-border rounded-lg text-muted-foreground">
                    {t.hero.ctaSearch}
                  </button>
                  <Link href="/upload" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 w-full text-sm py-3 bg-foreground text-background rounded-lg font-medium">
                    {t.nav.start}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Find Files Modal */}
      <AnimatePresence>
        {showFindFiles && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowFindFiles(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-card border border-border rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowFindFiles(false)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">{t.findFiles.popular}</h3>
                <p className="text-sm text-muted-foreground">{t.findFiles.subtitle}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {MODEL_LIBRARIES.map(site => (
                  <a 
                    key={site.name}
                    href={site.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-muted-foreground/50 hover:bg-muted/50 transition-all"
                  >
                    <span className="text-sm font-medium">{site.name}</span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border mb-6">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{lang === 'TH' ? 'คำแนะนำ:' : 'Tip:'}</span> {t.findFiles.hint}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-sm text-warning">
                  <span className="font-medium">{t.findFiles.licenseTitle}</span>
                  <br />
                  <span className="opacity-80">{t.findFiles.licenseDesc}</span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col justify-center pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <ParticleBackground />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
            {/* Status Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-success">Online</span>
              </div>
              <span className="text-sm text-muted-foreground">{lang === 'TH' ? 'จัดส่งภายใน 48 ชม.' : 'Ships in 48 hours'}</span>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-6 text-balance">
                {lang === 'TH' ? (
                  <>
                    เปลี่ยนไอเดียของคุณ
                    <br />
                    <span className="text-muted-foreground">ให้เป็นจริง</span>
                  </>
                ) : (
                  <>
                    Transform your ideas
                    <br />
                    <span className="text-muted-foreground">into reality</span>
                  </>
                )}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                {t.hero.desc}
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 mb-16"
            >
              <Link 
                href="/upload"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-foreground text-background rounded-xl font-medium text-lg hover:opacity-90 transition-all glow"
              >
                {t.hero.cta}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button 
                onClick={() => setShowFindFiles(true)}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-border rounded-xl font-medium text-lg hover:bg-muted transition-colors"
              >
                {t.hero.ctaSearch}
              </button>
            </motion.div>

            {/* Trust Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-3 gap-4 max-w-xl"
            >
              <div className="text-center p-4 rounded-xl bg-card border border-border">
                <div className="text-2xl md:text-3xl font-semibold mb-1">4.9</div>
                <div className="text-xs text-muted-foreground">{lang === 'TH' ? 'คะแนนรีวิว' : 'Rating'}</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-card border border-border">
                <div className="text-2xl md:text-3xl font-semibold mb-1">10+</div>
                <div className="text-xs text-muted-foreground">{lang === 'TH' ? 'ปีประสบการณ์' : 'Years'}</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-card border border-border">
                <div className="text-2xl md:text-3xl font-semibold mb-1">1K+</div>
                <div className="text-xs text-muted-foreground">{lang === 'TH' ? 'ลูกค้า' : 'Clients'}</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                {t.howItWorks.title}
              </h2>
              <p className="text-muted-foreground text-lg">
                {t.howItWorks.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FeatureCard 
                step="01"
                title={t.howItWorks.step1Title}
                description={t.howItWorks.step1Desc}
                icon={Package}
              />
              <FeatureCard 
                step="02"
                title={t.howItWorks.step2Title}
                description={t.howItWorks.step2Desc}
                icon={Zap}
              />
              <FeatureCard 
                step="03"
                title={t.howItWorks.step3Title}
                description={t.howItWorks.step3Desc}
                icon={Shield}
              />
              <FeatureCard 
                step="04"
                title={t.howItWorks.step4Title}
                description={t.howItWorks.step4Desc}
                icon={Clock}
              />
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-24 px-6 border-y border-border">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-xs font-medium mb-6">
                  <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                  {lang === 'TH' ? 'รีวิวจริงจาก Shopee' : 'Verified Shopee Reviews'}
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                  {t.shopee.title}
                </h2>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  {t.shopee.desc}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a 
                    href="https://shopee.co.th/shop/9883965" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#EE4D2D] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {t.trust.shopeeCta}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a 
                    href="https://www.facebook.com/share/1JPnWMk3md/?mibextid=wwXIfr" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {t.trust.facebookCta}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="relative h-[500px] overflow-hidden rounded-2xl">
                <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
                <div className="flex flex-col gap-4 animate-marquee-vertical group">
                  {[...t.shopee.reviews, ...t.shopee.reviews].map((review, i) => (
                    <ReviewCard key={i} review={review} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Materials Section */}
        <section id="materials" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                {t.materials.title}
              </h2>
              <p className="text-muted-foreground text-lg">
                {t.materials.subtitle}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MATERIALS.map((m, i) => (
                  <MaterialCard 
                    key={m.id}
                    material={m}
                    isSelected={selectedMat === m.id}
                    onClick={() => setSelectedMat(m.id)}
                    index={i}
                  />
                ))}
              </div>

              <motion.div 
                key={selectedMat}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-card border border-border rounded-2xl p-8 flex flex-col"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-foreground text-background rounded-xl flex items-center justify-center text-xl font-semibold">
                    {selectedMaterial.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold">{selectedMaterial.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedMaterial.price}</p>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{t.materials.details}</h4>
                    <p className="text-muted-foreground leading-relaxed">{selectedMaterial.details}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{t.materials.suitable}</h4>
                    <p className="font-medium">{selectedMaterial.bestFor}</p>
                  </div>
                </div>

                <Link 
                  href="/upload"
                  className="mt-8 flex items-center justify-center gap-2 py-4 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  {t.materials.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Showcase Gallery */}
        <section id="showcase" className="py-24 border-t border-border overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Showcase
            </h2>
            <p className="text-muted-foreground text-lg">
              {lang === 'TH' ? 'ตัวอย่างผลงานที่ผ่านมา' : 'Recent projects from our production'}
            </p>
          </div>

          <div className="w-full overflow-hidden py-8">
            <div className="flex animate-marquee">
              {[...showcaseImages, ...showcaseImages, ...showcaseImages].map((img, i) => (
                <div key={i} className="flex-shrink-0 px-3">
                  <div className="h-[300px] md:h-[400px] w-[400px] md:w-[500px] rounded-2xl overflow-hidden bg-card border border-border group">
                    <img 
                      src={img} 
                      alt={`PB3D Showcase ${(i % showcaseImages.length) + 1}`}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 scale-105 group-hover:scale-100 transition-all duration-700"
                      onError={(e) => { 
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none' 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-8 text-balance">
              {lang === 'TH' ? 'พร้อมเริ่มโปรเจกต์แล้วหรือยัง?' : 'Ready to start your project?'}
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              {lang === 'TH' 
                ? 'อัปโหลดไฟล์ 3D ของคุณและรับใบเสนอราคาทันที' 
                : 'Upload your 3D file and get an instant quote'
              }
            </p>
            <Link 
              href="/upload"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-foreground text-background rounded-xl font-medium text-lg hover:opacity-90 transition-all glow"
            >
              {t.nav.start}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                <span className="text-background font-bold text-sm">P3</span>
              </div>
              <span className="font-semibold tracking-tight">PB3D Hub</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <a href="https://shopee.co.th/shop/9883965" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Shopee</a>
              <a href="https://www.facebook.com/share/1JPnWMk3md/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Facebook</a>
              <a href="https://lin.ee/R8Vd7q5" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LINE</a>
              <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
            </div>

            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} PB3D Hub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* LINE Floating Button */}
      <a 
        href="https://lin.ee/R8Vd7q5" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#00B900] text-white rounded-full font-medium text-sm shadow-lg hover:scale-105 active:scale-95 transition-transform"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
        <span className="hidden sm:inline">{lang === 'TH' ? 'แชทกับเรา' : 'Chat with us'}</span>
      </a>
    </div>
  )
}
