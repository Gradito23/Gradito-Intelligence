import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/api/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GraditoLogo from '@/components/brand/GraditoLogo';
import { Calendar, MapPin, ChefHat, Loader2, Users } from 'lucide-react';
import { PUBLIC_INTAKE_URL } from '@/lib/chefInviteMessage';

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
  const [applyForm, setApplyForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    intake_attestation: false,
  });
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMessage, setApplyMessage] = useState(null);
  const [applyError, setApplyError] = useState(null);

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

  useEffect(() => {
    if (ai.title) {
      document.title = `${ai.title} | Gradito`;
    }
    return () => {
      document.title = 'Gradito';
    };
  }, [ai.title]);

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

  const onSubmitApplication = async (e) => {
    e.preventDefault();
    setApplyBusy(true);
    setApplyError(null);
    setApplyMessage(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('event-job', {
        body: {
          action: 'submit_application',
          job_page_id: jobId,
          ...applyForm,
        },
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
      setApplyMessage(
        data?.message
        || 'Thanks — we received your application. Our team will follow up if this opportunity is a fit.',
      );
      setApplyForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        intake_attestation: false,
      });
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Unable to submit application');
    } finally {
      setApplyBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-navy">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <GraditoLogo className="h-7 w-auto" title="Gradito" />
          <Button asChild size="sm" variant="outline">
            <a href="#apply">Apply</a>
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

        <Card id="apply" className="p-6 md:p-8 border-navy/10 shadow-sm space-y-5">
          <div>
            <h2 className="font-heading text-xl font-semibold">Apply for this opportunity</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Please complete the chef intake form first if you have not already:{' '}
              <Link to="/intake" className="text-navy underline font-medium">
                Go to intake
              </Link>
              {' '}
              or{' '}
              <a href={PUBLIC_INTAKE_URL} className="text-navy underline font-medium">
                {PUBLIC_INTAKE_URL.replace(/^https?:\/\//, '')}
              </a>
            </p>
          </div>

          <form onSubmit={onSubmitApplication} className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
              <Checkbox
                id="intake_attestation"
                checked={applyForm.intake_attestation}
                onCheckedChange={(v) => setApplyForm((f) => ({ ...f, intake_attestation: v === true }))}
              />
              <Label htmlFor="intake_attestation" className="text-sm leading-snug font-normal cursor-pointer">
                I have already completed the Gradito chef intake
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              If we cannot match an intake on file and you do not confirm above, your application may not be reviewed.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  required
                  value={applyForm.first_name}
                  onChange={(ev) => setApplyForm((f) => ({ ...f, first_name: ev.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  required
                  value={applyForm.last_name}
                  onChange={(ev) => setApplyForm((f) => ({ ...f, last_name: ev.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={applyForm.email}
                  onChange={(ev) => setApplyForm((f) => ({ ...f, email: ev.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={applyForm.phone}
                  onChange={(ev) => setApplyForm((f) => ({ ...f, phone: ev.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Email or phone is required.</p>

            {applyError && (
              <p className="text-sm text-destructive">{applyError}</p>
            )}
            {applyMessage && (
              <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-3">
                {applyMessage}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={applyBusy || (!applyForm.email.trim() && !applyForm.phone.trim())}
              className="bg-gold hover:bg-gold/90 text-navy font-semibold"
            >
              {applyBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit application
            </Button>
          </form>
        </Card>

        <p className="text-xs text-muted-foreground text-center pb-12">
          Gradito connects exceptional chefs with private dining experiences nationwide.
        </p>
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
