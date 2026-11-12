import { Minus, Plus } from 'lucide-react';
import { MAX_GUESTS, MIN_GUESTS } from '@/lib/calculatorPricing';

const iconButton =
  'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:text-foreground';

export default function GuestStepper({ guests, onChange }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Number of guests</p>
          <p className="mt-1 font-display text-5xl leading-none">{guests}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Remove a guest"
            className={iconButton}
            disabled={guests <= MIN_GUESTS}
            onClick={() => onChange(guests - 1)}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Add a guest"
            className={iconButton}
            disabled={guests >= MAX_GUESTS}
            onClick={() => onChange(guests + 1)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <input
        type="range"
        aria-label="Number of guests"
        className="range-warm mt-7"
        min={MIN_GUESTS}
        max={MAX_GUESTS}
        value={guests}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="mt-2 flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>{MIN_GUESTS} guests</span>
        <span>{MAX_GUESTS} guests</span>
      </div>
    </div>
  );
}