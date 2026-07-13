import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ChefAvatar from '@/components/ui/ChefAvatar';
import GoldStars from '@/components/ui/GoldStars';
import { formatCurrency } from '@/hooks/useAppData';
import { MapPin, Users, User, CalendarPlus } from 'lucide-react';

export default function MatchResultCard({ result, rank, onViewChef, onCreateEvent }) {
  const { chef, score, reason, travelFee, needsSous, label } = result;
  const fullName = `${chef.first_name} ${chef.last_name}`;

  const labelColors = {
    'Top Pick': 'bg-gold text-white',
    'Value Pick': 'bg-emerald-600 text-white',
    'Wildcard': 'bg-purple-600 text-white',
    'Repeat Favorite': 'bg-blue-600 text-white',
  };

  return (
    <Card className="p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
      {label && (
        <Badge className={`${labelColors[label] || 'bg-secondary'} absolute top-3 right-3 text-xs border-0`}>
          {label}
        </Badge>
      )}
      <div className="flex items-start gap-4">
        <div className="relative">
          <ChefAvatar photoUrl={chef.photo_url} name={fullName} size="lg" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
            {rank}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-lg">{fullName}</h3>
          <GoldStars rating={chef.quality_rating} size={14} />
          <div className="flex flex-wrap gap-1 mt-2">
            {(chef.home_areas || []).slice(0, 2).map(a => (
              <Badge key={a} variant="secondary" className="text-xs"><MapPin size={10} className="mr-1" />{a}</Badge>
            ))}
            <Badge variant="outline" className="text-xs">{chef.roles_available}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-heading font-bold text-gold">{score}</div>
          <p className="text-xs text-muted-foreground">match score</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground italic leading-relaxed">"{reason}"</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {travelFee > 0 && (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
            <MapPin size={10} className="mr-1" /> +{formatCurrency(travelFee)} travel
          </Badge>
        )}
        {needsSous && (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
            <Users size={10} className="mr-1" /> Needs a sous — see candidates below
          </Badge>
        )}
      </div>

      {(onViewChef || onCreateEvent) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onViewChef && (
            <Button type="button" variant="outline" size="sm" onClick={() => onViewChef(chef)}>
              <User size={14} className="mr-1.5" />
              View chef
            </Button>
          )}
          {onCreateEvent && (
            <Button type="button" size="sm" className="bg-navy hover:bg-navy/90 text-white" onClick={() => onCreateEvent(result)}>
              <CalendarPlus size={14} className="mr-1.5" />
              Create event
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
