import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export default function CriteriaChips({ criteria, onRemove, onEdit }) {
  const chipConfig = {
    client_name: { label: 'Client', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    service_area: { label: 'Area', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    date: { label: 'Date', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    cuisines: { label: 'Cuisine', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    guest_count: { label: 'Guests', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    budget: { label: 'Budget', color: 'bg-green-100 text-green-800 border-green-200' },
    event_type: { label: 'Type', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    experience_type: { label: 'Experience', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    dietary: { label: 'Dietary', color: 'bg-red-100 text-red-800 border-red-200' },
    vibe: { label: 'Vibe', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  };

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(criteria).map(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null;
        const config = chipConfig[key] || { label: key, color: 'bg-secondary text-foreground' };
        const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

        return (
          <Badge
            key={key}
            className={`${config.color} border px-3 py-1 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => onEdit?.(key)}
          >
            <span className="font-semibold mr-1">{config.label}:</span>
            {displayValue}
            <button
              className="ml-2 hover:bg-black/10 rounded-full p-0.5"
              onClick={(e) => { e.stopPropagation(); onRemove(key); }}
            >
              <X size={10} />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}