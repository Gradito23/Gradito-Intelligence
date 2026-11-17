import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/api/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import GraditoLogo from '@/components/brand/GraditoLogo';
import { Calendar, MapPin, ChefHat, Loader2, Users } from 'lucide-react';

function formatEventDate(value) {
  if (!value) return null;
  try {
    const d = parseISO(String(value).slice(0, 10));
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, 'EEEE, MMMM d, yyyy');
  } catch {
    return String(value);
  }
}

export default function JobPublic() {
  const { jobId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [job, setJob] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('event-job', {
          body: { action: 'public_get', job_id: jobId },
        });
        if (invokeError) {
          let message = invokeError.message;
          if (invokeError instanceof FunctionsHttpError) {
            try {
              const body = await invokeError.context.json();
              if (body?.error) message = body.error;
            } catch {
              /* ignore */
            }
          }
          throw new Error(message);
        }
        if (data?.error) throw new Error(data.error);
        if (!cancelled) setJob(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load this job');
          setJob(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (jobId) load();
    return () => { cancelled = true; };
  }, [jobId]);

  const ai = job?.ai_content || {};
  const snap = job?.source_snapshot || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
        <GraditoLogo className="h-8 w-auto text-navy mb-6" title="Gradito" />
        <h1 className="font-heading text-xl font-semibold text-navy">Job not available</h1>
        <p className="text-muted-foreground mt-2 max-w-md">{error || 'This page may have been removed.'}</p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/intake">Chef intake</Link>
        </Button>
      </div>
    );
  }

  const eventDate = formatEventDate(snap.event_date);
  const guestCount = snap.guest_count != null ? Number(snap.guest_count) : null;

  return (
    <div className="min-h-screen bg-cream text-navy">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <GraditoLogo className="h-7 w-auto" title="Gradito" />
          <Button asChild size="sm" className="bg-gold hover:bg-gold/90 text-navy font-semibold">
            <Link to="/intake">I&apos;m interested</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Chef opportunity</p>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold mt-2">{ai.title}</h1>
          {ai.hero_subtitle && (
            <p className="text-lg text-muted-foreground mt-3">{ai.hero_subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {eventDate && (
            <MetaChip icon={Calendar} label={eventDate} />
          )}
          {snap.service_area && (
            <MetaChip icon={MapPin} label={snap.service_area} />
          )}
          {snap.experience_type && (
            <MetaChip icon={ChefHat} label={snap.experience_type} />
          )}
          {guestCount != null && !Number.isNaN(guestCount) && (
            <MetaChip icon={Users} label={`~${guestCount} guests`} />
          )}
        </div>

        {Array.isArray(snap.cuisines_served) && snap.cuisines_served.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {snap.cuisines_served.map((c) => (
              <span
                key={c}
                className="text-xs px-3 py-1 rounded-full bg-navy/5 border border-navy/10"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <Card className="p-6 md:p-8 border-navy/10 shadow-sm space-y-6">
          {ai.summary && (
            <p className="text-base leading-relaxed text-foreground">{ai.summary}</p>
          )}

          {Array.isArray(ai.bullets) && ai.bullets.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold mb-3">What you&apos;ll do</h2>
              <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                {ai.bullets.map((item, i) => (
                  <li key={i} className="text-foreground/90">{item}</li>
                ))}
              </ul>
            </section>
          )}

          {Array.isArray(ai.requirements) && ai.requirements.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold mb-3">What we&apos;re looking for</h2>
              <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                {ai.requirements.map((item, i) => (
                  <li key={i} className="text-foreground/90">{item}</li>
                ))}
              </ul>
            </section>
          )}
        </Card>

        <div className="text-center pb-12">
          <Button asChild size="lg" className="bg-gold hover:bg-gold/90 text-navy font-semibold">
            <Link to="/intake">Express interest — apply via chef intake</Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Gradito connects exceptional chefs with private dining experiences nationwide.
          </p>
        </div>
      </main>
    </div>
  );
}

function MetaChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm bg-background border border-border rounded-full px-3 py-1.5">
      <Icon className="h-4 w-4 text-gold shrink-0" />
      {label}
    </span>
  );
}
