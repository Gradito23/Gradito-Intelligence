import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Multi-select checkboxes with optional “Other (please specify)” text field. */
export default function CheckboxGroup({
  options,
  value = [],
  onChange,
  otherValue = '',
  onOtherChange,
  columns = 2,
}) {
  const hasOther = options.some((o) => o.toLowerCase().includes('other'));

  const toggle = (opt) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-2 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
      >
        {options.map((opt) => (
          <label key={opt} className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={value.includes(opt)}
              onCheckedChange={() => toggle(opt)}
              className="mt-0.5"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {hasOther && value.some((v) => v.toLowerCase().includes('other')) && onOtherChange && (
        <div className="space-y-1.5">
          <Label htmlFor="other-specify">Please specify</Label>
          <Input
            id="other-specify"
            value={otherValue}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Please specify"
          />
        </div>
      )}
    </div>
  );
}
