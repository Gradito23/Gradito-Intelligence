import React from 'react';
import { Card } from '@/components/ui/card';

export default function StatCard({ title, value, subtitle, icon: Icon, onClick, accent }) {
  return (
    <Card
      className={`p-5 bg-card hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className={`text-2xl font-heading font-bold ${accent ? 'text-gold' : 'text-foreground'}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-secondary">
            <Icon size={18} className="text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}