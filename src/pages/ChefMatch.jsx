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
import { Sparkles, Loader2, FileText, AlertCircle } from 'lucide-react';
import { SAMPLE_TRANSCRIPT } from '@/lib/constants';

function computeMatchScore(chef, criteria, events, eventChefs, clients) {
  let score = 0;
  const reasons = [];

  // Area check — hard filter
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

  // Compute travel fee
  let travelFee = 0;
  if (area && !(chef.home_areas || []).includes(area)) {
    const override = (chef.travel_fees || []).find(t => t.service_area === area);
    if (override) {
      travelFee = override.fee;
    } else if (chef.travel_policy === 'Anywhere') {
      travelFee = chef.default_travel_fee || 0;
    }
  }

  // Cuisine match
  const wantedCuisines = criteria.cuisines || [];
  const matchedCuisines = wantedCuisines.filter(c => (chef.cuisines || []).includes(c));
  if (wantedCuisines.length > 0 && matchedCuisines.length > 0) {
    score += 25 * (matchedCuisines.length / wantedCuisines.length);
    reasons.push(matchedCuisines.join(' + '));
  }

  // Quality
  score += (chef.quality_rating || 3) * 5;
  reasons.push(`${chef.quality_rating}★`);

  // Home area bonus
  if (area && (chef.home_areas || []).includes(area)) {
    score += 10;
    reasons.push(`based in ${area} (event area)`);
  }

  // Experience type match
  if (criteria.experience_type && (chef.experience_types || []).includes(criteria.experience_type)) {
    score += 10;
    reasons.push(criteria.experience_type.toLowerCase());
  }

  // Budget check
  if (criteria.budget) {
    const estCost = 3500 + travelFee; // rough estimate
    if (estCost <= criteria.budget) {
      score += 5;
    } else {
      score -= 10;
    }
  }

  // Repeat client boost
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

  // Event count (experience)
  const kpis = getChefKPIs(chef, events, eventChefs);
  if (kpis.eventsCount > 0) {
    score += Math.min(kpis.eventsCount * 2, 10);
  }

  // Dietary match
  if (criteria.dietary && (chef.dietary_specialties || []).some(d => d.toLowerCase().includes(criteria.dietary.toLowerCase()))) {
    score += 5;
    reasons.push('dietary match');
  }

  // Bench balance — slight boost for under-utilized
  if (kpis.eventsCount < 3) {
    score += 3;
  }

  // Cap at 100
  score = Math.min(Math.round(score), 100);

  return {
    score,
    reason: reasons.join(' · '),
    travelFee,
  };
}

export default function ChefMatch() {
  const { data: chefs } = useChefs();
  const { data: events } = useEvents();
  const { data: eventChefs } = useEventChefs();
  const { data: clients } = useClients();
  const { data: matchRuns } = useMatchRuns();
  const queryClient = useQueryClient();

  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [criteria, setCriteria] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // input | criteria | results

  const extractCriteria = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const runMatch = async () => {
    setLoading(true);

    // Filter for role eligibility
    const headCandidates = chefs.filter(c => c.roles_available === 'Head' || c.roles_available === 'Both');
    const scored = headCandidates.map(chef => {
      const { score, reason, travelFee } = computeMatchScore(chef, criteria, events, eventChefs, clients);
      return { chef, score, reason, travelFee };
    }).filter(r => r.score >= 0).sort((a, b) => b.score - a.score);

    // Pick top 3-5 with spread: top pick, value pick, wildcard
    const topPick = scored[0];
    const valuePick = scored.find(r => r !== topPick && r.travelFee === 0);
    const wildcard = scored.find(r => r !== topPick && r !== valuePick && r.chef.quality_rating <= 4);

    let finalResults = [topPick, valuePick, wildcard].filter(Boolean);
    // Fill to at least 3
    for (const r of scored) {
      if (finalResults.length >= 5) break;
      if (!finalResults.includes(r)) finalResults.push(r);
    }
    finalResults = finalResults.slice(0, 5);

    // Assign labels
    const labels = ['Top Pick', 'Value Pick', 'Wildcard'];
    finalResults.forEach((r, i) => {
      // Check repeat client
      if (criteria.client_name) {
        const client = clients.find(c => c.name.toLowerCase().includes(criteria.client_name.toLowerCase()));
        if (client) {
          const clientEventIds = events.filter(e => e.client_id === client.id).map(e => e.id);
          const workedTogether = eventChefs.filter(ec => ec.chef_id === r.chef.id && clientEventIds.includes(ec.event_id));
          if (workedTogether.length > 0) {
            r.label = 'Repeat Favorite';
            return;
          }
        }
      }
      r.label = labels[i] || null;
    });

    // Generate AI reasons
    for (const result of finalResults) {
      const aiReason = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a one-sentence explanation (max 20 words) for why Chef ${result.chef.first_name} ${result.chef.last_name} is a good match for this event.
Chef details: ${result.chef.quality_rating}★, cuisines: ${(result.chef.cuisines || []).join(', ')}, home areas: ${(result.chef.home_areas || []).join(', ')}, specialties: ${result.chef.signature_experiences || 'none'}
Event criteria: area ${criteria.service_area || 'any'}, cuisines: ${(criteria.cuisines || []).join(', ')}, guests: ${criteria.guest_count || 'TBD'}, type: ${criteria.event_type || 'any'}
Base reason: ${result.reason}
Travel fee: $${result.travelFee}`,
      });
      result.reason = aiReason;
    }

    // Sous flag
    const needsSous = (criteria.guest_count || 0) >= 15;
    finalResults.forEach(r => { r.needsSous = needsSous; });

    setResults(finalResults);
    setStep('results');
    setLoading(false);

    // Save match run
    await base44.entities.MatchRun.create({
      client_name: criteria.client_name || '',
      transcript_excerpt: transcript.slice(0, 200),
      extracted_criteria: criteria,
      suggested_chefs: finalResults.map(r => ({
        chef_id: r.chef.id,
        chef_name: `${r.chef.first_name} ${r.chef.last_name}`,
        score: r.score,
        label: r.label,
      })),
    });
    queryClient.invalidateQueries({ queryKey: ['matchRuns'] });
  };

  const removeCriteria = (key) => {
    const updated = { ...criteria };
    delete updated[key];
    setCriteria(updated);
  };

  // Repeat client banner
  const repeatBanner = useMemo(() => {
    if (!criteria?.client_name) return null;
    const client = clients.find(c => c.name.toLowerCase().includes((criteria.client_name || '').toLowerCase()));
    if (!client) return null;
    const clientEvents = events.filter(e => e.client_id === client.id);
    if (clientEvents.length < 2) return null;
    const clientEventIds = clientEvents.map(e => e.id);
    const chefCounts = {};
    eventChefs.filter(ec => clientEventIds.includes(ec.event_id)).forEach(ec => {
      chefCounts[ec.chef_name] = (chefCounts[ec.chef_name] || 0) + 1;
    });
    const topChef = Object.entries(chefCounts).sort((a, b) => b[1] - a[1])[0];
    if (!topChef) return null;
    return `You've worked with ${client.name} ${clientEvents.length}× — ${topChef[1]}× with ${topChef[0]}`;
  }, [criteria, clients, events, eventChefs]);

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

      {/* Transcript input */}
      {step === 'input' && (
        <Card className="p-6">
          <Textarea
            placeholder="Paste your client call transcript here..."
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
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

      {/* Criteria editing */}
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

      {/* Results */}
      {step === 'results' && results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg">Matched Chefs</h3>
            <Button variant="outline" size="sm" onClick={() => { setStep('input'); setResults(null); setCriteria(null); }}>
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
                <MatchResultCard key={result.chef.id} result={result} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Match History */}
      {matchRuns.length > 0 && step === 'input' && (
        <div>
          <h3 className="font-heading font-semibold text-lg mb-3">Match History</h3>
          <div className="space-y-2">
            {matchRuns.slice(0, 5).map(run => (
              <Card key={run.id} className="p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <div>
                  <p className="font-medium text-sm">{run.client_name || 'Unknown Client'}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-md">{run.transcript_excerpt}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{new Date(run.created_date).toLocaleDateString()}</p>
                  <p>{(run.suggested_chefs || []).length} chefs matched</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}