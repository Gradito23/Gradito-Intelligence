import React from 'react';

export default function CompletenessRing({ resolved, total }) {
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 100;
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={radius} fill="none"
            stroke={pct === 100 ? '#10b981' : pct >= 60 ? '#B8924F' : '#f59e0b'}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold font-heading">
          {pct}%
        </span>
      </div>
      <div>
        <p className="text-sm font-medium">Tier-1 Complete</p>
        <p className="text-xs text-muted-foreground">{resolved} of {total} chefs</p>
      </div>
    </div>
  );
}