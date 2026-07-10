import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChefAvatar from '@/components/ui/ChefAvatar';
import GoldStars from '@/components/ui/GoldStars';

export default function ChefCard({ chef, kpis, onClick }) {
  const fullName = `${chef.first_name} ${chef.last_name}`;

  return (
    <Card
      className="p-4 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
      onClick={() => onClick(chef)}
    >
      <div className="flex items-start gap-3">
        <ChefAvatar photoUrl={chef.photo_url} name={fullName} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-base truncate group-hover:text-gold transition-colors">
            {fullName}
          </h3>
          <GoldStars rating={chef.quality_rating} size={14} />
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-xs font-normal">{chef.roles_available}</Badge>
            {(chef.home_areas || []).slice(0, 2).map(area => (
              <Badge key={area} variant="secondary" className="text-xs font-normal">{area}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>{(chef.cuisines || []).slice(0, 3).join(', ')}</span>
        {kpis && (
          <span className="font-medium text-foreground">{kpis.eventsCount} events</span>
        )}
      </div>
      {chef.profile_status !== 'Complete' && (
        <div className="mt-2">
          <Badge className="bg-amber-100 text-amber-800 text-xs border-amber-200">{chef.profile_status}</Badge>
        </div>
      )}
    </Card>
  );
}