import React from 'react';

export default function StepIndicator({ step, steps }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${i + 1 === step ? 'text-gold' : i + 1 < step ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${i + 1 === step ? 'border-gold text-gold' : i + 1 < step ? 'border-muted-foreground bg-muted-foreground text-white' : 'border-muted-foreground/30'}`}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span className="hidden sm:inline">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-px ${i + 1 < step ? 'bg-muted-foreground' : 'bg-border'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}