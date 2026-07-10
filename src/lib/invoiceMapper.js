/** Normalize a name for fuzzy matching */
export function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export function matchChef(nameStr, chefs) {
  if (!nameStr) return null;
  const key = normalizeName(nameStr);
  const full = chefs.find(c => normalizeName(`${c.first_name} ${c.last_name}`) === key);
  if (full) return full;
  return chefs.find(c => normalizeName(c.first_name) === key) || null;
}

export function matchTeamMember(nameStr, teamMembers) {
  if (!nameStr) return null;
  const key = normalizeName(nameStr);
  const full = teamMembers.find(m => normalizeName(`${m.first_name} ${m.last_name || ''}`) === key);
  if (full) return full;
  return teamMembers.find(m => normalizeName(m.first_name) === key) || null;
}

export function matchServiceArea(areaStr, serviceAreas) {
  if (!areaStr) return null;
  const key = (areaStr || '').toLowerCase().trim();
  return serviceAreas.find(sa => sa.name.toLowerCase().trim() === key) || null;
}

// ── Line-item classifiers ──────────────────────────────────────────────────────

function getFoodRevenue(parsed) {
  const foodKw = /culinary|food|canapé|canape|per guest|dinner|lunch|breakfast|meal|cuisine/i;
  const excluded = /chef|sous|server|bartender|bar|staff|travel|beverage|drink|delivery|instacart|gratuity|admin|service fee|tax|discount|floral|printed menu/i;
  return (parsed.line_items || [])
    .filter(l => foodKw.test(l.label) && !excluded.test(l.label))
    .reduce((s, l) => s + (l.total || 0), 0);
}

function getBeverageRevenue(parsed) {
  return (parsed.line_items || [])
    .filter(l => /beverage|drink|wine|beer|cocktail|spirit|instacart|bar package/i.test(l.label) && !/gratuity|tax|admin|discount/i.test(l.label))
    .reduce((s, l) => s + (l.total || 0), 0);
}

function getStaffingRevenue(parsed) {
  return (parsed.line_items || [])
    .filter(l => /server|bartender|staff|wait|waiter|foh/i.test(l.label) && !/chef|sous/i.test(l.label))
    .reduce((s, l) => s + (l.total || 0), 0);
}

function getTravelRevenue(parsed) {
  return (parsed.line_items || [])
    .filter(l => /travel|transport|mileage|uber|lyft|commute/i.test(l.label))
    .reduce((s, l) => s + (l.total || 0), 0);
}

function getFloralsRevenue(parsed) {
  return (parsed.line_items || [])
    .filter(l => /floral|flower|arrangement/i.test(l.label))
    .reduce((s, l) => s + (l.total || 0), 0);
}

function getPrintedMenusRevenue(parsed) {
  return (parsed.line_items || [])
    .filter(l => /printed menu|print menu|menu card/i.test(l.label))
    .reduce((s, l) => s + (l.total || 0), 0);
}

function getRentalRevenue(parsed) {
  return (parsed.line_items || [])
    .filter(l => /rental|equipment|linen|tableware|china|glassware/i.test(l.label) && !/gratuity|tax|admin|discount/i.test(l.label))
    .reduce((s, l) => s + (l.total || 0), 0);
}

function getOtherRevenue(parsed, food, bev, staffing, travel, florals, printedMenus, rentals, chefFees, adminFeeAmt, discount) {
  // Sum all line items not already classified into known buckets and not in excluded charges
  const classified = food + bev + staffing + travel + florals + printedMenus + rentals + chefFees + adminFeeAmt + discount;
  const gratuity = parsed.gratuity || 0;
  const ccFee = parsed.cc_fee || 0;
  const salesTax = parsed.sales_tax || 0;
  const excluded = gratuity + ccFee + salesTax;

  // Remaining = grand_total minus all known buckets and excluded charges
  const grandTotal = parsed.grand_total || 0;
  const remaining = grandTotal - classified - excluded;
  // If remaining is positive (and non-trivial), it's other revenue
  return remaining > 0.01 ? Math.round(remaining * 100) / 100 : 0;
}

export function mapInvoiceToDraft(parsed, chefs, teamMembers, serviceAreas, fileName) {
  const warnings = [];
  const assumptions = [];

  // ── Client Charges ────────────────────────────────────────────────────────────
  const food_revenue       = getFoodRevenue(parsed);
  const beverage_revenue   = getBeverageRevenue(parsed);
  const staffing_revenue   = getStaffingRevenue(parsed);
  const travel_revenue     = getTravelRevenue(parsed);
  const florals_revenue    = getFloralsRevenue(parsed);
  const printed_menus_revenue = getPrintedMenusRevenue(parsed);
  const rental_revenue     = getRentalRevenue(parsed);
  const discount           = parsed.discount || 0;
  // Admin fee: always use the dollar amount from invoice — never the percentage
  const admin_fee          = parsed.admin_fee_amount || 0;

  // Chef lines → experience_fee
  const headChefParsed = (parsed.chefs || []).find(c => c.role === 'Head') ||
    (parsed.line_items || []).find(l => /michelin|head chef/i.test(l.label));
  const sousChefParsed = (parsed.chefs || []).find(c => c.role === 'Sous') ||
    (parsed.line_items || []).find(l => /sous chef/i.test(l.label));

  const head_chef_fee = headChefParsed?.fee || headChefParsed?.total || 0;
  const sous_chef_fee = sousChefParsed?.fee || sousChefParsed?.total || 0;
  const experience_fee = head_chef_fee + sous_chef_fee;

  // Remaining unclassified revenue
  const knownTotal = food_revenue + beverage_revenue + staffing_revenue + travel_revenue +
    florals_revenue + printed_menus_revenue + rental_revenue + experience_fee + admin_fee + discount;
  const grandTotal = parsed.grand_total || 0;
  const excluded = (parsed.gratuity || 0) + (parsed.cc_fee || 0) + (parsed.sales_tax || 0);
  const residual = grandTotal - knownTotal - excluded;
  const other_revenue = residual > 0.01 ? Math.round(residual * 100) / 100 : 0;

  // ── Excluded Charges ──────────────────────────────────────────────────────────
  const gratuity       = parsed.gratuity || 0;
  const cc_processing  = parsed.cc_fee || 0;
  const sales_tax      = parsed.sales_tax || 0;

  // ── Event Costs — all blank/manual, no auto-fill ─────────────────────────────

  // ── Flags & Assumptions ───────────────────────────────────────────────────────
  if (admin_fee > 0)
    assumptions.push(`Admin fee imported as dollar amount: $${admin_fee.toFixed(2)}`);
  if (gratuity > 0)
    assumptions.push(`Gratuity $${gratuity.toFixed(2)} placed in Excluded Charges (flows to chef/staff)`);
  if (cc_processing > 0)
    assumptions.push(`CC processing fee $${cc_processing.toFixed(2)} placed in Excluded Charges`);

  // ── Matching ──────────────────────────────────────────────────────────────────
  const saMatch = matchServiceArea(parsed.service_area, serviceAreas);
  if (parsed.service_area && !saMatch)
    warnings.push(`Service area "${parsed.service_area}" not found in roster — will be created on commit`);

  const hasCompany = !!(parsed.client_company && parsed.client_company.trim());
  const event_type = hasCompany ? 'Corporate' : 'Private';
  if (hasCompany)
    assumptions.push(`Event type set to Corporate (client company: "${parsed.client_company}")`);

  const client_name = parsed.client_company || parsed.client_contact || '';

  const headName = (parsed.chefs || []).find(c => c.role === 'Head')?.name || headChefParsed?.name || null;
  const sousName = (parsed.chefs || []).find(c => c.role === 'Sous')?.name || sousChefParsed?.name || null;

  const headChefMatch = matchChef(headName, chefs);
  const sousChefMatch = matchChef(sousName, chefs);

  if (headName && !headChefMatch)
    warnings.push(`Head chef "${headName}" not found in roster — will not create EventChef record`);
  if (sousName && !sousChefMatch)
    warnings.push(`Sous chef "${sousName}" not found in roster — will not create EventChef record`);

  const facilitatorMatch = matchTeamMember(parsed.coordinated_by, teamMembers);
  if (parsed.coordinated_by && !facilitatorMatch)
    warnings.push(`Coordinator "${parsed.coordinated_by}" not found in team members — facilitator_id left unset`);

  warnings.push('lead_type and closer are unset — assign attribution in the event panel after import');

  const noteLines = [
    `[Invoice Import: ${parsed.invoice_number || fileName || 'unknown'}]`,
    parsed.event_title ? `Event: ${parsed.event_title}` : null,
    parsed.experience_label ? `Experience: ${parsed.experience_label}` : null,
  ].filter(Boolean).join('\n');

  return {
    date: parsed.date || '',
    service_area: parsed.service_area || '',
    client_name,
    event_type,
    guest_count: parsed.guest_count || null,
    status: 'Confirmed',
    package_type: 'Other / Custom',
    menu_tier: 'None / Manual',
    experience_type: parsed.experience_label || '',
    // Client Charges
    experience_fee,
    food_revenue,
    beverage_revenue,
    staffing_revenue,
    rental_revenue,
    travel_revenue,
    florals_revenue,
    printed_menus_revenue,
    other_revenue,
    discount,
    admin_fee,
    // Excluded Charges
    gratuity,
    cc_processing,
    sales_tax,
    // Event Costs — all blank/manual
    chef_food_budget: 0,
    staffing_cost: 0,
    beverage_cost: 0,
    rental_cost: 0,
    other_travel_cost: 0,
    florals_cost: 0,
    printed_menus_cost: 0,
    delivery_cost: 0,
    other_expenses: 0,
    // Reference
    invoice_number: parsed.invoice_number || '',
    invoice_grand_total: parsed.grand_total || 0,
    notes: noteLines,
    facilitator_id: facilitatorMatch?.id || null,
    facilitator_name: facilitatorMatch
      ? `${facilitatorMatch.first_name} ${facilitatorMatch.last_name || ''}`.trim()
      : parsed.coordinated_by || '',
    head_chef_name: headName || '',
    head_chef_id: headChefMatch?.id || null,
    head_chef_fee,
    sous_chef_name: sousName || '',
    sous_chef_id: sousChefMatch?.id || null,
    sous_chef_fee,
    _warnings: warnings,
    _assumptions: assumptions,
    _source_file: fileName || '',
    _parsed: parsed,
  };
}