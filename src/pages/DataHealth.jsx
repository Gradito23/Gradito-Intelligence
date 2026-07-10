import React, { useState, useMemo } from 'react';
import { useChefs } from '@/hooks/useAppData';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Phone, Mail, Link2, BookOpen, AlertTriangle, XCircle,
  ChefHat, Star, DollarSign, Users, HeartPulse, Download,
} from 'lucide-react';
import HealthCards from '@/components/datahealth/HealthCards';
import CompletenessRing from '@/components/datahealth/CompletenessRing';
import AreaCompleteness from '@/components/datahealth/AreaCompleteness';
import CleanupQueue from '@/components/datahealth/CleanupQueue';
import MultiAreaPanel from '@/components/datahealth/MultiAreaPanel';

// ─── Non-chef heuristic stoplist ──────────────────────────────────────────────
const NON_CHEF_STOPLIST = [
  'server', 'servers', 'sommelier', 'somm', 'rentals', 'rental',
  'staff', 'chef', 'kitchen', 'prep', 'helper',
];

function isPossibleNonChef(c) {
  if (c.last_name) return false; // has last name → real record
  const name = (c.first_name || '').toLowerCase().trim();
  return NON_CHEF_STOPLIST.includes(name);
}

// ─── Build check definitions with live counts ─────────────────────────────────
function buildGroups(chefs) {
  const active = chefs.filter(c => !c.archived);

  const count = (fn) => active.filter(fn).length;

  const tier1 = [
    { key: 'missing_phone', label: 'Missing Phone', icon: Phone, count: count(c => !c.phone), filter: c => !c.phone },
    { key: 'missing_email', label: 'Missing Email', icon: Mail, count: count(c => !c.email), filter: c => !c.email },
    { key: 'missing_menu', label: 'Missing Menu', icon: Link2, count: count(c => !c.menu_url), filter: c => !c.menu_url },
    { key: 'missing_bio', label: 'Missing Bio', icon: BookOpen, count: count(c => !c.bio_url && !c.bio_page), filter: c => !c.bio_url && !c.bio_page },
  ];

  const status = [
    { key: 'flagged', label: 'Flagged for Review', icon: AlertTriangle, count: count(c => c.status === 'Flagged'), filter: c => c.status === 'Flagged' },
    { key: 'do_not_book', label: 'Do Not Book', icon: XCircle, count: count(c => c.status === 'Do Not Book'), filter: c => c.status === 'Do Not Book' },
    { key: 'non_chef', label: 'Possible Non-Chef', icon: ChefHat, count: count(isPossibleNonChef), filter: isPossibleNonChef },
  ];

  const positive = [
    { key: 'multi_area', label: 'Multi-area Chefs', icon: Users, count: count(c => (c.home_areas || []).length > 1), filter: c => (c.home_areas || []).length > 1 },
  ];

  const tier2 = [
    { key: 'missing_cuisine', label: 'Missing Cuisine', icon: ChefHat, count: count(c => !(c.cuisines || []).length), filter: c => !(c.cuisines || []).length },
    { key: 'missing_rating', label: 'Missing Rating', icon: Star, count: count(c => !c.quality_rating), filter: c => !c.quality_rating },
    { key: 'missing_price', label: 'Missing Price Tier', icon: DollarSign, count: count(c => !c.price_tier), filter: c => !c.price_tier },
  ];

  return { tier1, status, positive, tier2, active };
}

// Tier-1 completeness: a chef is "complete" if phone + email + menu + (bio_url OR bio_page) all filled
function isT1Complete(c) {
  return !!(c.phone && c.email && c.menu_url && (c.bio_url || c.bio_page));
}

// Export queue to xlsx
async function exportToExcel(chefs, filterLabel) {
  const xlsx = await import('xlsx');
  const rows = chefs.map(c => ({
    'First Name': c.first_name,
    'Last Name': c.last_name,
    'Email': c.email || '',
    'Phone': c.phone || '',
    'Menu URL': c.menu_url || '',
    'Bio URL': c.bio_url || '',
    'Bio Page': c.bio_page || '',
    'Status': c.status || 'Active',
    'Areas': (c.home_areas || []).join(', '),
    'Cuisines': (c.cuisines || []).join(', '),
    'Rating': c.quality_rating || '',
    'Price Tier': c.price_tier || '',
    'Notes': c.notes || '',
  }));
  const ws = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Data Health');
  xlsx.writeFile(wb, `gradito-data-health-${filterLabel.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}

export default function DataHealth() {
  const { data: chefs } = useChefs();
  const [activeFilter, setActiveFilter] = useState(null);
  const [filterArea, setFilterArea] = useState('all');
  const [resolvedIds, setResolvedIds] = useState(new Set());

  const markReviewed = (id) => setResolvedIds(prev => new Set([...prev, id]));

  const { tier1, status, positive, tier2, active } = useMemo(() => buildGroups(chefs), [chefs]);

  // All unique areas from roster for secondary filter
  const allAreas = useMemo(() => {
    const s = new Set();
    chefs.forEach(c => (c.home_areas || []).forEach(a => s.add(a)));
    return [...s].sort();
  }, [chefs]);

  // Chefs in the active queue, respecting the area secondary filter
  const queueChefs = useMemo(() => {
    if (!activeFilter) return [];
    const allChecks = [...tier1, ...status, ...positive, ...tier2];
    const check = allChecks.find(c => c.key === activeFilter);
    if (!check) return [];
    return active
      .filter(check.filter)
      .filter(c => filterArea === 'all' || (c.home_areas || []).includes(filterArea));
  }, [activeFilter, tier1, status, positive, tier2, active, filterArea]);

  const activeLabel = useMemo(() => {
    const allChecks = [...tier1, ...status, ...positive, ...tier2];
    return allChecks.find(c => c.key === activeFilter)?.label || '';
  }, [activeFilter, tier1, status, positive, tier2]);

  const t1Complete = useMemo(() => active.filter(isT1Complete).length, [active]);

  const cardGroups = [
    { label: 'Tier 1 — Contact & Menu', checks: tier1 },
    { label: 'Status', checks: status },
    { label: 'Context', checks: positive, positive: true },
    { label: 'Tier 2 — Enrichment', checks: tier2, muted: true },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-2">
            <HeartPulse className="text-gold" size={28} />
            Data Health
          </h1>
          <p className="text-muted-foreground mt-1">Inline cleanup surface for the imported chef roster</p>
        </div>
        <div className="flex items-center gap-3">
          <CompletenessRing resolved={t1Complete} total={active.length} />
          {activeFilter && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => exportToExcel(queueChefs, activeLabel)}
            >
              <Download size={14} /> Export queue
            </Button>
          )}
        </div>
      </div>

      {/* Health cards */}
      <HealthCards
        groups={cardGroups}
        activeFilter={activeFilter}
        onFilterClick={setActiveFilter}
      />

      {/* Secondary filter */}
      {activeFilter && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Filter by area:</span>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="All areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {allAreas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Cleanup queue */}
      {activeFilter && (
        <CleanupQueue
          chefs={queueChefs}
          activeFilter={activeFilter}
          activeLabel={activeLabel}
          onClear={() => setActiveFilter(null)}
          resolvedIds={resolvedIds}
          onMarkReviewed={markReviewed}
        />
      )}

      {/* Multi-area merge visibility */}
      {activeFilter === 'multi_area' && (
        <MultiAreaPanel chefs={chefs} />
      )}

      {/* Area completeness chart */}
      <AreaCompleteness chefs={chefs} />
    </div>
  );
}