import React from "react";

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Gradito Wordmark */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-navy tracking-wide">GRADITO</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Intelligence</p>
          {title && (
            <div className="mt-8">
              <div className="w-10 h-px bg-gold mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground tracking-tight">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}