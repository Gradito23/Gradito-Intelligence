import React from 'react';
import { User } from 'lucide-react';

export default function ChefAvatar({ photoUrl, name, size = 'md' }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-lg',
  };

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-border`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-secondary flex items-center justify-center ring-2 ring-border font-heading font-semibold text-muted-foreground`}>
      {initials}
    </div>
  );
}