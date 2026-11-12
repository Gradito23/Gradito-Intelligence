import { SALARY_SHARE, formatCurrency, revenueHint } from '@/lib/calculatorPricing';
import ResultRow from '@/components/calculator/ResultRow';
import FoodCostTiers from '@/components/calculator/FoodCostTiers';

export default function ResultsPanel({ result }) {
  return (
    <section className="h-full rounded-2xl border border-primary/20 bg-primary p-6 text-primary-foreground shadow-sm sm:p-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">Chef salary</p>
      <p className="mt-3 font-display text-5xl leading-none text-accent sm:text-6xl">
        {formatCurrency(result.chefSalary)}
      </p>
      <p className="mt-3 text-sm text-primary-foreground/55">
        {Math.round(SALARY_SHARE * 100)}% of {formatCurrency(result.revenue)} experience revenue
      </p>

      <div className="mt-8">
        <ResultRow label="Experience revenue" hint={revenueHint(result.guests)} value={formatCurrency(result.revenue)} />
        <ResultRow
          label="Food budget charged"
          hint={`${result.guests} guests × ${formatCurrency(result.ratePerGuest)} per guest`}
          value={formatCurrency(result.foodBudget)}
        />
        <ResultRow
          label="Food cost"
          hint={`${Math.round(result.foodShare * 100)}% of the food budget (${result.tier.label})`}
          value={formatCurrency(result.foodCost)}
        />
      </div>

      <div className="mt-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/45">Share of food budget spent</p>
        <FoodCostTiers activeId={result.tier.id} />
      </div>
    </section>
  );
}