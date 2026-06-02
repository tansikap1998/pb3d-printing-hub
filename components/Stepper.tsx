"use client"

import React from 'react'

interface StepperProps {
  steps: string[]
  currentStep: number // 0-indexed
}

export const Stepper = ({ steps, currentStep }: StepperProps) => {
  return (
    <div className="flex items-center justify-center gap-4 md:gap-8 mb-12">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-3">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-header tracking-widest transition-all duration-300 ${
                index === currentStep 
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                  : index < currentStep 
                    ? 'bg-white/40 text-black' 
                    : 'bg-white/10 text-white/40'
              }`}
            >
              {String(index + 1).padStart(2, '0')}
            </div>
            <span 
              className={`font-header text-[10px] tracking-[0.3em] uppercase transition-all duration-300 ${
                index === currentStep 
                  ? 'text-white' 
                  : index < currentStep 
                    ? 'text-white/60' 
                    : 'text-white/20'
              }`}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="w-8 h-px bg-white/10" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
