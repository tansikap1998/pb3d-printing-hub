"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, isPlaceholder } from '@/lib/supabase/client'

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieBanner() {
  const [show, setShow] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<ConsentState>({
    necessary: true, // Always true
    analytics: false,
    marketing: false
  })

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem('pb3d_cookie_consent')
    if (!consent) {
      setShow(true)
    }
  }, [])

  const saveConsent = async (state: ConsentState) => {
    localStorage.setItem('pb3d_cookie_consent', JSON.stringify(state))
    setShow(false)

    try {
      if (!isPlaceholder) {
        await supabase.from('consent_logs').insert({
          necessary_accepted: state.necessary,
          analytics_accepted: state.analytics,
          marketing_accepted: state.marketing,
          user_agent: navigator.userAgent
        })
      }
    } catch (e) {
      console.error("Failed to log consent", e)
    }
  }

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, analytics: true, marketing: true })
  }

  const handleRejectAll = () => {
    saveConsent({ necessary: true, analytics: false, marketing: false })
  }

  const handleSavePreferences = () => {
    saveConsent(preferences)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] p-4 md:p-6 animate-in slide-in-from-bottom-full duration-500">
      <div className="max-w-6xl mx-auto bg-[#111] border border-white/10 rounded-[2rem] shadow-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
        
        {!showPreferences ? (
          <>
            <div className="flex-1">
              <h3 className="font-header text-xl uppercase tracking-widest text-white mb-2">🍪 We value your privacy</h3>
              <p className="font-body text-xs text-white/60 leading-relaxed max-w-3xl">
                We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. 
                Read our <Link href="/privacy" className="text-white underline hover:text-white/80">Privacy Policy</Link> for more information.
              </p>
            </div>
            
            <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto shrink-0">
              <button onClick={() => setShowPreferences(true)} className="flex-1 md:flex-none px-6 py-3 border border-white/20 rounded-xl font-header text-[10px] tracking-widest uppercase hover:bg-white/10 transition-colors">
                Preferences
              </button>
              <button onClick={handleRejectAll} className="flex-1 md:flex-none px-6 py-3 border border-white/20 rounded-xl font-header text-[10px] tracking-widest uppercase hover:bg-white/10 transition-colors">
                Reject All
              </button>
              <button onClick={handleAcceptAll} className="flex-1 md:flex-none px-8 py-3 bg-white text-black rounded-xl font-header text-[10px] tracking-widest uppercase hover:bg-white/90 transition-colors">
                Accept All
              </button>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col">
            <h3 className="font-header text-xl uppercase tracking-widest text-white mb-6 border-b border-white/10 pb-4">Cookie Preferences</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="font-header text-sm tracking-widest uppercase">Necessary</h4>
                  <p className="font-body text-[10px] text-white/40 mt-1">Required for the website to function properly.</p>
                </div>
                <div className="w-12 h-6 bg-white/20 rounded-full relative cursor-not-allowed opacity-50">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer" onClick={() => setPreferences(p => ({...p, analytics: !p.analytics}))}>
                <div>
                  <h4 className="font-header text-sm tracking-widest uppercase">Analytics</h4>
                  <p className="font-body text-[10px] text-white/40 mt-1">Help us understand how visitors interact with the site.</p>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${preferences.analytics ? 'bg-white' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 bg-black rounded-full absolute top-1 transition-transform ${preferences.analytics ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer" onClick={() => setPreferences(p => ({...p, marketing: !p.marketing}))}>
                <div>
                  <h4 className="font-header text-sm tracking-widest uppercase">Marketing</h4>
                  <p className="font-body text-[10px] text-white/40 mt-1">Used to deliver advertisements relevant to you.</p>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${preferences.marketing ? 'bg-white' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 bg-black rounded-full absolute top-1 transition-transform ${preferences.marketing ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
              <button onClick={() => setShowPreferences(false)} className="px-6 py-3 border border-white/20 rounded-xl font-header text-[10px] tracking-widest uppercase hover:bg-white/10 transition-colors">
                Back
              </button>
              <button onClick={handleSavePreferences} className="px-8 py-3 bg-white text-black rounded-xl font-header text-[10px] tracking-widest uppercase hover:bg-white/90 transition-colors">
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
