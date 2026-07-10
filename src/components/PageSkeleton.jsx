import { cn } from '@/lib/utils';

export default function PageSkeleton({ className }) {
  return (
    <div className={cn('animate-pulse space-y-6', className)}>
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="h-4 w-72 max-w-full rounded bg-muted/70" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-lg bg-muted/60" />
        <div className="h-28 rounded-lg bg-muted/60" />
        <div className="h-28 rounded-lg bg-muted/60 hidden lg:block" />
      </div>
      <div className="space-y-3">
        <div className="h-12 rounded-lg bg-muted/50" />
        <div className="h-12 rounded-lg bg-muted/50" />
        <div className="h-12 rounded-lg bg-muted/50" />
        <div className="h-12 rounded-lg bg-muted/50" />
      </div>
    </div>
  );
}
