import React from 'react';
import { Star } from 'lucide-react';

export default function GoldStars({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'fill-gold text-gold' : 'text-border'}
        />
      ))}
    </div>
  );
}