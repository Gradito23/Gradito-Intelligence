import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/hooks/useAppData';
import { RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import {
  PACKAGE_TYPES, MENU_TIERS,
  calcExperienceFee, calcFoodRevenue,
  computePnL,
} from '@/lib/pnlUtils';

function FieldRow({ label, children, hint }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/70 mt-0.5">{hint}</p>}
    </div>
  );
}

function NumInput({ value, onChange, placeholder, className = '' }) {
  return (
    <Input
      type="number"
      value={value || ''}
      onChange={e => onChange(Number(e.target.value) || 0)}
      placeholder={placeholder || '0'}
      className={`h-8 text-sm ${className}`}
    />
  );
}

function ReadOnlyValue({ label, value, subtext, className = '' }) {
  return (
    <div className={`flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium">{value}</span>
        {subtext && <p className="text-xs text-muted-foreground/70">{subtext}</p>}
      </div>
    </div>
  );
}

function SubtotalRow({ label, value, className = '' }) {
  return (
    <div className={`flex items-center justify-between pt-2 border-t border-border mt-1 ${className}`}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <span className="font-heading font-bold text-sm">{value}</span>
    </div>
  );
}

/**
 * EventPnL — 4 P&L cards (Package & Menu merged into Client Charges).
 * Section order: Client Charges → Excluded Charges → Event Costs → Profitability
 * The Commissions section is rendered separately via EventAttribution.
 */
export default function EventPnL({ draft, update, editedFields, markEdited, clearEdited, chefPay = 0, commissionOwed = 0 }) {
  const guests = Number(draft.guest_count) || 0;

  // Auto formulas (revenue only)
  const autoExperienceFee = useMemo(() => calcExperienceFee(draft.package_type, guests), [draft.package_type, guests]);
  const autoFoodRevenue   = useMemo(() => calcFoodRevenue(draft.package_type, draft.menu_tier, guests), [draft.package_type, draft.menu_tier, guests]);

  const isAutoField = (field, autoVal) => autoVal != null && !editedFields.has(field);

  const recalculate = (field, autoVal) => {
    if (autoVal == null) return;
    clearEdited(field);
    update(field, autoVal);
  };

  const handleUpdate = (field, value, autoVal) => {
    update(field, value);
    if (autoVal != null) {
      if (value !== autoVal) markEdited(field);
      else clearEdited(field);
    }
  };

  const handlePackageChange = (val) => {
    update('package_type', val);
    const newFee = calcExperienceFee(val, guests);
    if (newFee != null && !editedFields.has('experience_fee')) update('experience_fee', newFee);
    const newFood = calcFoodRevenue(val, draft.menu_tier, guests);
    if (newFood != null && !editedFields.has('food_revenue')) update('food_revenue', newFood);
  };

  const handleMenuTierChange = (val) => {
    update('menu_tier', val);
    const newFood = calcFoodRevenue(draft.package_type, val, guests);
    if (newFood != null && !editedFields.has('food_revenue')) update('food_revenue', newFood);
  };

  const pnl = useMemo(() => computePnL(draft, chefPay, commissionOwed), [draft, chefPay, commissionOwed]);
  const isProfit = pnl.netProfit >= 0;

  return (
    <div className="space-y-4">

      {/* ── Card 1: Client Charges ── */}
      <Card className="p-4 space-y-3">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Client Charges</h4>

        {/* Package & Menu controls */}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Package Type">
            <Select value={draft.package_type || ''} onValueChange={handlePackageChange}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{PACKAGE_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Menu Tier">
            <Select value={draft.menu_tier || ''} onValueChange={handleMenuTierChange}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{MENU_TIERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label={
            <span className="flex items-center gap-2">
              Experience Fee
              {isAutoField('experience_fee', autoExperienceFee)
                ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-300">auto</Badge>
                : autoExperienceFee != null
                  ? <button onClick={() => recalculate('experience_fee', autoExperienceFee)} className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 hover:text-amber-800 border border-amber-300 rounded px-1.5 py-0 bg-amber-50">
                      <RotateCcw size={9} /> recalc
                    </button>
                  : null
              }
            </span>
          }>
            <NumInput value={draft.experience_fee} onChange={v => handleUpdate('experience_fee', v, autoExperienceFee)} placeholder={autoExperienceFee != null ? String(autoExperienceFee) : '0'} />
          </FieldRow>

          <FieldRow label={
            <span className="flex items-center gap-2">
              Food / Menu Charges
              {isAutoField('food_revenue', autoFoodRevenue)
                ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-300">auto</Badge>
                : autoFoodRevenue != null
                  ? <button onClick={() => recalculate('food_revenue', autoFoodRevenue)} className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 hover:text-amber-800 border border-amber-300 rounded px-1.5 py-0 bg-amber-50">
                      <RotateCcw size={9} /> recalc
                    </button>
                  : null
              }
            </span>
          }>
            <NumInput value={draft.food_revenue} onChange={v => handleUpdate('food_revenue', v, autoFoodRevenue)} />
          </FieldRow>

          <FieldRow label="Beverage Program">
            <NumInput value={draft.beverage_revenue} onChange={v => update('beverage_revenue', v)} />
          </FieldRow>

          <FieldRow label="Servers / Bartenders / FOH">
            <NumInput value={draft.staffing_revenue} onChange={v => update('staffing_revenue', v)} />
          </FieldRow>

          <FieldRow label="Rentals">
            <NumInput value={draft.rental_revenue} onChange={v => update('rental_revenue', v)} />
          </FieldRow>

          <FieldRow label="Travel Expenses">
            <NumInput value={draft.travel_revenue} onChange={v => update('travel_revenue', v)} />
          </FieldRow>

          <FieldRow label="Florals">
            <NumInput value={draft.florals_revenue} onChange={v => update('florals_revenue', v)} />
          </FieldRow>

          <FieldRow label="Printed Menus">
            <NumInput value={draft.printed_menus_revenue} onChange={v => update('printed_menus_revenue', v)} />
          </FieldRow>

          <FieldRow label="Other Charges">
            <NumInput value={draft.other_revenue} onChange={v => update('other_revenue', v)} />
          </FieldRow>

          <FieldRow label="Discount (−)">
            <NumInput value={draft.discount} onChange={v => update('discount', v)} />
          </FieldRow>
        </div>

        <FieldRow label="Admin Fee ($)" hint="Dollar amount — included in Billable Revenue">
          <NumInput value={draft.admin_fee} onChange={v => update('admin_fee', v)} placeholder="0" className="max-w-[160px]" />
        </FieldRow>

        <SubtotalRow label="Billable Revenue" value={formatCurrency(pnl.billableRevenue)} />
      </Card>

      {/* ── Card 2: Excluded Charges ── */}
      <Card className="p-4 space-y-3">
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Excluded Charges</h4>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Collected from client but not Gradito profit — gratuity flows to chef/staff.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Gratuity">
            <NumInput value={draft.gratuity} onChange={v => update('gratuity', v)} />
          </FieldRow>
          <FieldRow label="CC Processing">
            <NumInput value={draft.cc_processing} onChange={v => update('cc_processing', v)} />
          </FieldRow>
          <FieldRow label="Sales Tax">
            <NumInput value={draft.sales_tax} onChange={v => update('sales_tax', v)} />
          </FieldRow>
        </div>
        <SubtotalRow label="Client Total" value={formatCurrency(pnl.clientTotal)} />
      </Card>

      {/* ── Card 3: Event Costs ── */}
      <Card className="p-4 space-y-3">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Event Costs</h4>

        {/* Chef Compensation read-only */}
        <div className="bg-secondary/40 rounded-lg px-3 py-2">
          <ReadOnlyValue label="Chef Compensation" value={formatCurrency(chefPay)} subtext="from assigned chefs (fee + travel)" />
        </div>

        {/* Food Budget — fully manual */}
        <FieldRow label="Food Budget">
          <NumInput value={draft.chef_food_budget} onChange={v => update('chef_food_budget', v)} placeholder="0" />
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Servers / Bartenders / FOH">
            <NumInput value={draft.staffing_cost} onChange={v => update('staffing_cost', v)} />
          </FieldRow>
          <FieldRow label="Beverage Costs">
            <NumInput value={draft.beverage_cost} onChange={v => update('beverage_cost', v)} />
          </FieldRow>
          <FieldRow label="Rentals">
            <NumInput value={draft.rental_cost} onChange={v => update('rental_cost', v)} />
          </FieldRow>
          <FieldRow label="Travel Expenses">
            <NumInput value={draft.other_travel_cost} onChange={v => update('other_travel_cost', v)} />
          </FieldRow>
          <FieldRow label="Florals">
            <NumInput value={draft.florals_cost} onChange={v => update('florals_cost', v)} />
          </FieldRow>
          <FieldRow label="Printed Menus">
            <NumInput value={draft.printed_menus_cost} onChange={v => update('printed_menus_cost', v)} />
          </FieldRow>
          <FieldRow label="Delivery">
            <NumInput value={draft.delivery_cost} onChange={v => update('delivery_cost', v)} />
          </FieldRow>
          <FieldRow label="Other Costs">
            <NumInput value={draft.other_expenses} onChange={v => update('other_expenses', v)} />
          </FieldRow>
        </div>

        <SubtotalRow label="Total Event Costs" value={formatCurrency(pnl.totalEventCosts)} />
      </Card>

      {/* ── Card 4: Profitability ── */}
      <Card className={`p-4 space-y-3 ${isProfit ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'}`}>
        <div className="flex items-center gap-2">
          {isProfit ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-500" />}
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Profitability</h4>
        </div>

        <div className="space-y-0.5">
          <ReadOnlyValue label="Gross Profit" value={formatCurrency(pnl.grossProfit)} />
          <ReadOnlyValue label="Gross Margin %" value={
            <span className={pnl.grossProfit >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
              {pnl.grossMarginPct.toFixed(1)}%
            </span>
          } />
          <ReadOnlyValue label="Commissionable Profit" value={
            <span className="font-semibold">{formatCurrency(pnl.commissionableProfit)}</span>
          } subtext="Gross − Admin Fee" />
          <ReadOnlyValue label="Commission Owed" value={`−${formatCurrency(pnl.commissionOwed)}`} />
        </div>

        {/* Net Profit headline */}
        <div className="text-center py-2 border-t border-border/30">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Net Profit</p>
          <p className={`font-heading text-3xl font-bold ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(pnl.netProfit)}
          </p>
          <p className={`text-xs font-semibold mt-0.5 ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
            {pnl.netMarginPct.toFixed(1)}% net margin
          </p>
        </div>


      </Card>
    </div>
  );
}