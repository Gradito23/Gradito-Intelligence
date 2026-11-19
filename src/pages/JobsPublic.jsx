import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import GraditoLogo from '@/components/brand/GraditoLogo';
import { Calendar, Loader2, MapPin, Search } from 'lucide-react';

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

function jobTitle(job) {
  const title = job?.ai_content?.title;
  return typeof title === 'string' && title.trim() ? title.trim() : 'Chef opportunity';
}

function jobLocation(job) {
  const area = job?.source_snapshot?.service_area;
  return typeof area === 'string' ? area.trim() : '';
}

export default function JobsPublic() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [locationQuery, setLocationQuery] = useState('');

  useEffect(() => {
    document.title = 'Careers | Gradito';
    return () => {
      document.title = 'Gradito';
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('event_job_pages')
        .select('id, published_at, ai_content, source_snapshot')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message || 'Unable to load opportunities');
        setJobs([]);
      } else {
        setJobs(data ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredJobs = useMemo(() => {
    const needle = locationQuery.trim().toLowerCase();
    const rows = needle
      ? jobs.filter((job) => jobLocation(job).toLowerCase().includes(needle))
      : jobs;
    return [...rows].sort((a, b) => {
      const aDate = String(a?.source_snapshot?.event_date || '');
      const bDate = String(b?.source_snapshot?.event_date || '');
      if (aDate && bDate) return aDate.localeCompare(bDate);
      if (aDate) return -1;
      if (bDate) return 1;
      return String(b.published_at || '').localeCompare(String(a.published_at || ''));
    });
  }, [jobs, locationQuery]);

  return (
    <div className="min-h-screen bg-cream text-navy">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/jobs" aria-label="Gradito careers">
            <GraditoLogo className="h-7 w-auto" title="Gradito" />
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/intake">Chef intake</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Careers</p>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold mt-2">Chef opportunities</h1>
          <p className="text-lg text-muted-foreground mt-3">
            Open private dining roles. Search by location, then apply on the opportunity page.
          </p>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder="Search by location"
            aria-label="Search by location"
            className="pl-9 bg-background"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-navy" />
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="font-medium">Unable to load opportunities</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-medium">
              {locationQuery.trim() ? 'No opportunities in that location' : 'No published opportunities right now'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back soon, or complete chef intake so we can reach you.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/intake">Chef intake</Link>
            </Button>
          </Card>
        ) : (
          <ul className="space-y-4">
            {filteredJobs.map((job) => {
              const location = jobLocation(job);
              const eventDate = formatEventDate(job?.source_snapshot?.event_date);
              const subtitle = job?.ai_content?.hero_subtitle;
              return (
                <li key={job.id}>
                  <Link to={`/job/${job.id}`} className="block">
                    <Card className="p-6 border-navy/10 shadow-sm hover:border-gold/70 transition-colors">
                      <h2 className="font-heading text-xl font-semibold">{jobTitle(job)}</h2>
                      {typeof subtitle === 'string' && subtitle.trim() && (
                        <p className="text-sm text-muted-foreground mt-2">{subtitle.trim()}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-4">
                        {eventDate && (
                          <span className="inline-flex items-center gap-2 text-sm bg-background border border-border rounded-full px-3 py-1.5">
                            <Calendar className="h-4 w-4 text-gold shrink-0" />
                            {eventDate}
                          </span>
                        )}
                        {location && (
                          <span className="inline-flex items-center gap-2 text-sm bg-background border border-border rounded-full px-3 py-1.5">
                            <MapPin className="h-4 w-4 text-gold shrink-0" />
                            {location}
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs text-muted-foreground text-center pb-12">
          Gradito connects exceptional chefs with private dining experiences nationwide.
        </p>
      </main>
    </div>
  );
}
