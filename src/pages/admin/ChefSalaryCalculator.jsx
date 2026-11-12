import { useState } from 'react';
import { MENUS, calculate } from '@/lib/calculatorPricing';
import BookingPanel from '@/components/calculator/BookingPanel';
import ResultsPanel from '@/components/calculator/ResultsPanel';
import AssumptionsNote from '@/components/calculator/AssumptionsNote';
import '@/styles/chefCalculatorTheme.css';

export default function ChefSalaryCalculator() {
  const [guests, setGuests] = useState(12);
  const [menuId, setMenuId] = useState(MENUS[0].id);
  const [rate, setRate] = useState(String(MENUS[0].ratePerGuest));

  const result = calculate({ guests, ratePerGuest: rate });

  const selectMenu = (menu) => {
    setMenuId(menu.id);
    setRate(String(menu.ratePerGuest));
  };

  const changeRate = (value) => {
    setRate(value);
    setMenuId(null);
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-heading text-2xl font-bold text-navy mb-6">Chef Salary Calculator</h1>

      <div className="chef-salary-calculator-theme relative overflow-hidden rounded-2xl border border-border">
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[460px] w-[880px] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <header className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">Private chef pricing</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Chef salary calculator</h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Set the guest count and the per-guest menu rate to see the experience revenue, the chef&rsquo;s salary, and what
              the food costs you on the booking.
            </p>
          </header>

          <div className="mt-11 grid gap-6 lg:grid-cols-2">
            <BookingPanel
              guests={guests}
              onGuestsChange={setGuests}
              menuId={menuId}
              rate={rate}
              onMenuSelect={selectMenu}
              onRateChange={changeRate}
            />
            <ResultsPanel result={result} />
          </div>

          <AssumptionsNote />
        </div>
      </div>
    </div>
  );
}
