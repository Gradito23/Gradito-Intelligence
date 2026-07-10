export const PACKAGE_TYPES = [
  'Signature Experience',
  'Seven-Course Tasting',
  '14-Course Omakase',
  'Other / Custom',
];

export const MENU_TIERS = [
  'Classic ($68)',
  'Elevated ($88)',
  'Luxury ($108)',
  'None / Manual',
];

export const ADMIN_FEE_COMPONENTS = [
  'Experience Fee',
  'Menu/Food',
  'Beverage',
  'Rentals',
  'Travel',
  'Other',
];

const MENU_TIER_PRICES = {
  'Classic ($68)': 68,
  'Elevated ($88)': 88,
  'Luxury ($108)': 108,
};

/** Returns computed experience fee, or null for Other / Custom (manual only) */
export function calcExperienceFee(packageType, guests) {
  const g = Math.max(0, Number(guests) || 0);
  if (packageType === 'Signature Experience') return 1700 + 80 * Math.max(0, g - 10);
  if (packageType === 'Seven-Course Tasting') return 2250 + 275 * Math.max(0, g - 2);
  if (packageType === '14-Course Omakase') return 2250 + 315 * Math.max(0, g - 2);
  return null;
}

/** Returns computed food revenue for Signature + known menu tier, else null */
export function calcFoodRevenue(packageType, menuTier, guests) {
  if (packageType !== 'Signature Experience') return null;
  const price = MENU_TIER_PRICES[menuTier];
  if (!price) return null;
  return price * Math.max(0, Number(guests) || 0);
}


/**
 * Full P&L computation — new 5-section model.
 * chefPay = Σ (fee + travel_fee_applied) from EventChef records.
 * commissionOwed = Σ CommissionLine.amount (passed in separately; 0 if not yet computed).
 */
export function computePnL(draft, chefPay = 0, commissionOwed = 0) {
  // ── Client Charges ──────────────────────────────────────────────────────────
  const experienceFee      = Number(draft.experience_fee) || 0;
  const foodRevenue        = Number(draft.food_revenue) || 0;
  const beverageRevenue    = Number(draft.beverage_revenue) || 0;
  const staffingRevenue    = Number(draft.staffing_revenue) || 0;
  const rentalRevenue      = Number(draft.rental_revenue) || 0;
  const travelRevenue      = Number(draft.travel_revenue) || 0;
  const floralsRevenue     = Number(draft.florals_revenue) || 0;
  const printedMenusRevenue= Number(draft.printed_menus_revenue) || 0;
  const otherRevenue       = Number(draft.other_revenue) || 0;
  const discount           = Number(draft.discount) || 0;
  const adminFee           = Number(draft.admin_fee) || 0;

  const clientChargesSubtotal =
    experienceFee + foodRevenue + beverageRevenue + staffingRevenue +
    rentalRevenue + travelRevenue + floralsRevenue + printedMenusRevenue +
    otherRevenue - discount;

  // Billable Revenue INCLUDES admin fee
  const billableRevenue = clientChargesSubtotal + adminFee;

  // ── Excluded Charges (collected but not Gradito profit) ─────────────────────
  const gratuity      = Number(draft.gratuity) || 0;
  const ccProcessing  = Number(draft.cc_processing) || 0;
  const salesTax      = Number(draft.sales_tax) || 0;
  const excludedCharges = gratuity + ccProcessing + salesTax;

  // Client Total = full amount the client paid
  const clientTotal = billableRevenue + excludedCharges;

  // ── Event Costs ──────────────────────────────────────────────────────────────
  const chefFoodBudget    = Number(draft.chef_food_budget) || 0;  // fully manual — no 80% formula
  const staffingCost      = Number(draft.staffing_cost) || 0;
  const beverageCost      = Number(draft.beverage_cost) || 0;
  const rentalCost        = Number(draft.rental_cost) || 0;
  const otherTravelCost   = Number(draft.other_travel_cost) || 0;
  const floralsCost       = Number(draft.florals_cost) || 0;
  const printedMenusCost  = Number(draft.printed_menus_cost) || 0;
  const deliveryCost      = Number(draft.delivery_cost) || 0;
  const otherExpenses     = Number(draft.other_expenses) || 0;

  const totalEventCosts = chefPay + chefFoodBudget + staffingCost + beverageCost +
    rentalCost + otherTravelCost + floralsCost + printedMenusCost +
    deliveryCost + otherExpenses;

  // ── Profitability ────────────────────────────────────────────────────────────
  const grossProfit          = billableRevenue - totalEventCosts;
  const grossMarginPct       = billableRevenue > 0 ? (grossProfit / billableRevenue) * 100 : 0;
  // Commissionable Profit = Billable − Admin − Costs = clientChargesSubtotal − totalEventCosts
  const commissionableProfit = billableRevenue - adminFee - totalEventCosts;
  const netProfit            = grossProfit - commissionOwed;
  const netMarginPct         = billableRevenue > 0 ? (netProfit / billableRevenue) * 100 : 0;

  // Legacy compat aliases
  const marginPct        = netMarginPct;
  const totalClientSpend = clientTotal;
  const directCosts      = totalEventCosts;

  const beverageProfitability = beverageRevenue - beverageCost;

  return {
    // Revenue
    clientChargesSubtotal,
    billableRevenue,
    adminFee,
    excludedCharges,
    gratuity,
    ccProcessing,
    salesTax,
    clientTotal,
    // Costs
    totalEventCosts,
    directCosts,
    // Profitability
    grossProfit,
    grossMarginPct,
    commissionableProfit,
    commissionOwed,
    netProfit,
    netMarginPct,
    // Legacy
    marginPct,
    totalClientSpend,
    beverageProfitability,
  };
}