"use client"

import React from 'react'

interface StepperProps {
  steps: string[]
  currentStep: number // 0-indexed
}

export const Stepper = ({ steps, currentStep }: StepperProps) => {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-8 mb-12 max-w-full">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-2xs font-header tracking-widest transition-all duration-300 ${
                index === currentStep 
                  ? 'bg-foreground text-background shadow-[0_0_20px_rgb(var(--foreground)/0.3)]' 
                  : index < currentStep 
                    ? 'bg-foreground/40 text-background' 
                    : 'bg-foreground/10 text-foreground/40'
              }`}
            >
              {String(index + 1).padStart(2, '0')}
            </div>
            <span 
              className={`font-header text-2xs tracking-[0.2em] sm:tracking-[0.3em] uppercase transition-all duration-300 ${index === currentStep ? '' : 'hidden sm:inline'} ${
                index === currentStep 
                  ? 'text-foreground' 
                  : index < currentStep 
                    ? 'text-foreground/60' 
                    : 'text-foreground/20'
              }`}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="w-4 sm:w-8 h-px bg-foreground/10 shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
