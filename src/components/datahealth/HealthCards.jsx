import React from 'react';

export default function HealthCards({ groups, activeFilter, onFilterClick }) {
  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.label}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {group.checks.map(check => {
              const Icon = check.icon;
              const isActive = activeFilter === check.key;
              const count = check.count;
              return (
                <button
                  key={check.key}
                  onClick={() => onFilterClick(isActive ? null : check.key)}
                  className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${
                    isActive
                      ? 'border-gold bg-gold/5 shadow-sm ring-1 ring-gold/30'
                      : group.muted
                        ? 'border-border bg-card opacity-70 hover:opacity-100'
                        : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={13} className={count > 0 && !group.muted && !group.positive ? 'text-amber-500' : 'text-muted-foreground'} />
                    <span className="text-xs text-muted-foreground leading-tight">{check.label}</span>
                  </div>
                  <p className={`text-2xl font-bold font-heading ${
                    group.positive ? 'text-blue-600'
                    : group.muted ? (count > 0 ? 'text-muted-foreground' : 'text-emerald-600')
                    : count > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>{count}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}