import { MENUS } from '@/lib/calculatorPricing';
import { cn } from '@/lib/utils';

export default function MenuSelector({ menuId, rate, onSelect, onRateChange }) {
  return (
    <div className="mt-9">
      <p className="text-sm text-muted-foreground">Menu</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {MENUS.map((menu) => {
          const isActive = menuId === menu.id;
          return (
            <button
              key={menu.id}
              type="button"
              onClick={() => onSelect(menu)}
              className={cn(
                'rounded-xl border px-3 py-3 text-left transition',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-secondary/50 hover:border-accent'
              )}
            >
              <span className="block text-sm font-medium">{menu.name}</span>
              <span className={cn('mt-1 block text-xs', isActive ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                ${menu.ratePerGuest} pp
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/50 px-4 py-3">
        <label htmlFor="rate-per-guest" className="text-sm text-muted-foreground">
          Rate per guest
        </label>
        <div className="flex items-baseline gap-1 font-display text-lg">
          <span className="text-muted-foreground">$</span>
          <input
            id="rate-per-guest"
            type="number"
            inputMode="decimal"
            min="0"
            value={rate}
            onChange={(event) => onRateChange(event.target.value)}
            className="no-spin w-20 bg-transparent text-right outline-none"
          />
        </div>
      </div>
    </div>
  );
}