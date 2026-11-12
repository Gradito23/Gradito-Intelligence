import GuestStepper from '@/components/calculator/GuestStepper';
import MenuSelector from '@/components/calculator/MenuSelector';

export default function BookingPanel({ guests, onGuestsChange, menuId, rate, onMenuSelect, onRateChange }) {
  return (
    <section className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">The booking</p>

      <div className="mt-6">
        <GuestStepper guests={guests} onChange={onGuestsChange} />
      </div>

      <MenuSelector menuId={menuId} rate={rate} onSelect={onMenuSelect} onRateChange={onRateChange} />
    </section>
  );
}