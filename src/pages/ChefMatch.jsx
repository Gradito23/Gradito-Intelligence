import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useChefs, useEvents, useEventChefs, useClients, useMatchRuns, getChefKPIs, formatCurrency } from '@/hooks/useAppData';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import CriteriaChips from '@/components/match/CriteriaChips';
import MatchResultCard from '@/components/match/MatchResultCard';
import ChefDetailPanel from '@/components/chefs/ChefDetailPanel';
import CreateEventModal from '@/components/events/CreateEventModal';
import { Sparkles, Loader2, FileText, AlertCircle, ChevronDown, ChevronUp, CalendarPlus } from 'lucide-react';
import { SAMPLE_TRANSCRIPT } from '@/lib/constants';
import { toast } from '@/components/ui/use-toast';

const TRANSCRIPT_SAVE_LIMIT = 2000;

function computeMatchScore(chef, criteria, events, eventChefs, clients) {
  let score = 0;
  const reasons = [];

  const area = criteria.service_area;
  if (area) {
    const isHome = (chef.home_areas || []).includes(area);
    if (!isHome) {
      if (chef.travel_policy === 'Home only') return { score: -1, reason: 'Cannot travel to area', travelFee: 0 };
      if (chef.travel_policy === 'Select areas') {
        const tf = (chef.travel_fees || []).find(t => t.service_area === area);
        if (!tf) return { score: -1, reason: 'Area not in travel list', travelFee: 0 };
      }
    }
  }

  let travelFee = 0;
  if (area && !(chef.home_areas || []).includes(area)) {
    const override = (chef.travel_fees || []).find(t => t.service_area === area);
    if (override) {
      travelFee = override.fee;
    } else if (chef.travel_policy === 'Anywhere') {
      travelFee = chef.default_travel_fee || 0;
    }
  }

  const wantedCuisines = criteria.cuisines || [];
  const matchedCuisines = wantedCuisines.filter(c => (chef.cuisines || []).includes(c));
  if (wantedCuisines.length > 0 && matchedCuisines.length > 0) {
    score += 25 * (matchedCuisines.length / wantedCuisines.length);
    reasons.push(matchedCuisines.join(' + '));
  }

  score += (chef.quality_rating || 3) * 5;
  reasons.push(`${chef.quality_rating}★`);

  if (area && (chef.home_areas || []).includes(area)) {
    score += 10;
    reasons.push(`based in ${area} (event area)`);
  }

  if (criteria.experience_type && (chef.experience_types || []).includes(criteria.experience_type)) {
    score += 10;
    reasons.push(criteria.experience_type.toLowerCase());
  }

  if (criteria.budget) {
    const estCost = 3500 + travelFee;
    if (estCost <= criteria.budget) score += 5;
    else score -= 10;
  }

  if (criteria.client_name) {
    const client = clients.find(c => c.name.toLowerCase().includes(criteria.client_name.toLowerCase()));
    if (client) {
      const clientEventIds = events.filter(e => e.client_id === client.id).map(e => e.id);
      const workedTogether = eventChefs.filter(ec => ec.chef_id === chef.id && clientEventIds.includes(ec.event_id));
      if (workedTogether.length > 0) {
        score += 15;
        reasons.push(`${workedTogether.length} prior events with this client`);
      }
    }
  }

  const kpis = getChefKPIs(chef, events, eventChefs);
  if (kpis.eventsCount > 0) {
    score += Math.min(kpis.eventsCount * 2, 10);
  }

  if (criteria.dietary && (chef.dietary_specialties || []).some(d => d.toLowerCase().includes(criteria.dietary.toLowerCase()))) {
    score += 5;
    reasons.push('dietary match');
  }

  if (kpis.eventsCount < 3) {
    score += 3;
  }

  score = Math.min(Math.round(score), 100);

  return {
    score,
    reason: reasons.join(' · '),
    travelFee,
  };
}

function computeSousCandidates(chefs, criteria, events, eventChefs, clients, limit = 3) {
  return chefs
    .filter((c) => !c.archived && (c.roles_available === 'Sous' || c.roles_available === 'Both'))
    .map((chef) => {
      const { score, reason, travelFee } = computeMatchScore(chef, criteria, events, eventChefs, clients);
      return { chef, score, reason, travelFee, label: null, needsSous: false };
    })
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function resultsFromSuggested(suggested, chefs, criteria) {
  const needsSous = (criteria?.guest_count || 0) >= 15;
  return (suggested || [])
    .map((s, i) => {
      const chef = chefs.find((c) => c.id === s.chef_id);
      if (!chef) return null;
      return {
        chef,
        score: s.score ?? 0,
        reason: s.reason || `${s.label || 'Suggested'} · score ${s.score ?? '—'}`,
        travelFee: s.travel_fee ?? 0,
        label: s.label || (i === 0 ? 'Top Pick' : null),
        needsSous,
      };
    })
    .filter(Boolean);
}

export default function ChefMatch() {
  const { data: chefs = [] } = useChefs();
  const { data: events = [] } = useEvents();
  const { data: eventChefs = [] } = useEventChefs();
  const { data: clients = [] } = useClients();
  const { data: matchRuns = [] } = useMatchRuns();
  const queryClient = useQueryClient();

  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [criteria, setCriteria] = useState(null);
  const [results, setResults] = useState(null);
  const [sousCandidates, setSousCandidates] = useState([]);
  const [selectedSousId, setSelectedSousId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input');
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  const [viewChef, setViewChef] = useState(null);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [prefillChef, setPrefillChef] = useState(null);
  const [prefillSous, setPrefillSous] = useState(null);
  const [prefillCriteria, setPrefillCriteria] = useState(null);

  const chefKPIs = useMemo(() => {
    const map = {};
    chefs.forEach((c) => { map[c.id] = getChefKPIs(c, events, eventChefs); });
    return map;
  }, [chefs, events, eventChefs]);

  const openCreateEvent = (headResult) => {
    setPrefillChef(headResult.chef);
    setPrefillCriteria(criteria);
    const sous = sousCandidates.find((s) => s.chef.id === selectedSousId);
    setPrefillSous(sous?.chef || null);
    setCreateEventOpen(true);
  };

  const extractCriteria = async () => {
    setLoading(true);
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract structured event criteria from this client call transcript. Return ONLY the JSON object with these fields (use null for anything not mentioned):
- client_name: string or null
- service_area: one of [Manhattan, Brooklyn, Westchester, The Hamptons, Miami, Los Angeles, Philadelphia, Washington DC, San Francisco] or null
- date: string or null
- cuisines: array of strings from [Cantonese, French, Italian, Japanese, Mediterranean, New American, Kosher, Plant-Based, Spanish, Thai, Vietnamese]
- guest_count: number or null
- budget: number or null (total chef budget, not per-person)
- event_type: one of [Private, Corporate, Wedding] or null
- experience_type: string or null from [Plated Multi-Course, Tasting Menu / Omakase, Family-Style, Cocktail Reception / Canapés, Interactive Cooking Class, Farm-to-Table / Foraging, Live-Fire / Outdoor, Brunch / Daytime, Wine-Pairing Dinner, Themed, Corporate / Large-Format]
- dietary: string or null
- vibe: string or null (general mood/feeling)

Transcript:
${transcript}`,
        response_json_schema: {
          type: 'object',
          properties: {
            client_name: { type: ['string', 'null'] },
            service_area: { type: ['string', 'null'] },
            date: { type: ['string', 'null'] },
            cuisines: { type: 'array', items: { type: 'string' } },
            guest_count: { type: ['number', 'null'] },
            budget: { type: ['number', 'null'] },
            event_type: { type: ['string', 'null'] },
            experience_type: { type: ['string', 'null'] },
            dietary: { type: ['string', 'null'] },
            vibe: { type: ['string', 'null'] },
          },
        },
      });
      setCriteria(resp);
      setStep('criteria');
    } catch (err) {
      toast({
        title: 'Could not extract criteria',
        description: err.message || 'Check OpenAI under Admin → Integrations → OpenAI.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const runMatch = async () => {
    setLoading(true);
    try {
      const headCandidates = chefs.filter(
        (c) => !c.archived && (c.roles_available === 'Head' || c.roles_available === 'Both'),
      );
      const scored = headCandidates.map((chef) => {
        const { score, reason, travelFee } = computeMatchScore(chef, criteria, events, eventChefs, clients);
        return { chef, score, reason, travelFee };
      }).filter((r) => r.score >= 0).sort((a, b) => b.score - a.score);

      const topPick = scored[0];
      const valuePick = scored.find((r) => r !== topPick && r.travelFee === 0);
      const wildcard = scored.find((r) => r !== topPick && r !== valuePick && r.chef.quality_rating <= 4);

      let finalResults = [topPick, valuePick, wildcard].filter(Boolean);
      for (const r of scored) {
        if (finalResults.length >= 5) break;
        if (!finalResults.includes(r)) finalResults.push(r);
      }
      finalResults = finalResults.slice(0, 5);

      const labels = ['Top Pick', 'Value Pick', 'Wildcard'];
      finalResults.forEach((r, i) => {
        if (criteria.client_name) {
          const client = clients.find((c) => c.name.toLowerCase().includes(criteria.client_name.toLowerCase()));
          if (client) {
            const clientEventIds = events.filter((e) => e.client_id === client.id).map((e) => e.id);
            const workedTogether = eventChefs.filter((ec) => ec.chef_id === r.chef.id && clientEventIds.includes(ec.event_id));
            if (workedTogether.length > 0) {
              r.label = 'Repeat Favorite';
              return;
            }
          }
        }
        r.label = labels[i] || null;
      });

      await Promise.all(
        finalResults.map(async (result) => {
          const localReason = result.reason;
          try {
            const aiReason = await base44.integrations.Core.InvokeLLM({
              prompt: `Write a one-sentence explanation (max 20 words) for why Chef ${result.chef.first_name} ${result.chef.last_name} is a good match for this event.
Chef details: ${result.chef.quality_rating}★, cuisines: ${(result.chef.cuisines || []).join(', ')}, home areas: ${(result.chef.home_areas || []).join(', ')}, specialties: ${result.chef.signature_experiences || 'none'}
Event criteria: area ${criteria.service_area || 'any'}, cuisines: ${(criteria.cuisines || []).join(', ')}, guests: ${criteria.guest_count || 'TBD'}, type: ${criteria.event_type || 'any'}
Base reason: ${localReason}
Travel fee: $${result.travelFee}`,
            });
            result.reason = typeof aiReason === 'string' && aiReason.trim() ? aiReason.trim() : localReason;
          } catch {
            result.reason = localReason;
          }
        }),
      );

      const needsSous = (criteria.guest_count || 0) >= 15;
      finalResults.forEach((r) => { r.needsSous = needsSous; });

      const sousList = needsSous
        ? computeSousCandidates(chefs, criteria, events, eventChefs, clients, 3)
        : [];
      setSousCandidates(sousList);
      setSelectedSousId(sousList[0]?.chef.id || null);

      setResults(finalResults);
      setStep('results');

      await base44.entities.MatchRun.create({
        client_name: criteria.client_name || '',
        transcript_excerpt: transcript.slice(0, TRANSCRIPT_SAVE_LIMIT),
        extracted_criteria: criteria,
        suggested_chefs: finalResults.map((r) => ({
          chef_id: r.chef.id,
          chef_name: `${r.chef.first_name} ${r.chef.last_name}`,
          score: r.score,
          label: r.label,
          reason: r.reason,
          travel_fee: r.travelFee,
        })),
      });
      queryClient.invalidateQueries({ queryKey: ['matchRuns'] });
    } catch (err) {
      toast({
        title: 'Match failed',
        description: err.message || 'Something went wrong while matching chefs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeCriteria = (key) => {
    const updated = { ...criteria };
    delete updated[key];
    setCriteria(updated);
  };

  const reopenHistoryRun = (run) => {
    const crit = run.extracted_criteria || {};
    setCriteria(crit);
    setTranscript(run.transcript_excerpt || '');
    const rebuilt = resultsFromSuggested(run.suggested_chefs, chefs, crit);
    setResults(rebuilt);
    const needsSous = (crit.guest_count || 0) >= 15;
    const sousList = needsSous
      ? computeSousCandidates(chefs, crit, events, eventChefs, clients, 3)
      : [];
    setSousCandidates(sousList);
    setSelectedSousId(sousList[0]?.chef.id || null);
    setStep('results');
    setExpandedHistoryId(null);
  };

  const repeatBanner = useMemo(() => {
    if (!criteria?.client_name) return null;
    const client = clients.find((c) => c.name.toLowerCase().includes((criteria.client_name || '').toLowerCase()));
    if (!client) return null;
    const clientEvents = events.filter((e) => e.client_id === client.id);
    if (clientEvents.length < 2) return null;
    const clientEventIds = clientEvents.map((e) => e.id);
    const chefCounts = {};
    eventChefs.filter((ec) => clientEventIds.includes(ec.event_id)).forEach((ec) => {
      chefCounts[ec.chef_name] = (chefCounts[ec.chef_name] || 0) + 1;
    });
    const topChef = Object.entries(chefCounts).sort((a, b) => b[1] - a[1])[0];
    if (!topChef) return null;
    return `You've worked with ${client.name} ${clientEvents.length}× — ${topChef[1]}× with ${topChef[0]}`;
  }, [criteria, clients, events, eventChefs]);

  const resetToInput = () => {
    setStep('input');
    setResults(null);
    setCriteria(null);
    setSousCandidates([]);
    setSelectedSousId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Chef Match</h1>
        <p className="text-muted-foreground mt-1">Paste a client call transcript to find the perfect chef</p>
      </div>

      {repeatBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <FileText size={18} className="text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 font-medium">{repeatBanner}</p>
        </div>
      )}

      {step === 'input' && (
        <Card className="p-6">
          <Textarea
            placeholder="Paste your client call transcript here..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="min-h-[160px] text-sm leading-relaxed resize-y"
          />
          <div className="flex justify-end mt-4">
            <Button
              onClick={extractCriteria}
              disabled={!transcript.trim() || loading}
              className="bg-navy hover:bg-navy/90 text-white"
            >
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
              {loading ? 'Reading transcript...' : 'Find Chefs'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'criteria' && criteria && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="font-heading font-semibold text-lg mb-1">Extracted Criteria</h3>
            <p className="text-xs text-muted-foreground">Review and edit the criteria before matching</p>
          </div>
          <CriteriaChips criteria={criteria} onRemove={removeCriteria} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('input')}>Back</Button>
            <Button onClick={runMatch} disabled={loading} className="bg-gold hover:bg-gold/90 text-white">
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
              {loading ? 'Matching chefs...' : 'Match'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'results' && results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg">Matched Chefs</h3>
            <Button variant="outline" size="sm" onClick={resetToInput}>
              New Match
            </Button>
          </div>
          {criteria && <CriteriaChips criteria={criteria} onRemove={() => {}} />}
          {results.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No chefs match these criteria. Try broadening the area or cuisine requirements.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((result, i) => (
                <MatchResultCard
                  key={result.chef.id}
                  result={result}
                  rank={i + 1}
                  onViewChef={setViewChef}
                  onCreateEvent={openCreateEvent}
                />
              ))}
            </div>
          )}

          {sousCandidates.length > 0 && (
            <Card className="p-5 space-y-3">
              <div>
                <h4 className="font-heading font-semibold">Sous candidates</h4>
                <p className="text-xs text-muted-foreground">
                  Guest count is 15+. Select a sous to attach when you create the event.
                </p>
              </div>
              <div className="space-y-2">
                {sousCandidates.map((s) => {
                  const selected = selectedSousId === s.chef.id;
                  return (
                    <button
                      key={s.chef.id}
                      type="button"
                      onClick={() => setSelectedSousId(s.chef.id)}
                      className={`w-full text-left flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors ${
                        selected ? 'border-navy bg-navy/5' : 'border-border hover:bg-secondary/40'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{s.chef.first_name} {s.chef.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-md">{s.reason}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-heading font-bold text-gold">{s.score}</p>
                        {s.travelFee > 0 && (
                          <p className="text-xs text-amber-700">+{formatCurrency(s.travelFee)} travel</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {matchRuns.length > 0 && step === 'input' && (
        <div>
          <h3 className="font-heading font-semibold text-lg mb-3">Match History</h3>
          <div className="space-y-2">
            {matchRuns.slice(0, 8).map((run) => {
              const expanded = expandedHistoryId === run.id;
              const suggested = run.suggested_chefs || [];
              return (
                <Card key={run.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedHistoryId(expanded ? null : run.id)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{run.client_name || 'Unknown Client'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {run.transcript_excerpt || 'No transcript saved'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{new Date(run.created_date || run.created_at).toLocaleDateString()}</p>
                        <p>{suggested.length} chefs matched</p>
                      </div>
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t px-4 py-3 space-y-4 bg-secondary/10">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Transcript</p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {run.transcript_excerpt || '—'}
                        </p>
                        {(run.transcript_excerpt || '').length >= TRANSCRIPT_SAVE_LIMIT && (
                          <p className="text-xs text-muted-foreground mt-1">Showing first {TRANSCRIPT_SAVE_LIMIT} characters.</p>
                        )}
                      </div>

                      {run.extracted_criteria && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Criteria</p>
                          <CriteriaChips criteria={run.extracted_criteria} onRemove={() => {}} />
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Suggested chefs</p>
                        {suggested.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No chefs stored for this run.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {suggested.map((s) => (
                              <li key={s.chef_id} className="flex items-center justify-between text-sm gap-2">
                                <span>
                                  {s.chef_name}
                                  {s.label && (
                                    <Badge variant="secondary" className="ml-2 text-[10px]">{s.label}</Badge>
                                  )}
                                </span>
                                <span className="text-gold font-heading font-semibold">{s.score}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => reopenHistoryRun(run)}>
                          View results
                        </Button>
                        {suggested[0] && (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-navy hover:bg-navy/90 text-white"
                            onClick={() => {
                              const chef = chefs.find((c) => c.id === suggested[0].chef_id);
                              if (!chef) {
                                toast({ title: 'Chef no longer on roster', variant: 'destructive' });
                                return;
                              }
                              const crit = run.extracted_criteria || {};
                              const needsSous = (crit.guest_count || 0) >= 15;
                              const topSous = needsSous
                                ? computeSousCandidates(chefs, crit, events, eventChefs, clients, 1)[0]
                                : null;
                              setCriteria(crit);
                              setPrefillChef(chef);
                              setPrefillCriteria(crit);
                              setPrefillSous(topSous?.chef || null);
                              setCreateEventOpen(true);
                            }}
                          >
                            <CalendarPlus size={14} className="mr-1.5" />
                            Create event (Top Pick)
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <ChefDetailPanel
        chef={viewChef}
        kpis={viewChef ? chefKPIs[viewChef.id] : null}
        events={events}
        eventChefs={eventChefs}
        clients={clients}
        open={!!viewChef}
        onClose={() => setViewChef(null)}
        onCreateEvent={(chef) => {
          setViewChef(null);
          setPrefillChef(chef);
          setPrefillCriteria(criteria);
          const sous = sousCandidates.find((s) => s.chef.id === selectedSousId);
          setPrefillSous(sous?.chef || null);
          setCreateEventOpen(true);
        }}
      />

      <CreateEventModal
        open={createEventOpen}
        onClose={() => {
          setCreateEventOpen(false);
          setPrefillChef(null);
          setPrefillSous(null);
          setPrefillCriteria(null);
        }}
        chefs={chefs}
        clients={clients}
        eventChefs={eventChefs}
        prefillChef={prefillChef}
        prefillSous={prefillSous}
        prefillCriteria={prefillCriteria}
      />
    </div>
  );
}
