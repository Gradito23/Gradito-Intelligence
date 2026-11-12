export const BASE_PRICE = 1700;
export const INCLUDED_GUESTS = 10;
export const ADDITIONAL_GUEST_RATE = 80;
export const SALARY_SHARE = 0.45;
export const MIN_GUESTS = 2;
export const MAX_GUESTS = 60;

export const MENUS = [
  { id: 'classic', name: 'Classic', ratePerGuest: 58 },
  { id: 'elevated', name: 'Elevated', ratePerGuest: 78 },
  { id: 'luxury', name: 'Luxury', ratePerGuest: 108 },
];

export const FOOD_COST_TIERS = [
  { id: 'small', label: '2–10 guests', share: 0.8 },
  { id: 'mid', label: '11–20 guests', share: 0.7 },
  { id: 'large', label: '21–30 guests', share: 0.6 },
];

export function formatCurrency(value) {
  const rounded = Math.round(value * 100) / 100;
  const hasCents = rounded % 1 !== 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded);
}

export function experienceCost(guests) {
  return BASE_PRICE + Math.max(0, guests - INCLUDED_GUESTS) * ADDITIONAL_GUEST_RATE;
}

export function activeTier(guests) {
  if (guests <= 10) return FOOD_COST_TIERS[0];
  if (guests <= 20) return FOOD_COST_TIERS[1];
  return FOOD_COST_TIERS[2];
}

export function revenueHint(guests) {
  const extra = Math.max(0, guests - INCLUDED_GUESTS);
  if (extra === 0) {
    return `${formatCurrency(BASE_PRICE)} flat rate, up to ${INCLUDED_GUESTS} guests`;
  }
  return `${formatCurrency(BASE_PRICE)} base + ${formatCurrency(ADDITIONAL_GUEST_RATE)} × ${extra} extra guests`;
}

export function calculate({ guests, ratePerGuest }) {
  const rate = Number(ratePerGuest) || 0;
  const revenue = experienceCost(guests);
  const foodBudget = guests * rate;
  const tier = activeTier(guests);

  return {
    guests,
    ratePerGuest: rate,
    revenue,
    chefSalary: revenue * SALARY_SHARE,
    foodBudget,
    tier,
    foodShare: tier.share,
    foodCost: foodBudget * tier.share,
  };
}