export default function ResultRow({ label, value, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-primary-foreground/10 py-3.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-primary-foreground/45">{hint}</p> : null}
      </div>
      <p className="shrink-0 font-display text-lg tabular-nums">{value}</p>
    </div>
  );
}