import { FOOD_COST_TIERS } from '@/lib/calculatorPricing';
import { cn } from '@/lib/utils';

export default function FoodCostTiers({ activeId }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {FOOD_COST_TIERS.map((tier) => {
        const isActive = tier.id === activeId;
        return (
          <div
            key={tier.id}
            className={cn(
              'rounded-xl border px-2 py-3 text-center transition',
              isActive ? 'border-accent bg-accent/15' : 'border-primary-foreground/10'
            )}
          >
            <p className="text-[10px] uppercase tracking-wide text-primary-foreground/45">{tier.label}</p>
            <p className={cn('mt-1 font-display text-xl', isActive ? 'text-accent' : 'text-primary-foreground')}>
              {Math.round(tier.share * 100)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}