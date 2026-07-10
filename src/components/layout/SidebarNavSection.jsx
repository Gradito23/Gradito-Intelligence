import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function NavLink({
  path,
  label,
  icon: Icon,
  comingSoon,
  badgeKey,
  dataHealthCount,
  isActive,
  onNavigate,
  className,
}) {
  return (
    <Link
      to={path}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive(path)
          ? 'bg-sidebar-accent text-gold'
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
        className,
      )}
    >
      {Icon && <Icon size={18} className={isActive(path) ? 'text-gold' : ''} />}
      <span className="flex-1">{label}</span>
      {comingSoon && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-sidebar-accent text-sidebar-foreground/70">
          Soon
        </Badge>
      )}
      {badgeKey === 'dataHealth' && !isActive(path) && dataHealthCount > 0 && (
        <span className="ml-auto text-xs font-bold bg-gold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {dataHealthCount > 99 ? '99+' : dataHealthCount}
        </span>
      )}
      {isActive(path) && !comingSoon && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
      )}
    </Link>
  );
}

export default function SidebarNavSection({
  label,
  icon: SectionIcon,
  items,
  isOpen,
  onOpenChange,
  collapsed,
  isActive,
  onNavigate,
  dataHealthCount = 0,
}) {
  const hasActiveChild = items.some((item) => isActive(item.path));

  if (collapsed) {
    return (
      <div className="flex justify-center mb-1">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                hasActiveChild
                  ? 'bg-sidebar-accent text-gold'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
              aria-label={label}
            >
              {SectionIcon && <SectionIcon size={18} />}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-56 p-2 bg-navy border-sidebar-accent text-sidebar-foreground">
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50 px-2 py-1.5 mb-1">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  {...item}
                  isActive={isActive}
                  onNavigate={onNavigate}
                  dataHealthCount={dataHealthCount}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="mb-2">
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/30 transition-colors group">
        {SectionIcon && <SectionIcon size={14} className="shrink-0 opacity-70" />}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 transition-transform duration-200 opacity-60 group-hover:opacity-100',
            isOpen && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-0.5 space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.path}
            {...item}
            isActive={isActive}
            onNavigate={onNavigate}
            dataHealthCount={dataHealthCount}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
