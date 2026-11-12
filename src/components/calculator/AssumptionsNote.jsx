import {
  ADDITIONAL_GUEST_RATE,
  BASE_PRICE,
  INCLUDED_GUESTS,
  SALARY_SHARE,
  formatCurrency,
} from '@/lib/calculatorPricing';

export default function AssumptionsNote() {
  return (
    <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
      Experience rate is {formatCurrency(BASE_PRICE)} for {INCLUDED_GUESTS} guests or fewer, then{' '}
      {formatCurrency(ADDITIONAL_GUEST_RATE)} per additional guest. Chef salary is {Math.round(SALARY_SHARE * 100)}% of that
      experience revenue. Food cost is 80% of the food budget charged for 2–10 guests, 70% for 11–20, and 60% for 21–30 and
      above.
    </p>
  );
}