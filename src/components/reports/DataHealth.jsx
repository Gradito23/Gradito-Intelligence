import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useChefs } from '@/hooks/useAppData';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, Link2, BookOpen, AlertTriangle, XCircle, CheckCircle2, Star, ChefHat, DollarSign, Users } from 'lucide-react';

// ─── Tier definitions ─────────────────────────────────────────────────────────

const TIER1_CHECKS = [
  { key: 'missing_phone',    label: 'Missing Phone',     icon: Phone,    test: c => !c.phone && !c.mobile },
  { key: 'missing_email',    label: 'Missing Email',     icon: Mail,     test: c => !c.email },
  { key: 'missing_menu',     label: 'Missing Menu Link', icon: Link2,    test: c => !c.menu_url },
  { key: 'missing_bio',      label: 'Missing Bio Link',  icon: BookOpen, test: c => !c.bio_url },
  { key: 'flagged',          label: 'Flagged',           icon: AlertTriangle, test: c => c.status === 'Flagged' },
  { key: 'do_not_book',      label: 'Do Not Book',       icon: XCircle,  test: c => c.status === 'Do Not Book' },
  { key: 'incomplete_t1',    label: 'Any T1 Gap',        icon: AlertTriangle, test: c => !c.phone && !c.mobile || !c.email || !c.menu_url || !c.bio_url },
];

const TIER2_CHECKS = [
  { key: 'missing_cuisine',  label: 'Missing Cuisine',   icon: ChefHat,  test: c => !c.cuisines?.length },
  { key: 'missing_rating',   label: 'Missing Rating',    icon: Star,     test: c => !c.quality_rating },
  { key: 'missing_price',    label: 'Missing Price Tier',icon: DollarSign, test: c => !c.price_tier },
];

const POSITIVE_CHECKS = [
  { key: 'multi_area',       label: 'Multi-area chefs',  icon: Users,    test: c => (c.home_areas || []).length > 1 },
];

// ─── Inline editable cell ─────────────────────────────────────────────────────

function EditableCell({ value, field, chefId, placeholder = '—', isHighlighted, isTextarea }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value || '');
  const inputRef = useRef(null);

  const save = async () => {
    if (local !== (value || '')) {
      await base44.entities.Chef.update(chefId, { [field]: local || null });
      await base44.entities.ActivityLog.create({
        actor: 'Team', action: 'Updated', entity_type: 'Chef',
        summary: `Updated ${field} via Data Health`,
      });
      queryClient.invalidateQueries({ queryKey: ['chefs'] });
    }
    setEditing(false);
  };

  if (editing) {
    const cls = 'border border-gold rounded px-2 py-1 text-sm w-full bg-background focus:outline-none focus:ring-1 focus:ring-gold';
    return isTextarea
      ? <textarea ref={inputRef} className={cls} value={local} onChange={e => setLocal(e.target.value)} onBlur={save} rows={2} autoFocus />
      : <input ref={inputRef} className={cls} value={local} onChange={e => setLocal(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setLocal(value || ''); setEditing(false); } }} autoFocus />;
  }

  return (
    <span
      className={`cursor-pointer rounded px-1 py-0.5 text-sm transition-colors ${isHighlighted ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'hover:bg-secondary'}`}
      onClick={() => { setLocal(value || ''); setEditing(true); setTimeout(() => inputRef.current?.focus(), 50); }}
    >
      {value || <span className="text-amber-500 italic">{placeholder}</span>}
    </span>
  );
}

function StatusCell({ chef }) {
  const queryClient = useQueryClient();
  const save = async (val) => {
    await base44.entities.Chef.update(chef.id, { status: val });
    await base44.entities.ActivityLog.create({ actor: 'Team', action: 'Updated', entity_type: 'Chef', summary: `Set ${chef.first_name} ${chef.last_name} status → ${val}` });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
  };
  const colors = { Active: 'bg-emerald-100 text-emerald-800', Flagged: 'bg-amber-100 text-amber-800', 'Do Not Book': 'bg-red-100 text-red-800' };
  return (
    <Select value={chef.status || 'Active'} onValueChange={save}>
      <SelectTrigger className={`h-7 w-28 text-xs border-0 ${colors[chef.status || 'Active']}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Active">Active</SelectItem>
        <SelectItem value="Flagged">Flagged</SelectItem>
        <SelectItem value="Do Not Book">Do Not Book</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── Completeness by Area ─────────────────────────────────────────────────────

function AreaCompleteness({ chefs }) {
  const areaData = useMemo(() => {
    const map = {};
    chefs.forEach(chef => {
      (chef.home_areas || []).forEach(area => {
        if (!map[area]) map[area] = { area, total: 0, complete: 0 };
        map[area].total++;
        const t1Complete = (chef.phone || chef.mobile) && chef.email && chef.menu_url && chef.bio_url;
        if (t1Complete) map[area].complete++;
      });
    });
    return Object.values(map)
      .map(d => ({ ...d, pct: d.total > 0 ? Math.round((d.complete / d.total) * 100) : 0 }))
      .sort((a, b) => a.pct - b.pct);
  }, [chefs]);

  return (
    <Card className="p-4">
      <h3 className="font-medium text-sm mb-4">Tier-1 Completeness by Service Area</h3>
      <div className="space-y-2">
        {areaData.map(d => (
          <div key={d.area} className="flex items-center gap-3">
            <span className="text-sm w-44 truncate shrink-0">{d.area}</span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${d.pct < 40 ? 'bg-red-400' : d.pct < 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${d.pct}%` }}
              />
            </div>
            <span className={`text-xs font-medium w-10 text-right ${d.pct < 40 ? 'text-red-600' : d.pct < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {d.pct}%
            </span>
            <span className="text-xs text-muted-foreground w-16">{d.complete}/{d.total} chefs</span>
          </div>
        ))}
        {areaData.length === 0 && <p className="text-sm text-muted-foreground">No service area data yet.</p>}
      </div>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DataHealth() {
  const { data: chefs } = useChefs();
  const [activeFilter, setActiveFilter] = useState(null);

  const counts = useMemo(() => {
    const out = {};
    [...TIER1_CHECKS, ...TIER2_CHECKS, ...POSITIVE_CHECKS].forEach(c => {
      out[c.key] = chefs.filter(c.test).length;
    });
    return out;
  }, [chefs]);

  const filteredChefs = useMemo(() => {
    if (!activeFilter) return [];
    const check = [...TIER1_CHECKS, ...TIER2_CHECKS, ...POSITIVE_CHECKS].find(c => c.key === activeFilter);
    return check ? chefs.filter(check.test) : [];
  }, [chefs, activeFilter]);

  const activeCheck = [...TIER1_CHECKS, ...TIER2_CHECKS, ...POSITIVE_CHECKS].find(c => c.key === activeFilter);

  // Which fields to highlight for the active filter
  const highlightField = {
    missing_phone: 'phone', missing_email: 'email',
    missing_menu: 'menu_url', missing_bio: 'bio_url',
    flagged: null, do_not_book: null, incomplete_t1: null,
    missing_cuisine: null, missing_rating: null, missing_price: 'price_tier',
    multi_area: null,
  };

  return (
    <div className="space-y-6">
      {/* Tier 1 health cards */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tier 1 — Contact & Menu</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {TIER1_CHECKS.map(check => {
            const Icon = check.icon;
            const isActive = activeFilter === check.key;
            const count = counts[check.key];
            return (
              <button
                key={check.key}
                onClick={() => setActiveFilter(isActive ? null : check.key)}
                className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${isActive ? 'border-gold bg-gold/5 shadow-sm' : 'border-border bg-card hover:border-muted-foreground/30'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={count > 0 ? 'text-amber-500' : 'text-muted-foreground'} />
                  <span className="text-xs text-muted-foreground">{check.label}</span>
                </div>
                <p className={`text-2xl font-bold font-heading ${count > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{count}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tier 2 + positive */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tier 2 — Enrichment (fill via intake)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...TIER2_CHECKS, ...POSITIVE_CHECKS].map(check => {
            const Icon = check.icon;
            const isActive = activeFilter === check.key;
            const count = counts[check.key];
            const isPositive = POSITIVE_CHECKS.find(c => c.key === check.key);
            return (
              <button
                key={check.key}
                onClick={() => setActiveFilter(isActive ? null : check.key)}
                className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${isActive ? 'border-gold bg-gold/5' : 'border-border bg-card opacity-75 hover:opacity-100'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{check.label}</span>
                </div>
                <p className={`text-2xl font-bold font-heading ${isPositive ? 'text-blue-600' : count > 0 ? 'text-muted-foreground' : 'text-emerald-600'}`}>{count}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Worklist */}
      {activeFilter && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-secondary/30 flex items-center gap-2">
            {activeCheck && <activeCheck.icon size={14} className="text-gold" />}
            <span className="font-medium text-sm">{activeCheck?.label}</span>
            <Badge variant="outline" className="text-xs ml-1">{filteredChefs.length} chefs</Badge>
            <button onClick={() => setActiveFilter(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear filter</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/20">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Areas</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Menu</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Bio</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredChefs.map(chef => {
                  const hf = highlightField[activeFilter];
                  return (
                    <tr key={chef.id} className="border-b hover:bg-secondary/20">
                      <td className="p-3 font-medium whitespace-nowrap">{chef.first_name} {chef.last_name}</td>
                      <td className="p-3"><StatusCell chef={chef} /></td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[140px]">{(chef.home_areas || []).join(', ') || '—'}</td>
                      <td className="p-3">
                        <EditableCell value={chef.phone || chef.mobile} field="phone" chefId={chef.id} placeholder="add phone" isHighlighted={hf === 'phone' || (!chef.phone && !chef.mobile)} />
                      </td>
                      <td className="p-3">
                        <EditableCell value={chef.email} field="email" chefId={chef.id} placeholder="add email" isHighlighted={hf === 'email' || !chef.email} />
                      </td>
                      <td className="p-3">
                        <EditableCell value={chef.menu_url} field="menu_url" chefId={chef.id} placeholder="add menu link" isHighlighted={hf === 'menu_url' || !chef.menu_url} />
                      </td>
                      <td className="p-3">
                        <EditableCell value={chef.bio_url} field="bio_url" chefId={chef.id} placeholder="add bio link" isHighlighted={hf === 'bio_url' || !chef.bio_url} />
                      </td>
                      <td className="p-3 min-w-[180px]">
                        <EditableCell value={chef.notes} field="notes" chefId={chef.id} placeholder="add notes" isHighlighted={false} isTextarea />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Area completeness */}
      <AreaCompleteness chefs={chefs} />
    </div>
  );
}