import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const EXAMPLE_GUESTS = 20;

const DEFAULT_CALCULATED = { base: 0, per_guest_after: 0, rate: 0 };

function parseFormula(value) {
  if (!value || typeof value !== 'object') return { mode: 'calculated', ...DEFAULT_CALCULATED };
  if (value.manual === true) return { mode: 'manual', ...DEFAULT_CALCULATED };
  return {
    mode: 'calculated',
    base: Number(value.base) || 0,
    per_guest_after: Number(value.per_guest_after) || 0,
    rate: Number(value.rate) || 0,
  };
}

export function formatPricingFormulaSummary(value) {
  if (value == null) return '—';
  let formula = value;
  if (typeof value === 'string') {
    try {
      formula = JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (typeof formula !== 'object') return String(value);
  if (formula.manual === true) return 'Manual';
  const base = Number(formula.base) || 0;
  const after = Number(formula.per_guest_after) || 0;
  const rate = Number(formula.rate) || 0;
  return `$${base.toLocaleString()} base + $${rate.toLocaleString()}/guest after ${after}`;
}

function formatMoney(n) {
  return `$${Number(n).toLocaleString()}`;
}

export default function PricingFormulaEditor({ value, onChange }) {
  const parsed = parseFormula(value);

  const emitCalculated = (patch) => {
    onChange({
      base: patch.base ?? parsed.base,
      per_guest_after: patch.per_guest_after ?? parsed.per_guest_after,
      rate: patch.rate ?? parsed.rate,
    });
  };

  const exampleFee = parsed.base + parsed.rate * Math.max(0, EXAMPLE_GUESTS - parsed.per_guest_after);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="space-y-2">
        <Label>Mode</Label>
        <RadioGroup
          value={parsed.mode}
          onValueChange={(mode) => {
            if (mode === 'manual') onChange({ manual: true });
            else emitCalculated({});
          }}
          className="gap-2"
        >
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <RadioGroupItem value="calculated" id="formula-mode-calculated" />
            Calculated formula
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <RadioGroupItem value="manual" id="formula-mode-manual" />
            Manual entry (no auto fee)
          </label>
        </RadioGroup>
      </div>

      {parsed.mode === 'manual' ? (
        <p className="text-sm text-muted-foreground leading-relaxed">
          Experience fee is entered per event. No automatic calculation.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="formula-base">Base fee ($)</Label>
              <Input
                id="formula-base"
                type="number"
                min={0}
                value={parsed.base}
                onChange={(e) => emitCalculated({ base: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="formula-included">Guests included</Label>
              <Input
                id="formula-included"
                type="number"
                min={0}
                value={parsed.per_guest_after}
                onChange={(e) => emitCalculated({ per_guest_after: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="formula-rate">Rate per extra guest</Label>
              <Input
                id="formula-rate"
                type="number"
                min={0}
                value={parsed.rate}
                onChange={(e) => emitCalculated({ rate: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="rounded-md border bg-background px-3 py-2.5 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            <p className="text-sm font-medium text-navy">
              {formatMoney(parsed.base)} + {formatMoney(parsed.rate)} × max(0, guests − {parsed.per_guest_after})
            </p>
            <p className="text-sm text-muted-foreground">
              Example @ {EXAMPLE_GUESTS} guests:{' '}
              <span className="font-medium text-foreground">{formatMoney(exampleFee)}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
