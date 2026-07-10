import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useChefs, useEvents, useEventChefs, useClients, getChefKPIs } from '@/hooks/useAppData';
import { useQueryClient } from '@tanstack/react-query';
import StatCard from '@/components/ui/StatCard';
import ChefCard from '@/components/chefs/ChefCard';
import ChefDetailPanel from '@/components/chefs/ChefDetailPanel';
import CreateEventModal from '@/components/events/CreateEventModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Star, AlertCircle, Globe, Coffee, Search, X, Plus, UserPlus, Link } from 'lucide-react';
import { CUISINES, SERVICE_AREAS } from '@/lib/constants';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Quick-add chef dialog (minimal fields, rest via intake form)
function AddChefDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', roles_available: 'Head', profile_status: 'Invited' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) return;
    setSaving(true);
    await base44.entities.Chef.create({ ...form, quality_rating: 3, home_areas: [], cuisines: [], experience_types: [], dietary_specialties: [], languages: [], travel_fees: [] });
    await base44.entities.ActivityLog.create({ actor: 'Team', action: 'Created', entity_type: 'Chef', entity_label: `${form.first_name} ${form.last_name}`, summary: `Added ${form.first_name} ${form.last_name} to the roster` });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
    toast({ title: `${form.first_name} ${form.last_name} added` });
    setSaving(false);
    setForm({ first_name: '', last_name: '', email: '', roles_available: 'Head', profile_status: 'Invited' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-heading">Add Chef</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">First Name *</label><Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="mt-1" required /></div>
            <div><label className="text-xs text-muted-foreground">Last Name *</label><Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="mt-1" required /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">Email</label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1" /></div>
          <div><label className="text-xs text-muted-foreground">Role</label>
            <Select value={form.roles_available} onValueChange={v => setForm({...form, roles_available: v})}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Head">Head Chef</SelectItem>
                <SelectItem value="Sous">Sous Chef</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-gold hover:bg-gold/80 text-white">{saving ? 'Adding…' : 'Add Chef'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Chefs() {
  const queryClient = useQueryClient();
  const { data: chefs } = useChefs();
  const { data: events } = useEvents();
  const { data: eventChefs } = useEventChefs();
  const { data: clients } = useClients();

  const [selectedChef, setSelectedChef] = useState(null);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterCuisine, setFilterCuisine] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddChef, setShowAddChef] = useState(false);
  const [createEventForChef, setCreateEventForChef] = useState(null);

  const chefKPIs = useMemo(() => {
    const map = {};
    chefs.forEach(c => { map[c.id] = getChefKPIs(c, events, eventChefs); });
    return map;
  }, [chefs, events, eventChefs]);

  const filteredChefs = useMemo(() => {
    return chefs.filter(c => {
      const name = `${c.first_name} ${c.last_name}`.toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (filterArea !== 'all' && !(c.home_areas || []).includes(filterArea)) return false;
      if (filterCuisine !== 'all' && !(c.cuisines || []).includes(filterCuisine)) return false;
      if (filterRating !== 'all' && c.quality_rating !== Number(filterRating)) return false;
      if (filterRole !== 'all' && c.roles_available !== filterRole && c.roles_available !== 'Both') return false;
      return true;
    });
  }, [chefs, search, filterArea, filterCuisine, filterRating, filterRole]);

  const totalChefs = chefs.length;
  const stars5 = chefs.filter(c => c.quality_rating === 5).length;
  const stars4 = chefs.filter(c => c.quality_rating === 4).length;
  const stars3 = chefs.filter(c => c.quality_rating === 3).length;
  const completeProfiles = chefs.filter(c => c.email && c.menu_url && c.bio_url && c.photo_url).length;
  const profilePct = totalChefs > 0 ? Math.round((completeProfiles / totalChefs) * 100) : 0;
  const travelWilling = chefs.filter(c => c.travel_policy !== 'Home only').length;
  const benchChefs = chefs.filter(c => (chefKPIs[c.id]?.eventsCount || 0) === 0).length;
  const hasFilters = search || filterArea !== 'all' || filterCuisine !== 'all' || filterRating !== 'all' || filterRole !== 'all';

  const clearFilters = () => { setSearch(''); setFilterArea('all'); setFilterCuisine('all'); setFilterRating('all'); setFilterRole('all'); };

  // Inline quick-edit handlers for the roster cards
  const handleRatingChange = async (chef, newRating, e) => {
    e.stopPropagation();
    await base44.entities.Chef.update(chef.id, { quality_rating: newRating });
    await base44.entities.ActivityLog.create({ actor: 'Team', action: 'Updated', entity_type: 'Chef', entity_label: `${chef.first_name} ${chef.last_name}`, summary: `Set quality rating to ${newRating}★` });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
    toast({ title: `${chef.first_name} updated to ${newRating}★` });
  };

  const handleStatusChange = async (chef, newStatus, e) => {
    e.stopPropagation();
    await base44.entities.Chef.update(chef.id, { profile_status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
    toast({ title: `${chef.first_name} status → ${newStatus}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Chefs</h1>
          <p className="text-muted-foreground mt-1">Your complete chef roster and intelligence</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/intake`); toast({ title: 'Intake link copied' }); }}>
            <Link size={16} className="mr-2" /> Copy Intake Link
          </Button>
          <Button onClick={() => setShowAddChef(true)} className="bg-navy hover:bg-navy/90 text-white">
            <Plus size={16} className="mr-2" /> Add Chef
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total Chefs" value={totalChefs} icon={Users} />
        <StatCard title="Quality Tier" value={`${stars5}·${stars4}·${stars3}`} subtitle="5★ · 4★ · 3★" icon={Star} accent />
        <StatCard title="Complete Profiles" value={`${profilePct}%`} subtitle={`${completeProfiles} of ${totalChefs}`} icon={AlertCircle} />
        <StatCard title="Will Travel" value={travelWilling} icon={Globe} />
        <StatCard title="Bench" value={benchChefs} subtitle="0 events" icon={Coffee} />
        <StatCard title="Incomplete" value={chefs.filter(c => c.profile_status !== 'Complete').length} subtitle="Invited / In Progress" icon={AlertCircle} />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search chefs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {SERVICE_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCuisine} onValueChange={setFilterCuisine}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Cuisine" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cuisines</SelectItem>
            {CUISINES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="5">5★</SelectItem>
            <SelectItem value="4">4★</SelectItem>
            <SelectItem value="3">3★</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Head">Head</SelectItem>
            <SelectItem value="Sous">Sous</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Chef grid with inline quick-edit overlay */}
      {filteredChefs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChefs.map(chef => (
            <div key={chef.id} className="relative group">
              <ChefCard chef={chef} kpis={chefKPIs[chef.id]} onClick={setSelectedChef} />
              {/* Inline quick-edit controls — shown on hover */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                {/* Star quick-edit */}
                {[3, 4, 5].map(r => (
                  <button
                    key={r}
                    onClick={e => handleRatingChange(chef, r, e)}
                    title={`Set ${r}★`}
                    className={`w-6 h-6 rounded text-xs font-bold transition-all border ${
                      chef.quality_rating === r ? 'bg-gold text-white border-gold' : 'bg-card text-muted-foreground border-border hover:border-gold hover:text-gold'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                {/* Status quick-edit */}
                <div onClick={e => e.stopPropagation()}>
                  <Select value={chef.profile_status} onValueChange={val => handleStatusChange(chef, val, { stopPropagation: () => {} })}>
                    <SelectTrigger className="h-6 w-28 text-xs border-border bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Invited">Invited</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                      <SelectItem value="Stale">Stale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <UserPlus size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          {hasFilters ? (
            <>
              <p className="text-muted-foreground mb-3">No chefs match your filters</p>
              <Button variant="outline" onClick={clearFilters} size="sm">Clear filters</Button>
            </>
          ) : (
            <>
              <p className="font-heading text-lg font-semibold mb-1">No chefs yet</p>
              <p className="text-muted-foreground text-sm mb-4">Add your first chef to get started</p>
              <Button onClick={() => setShowAddChef(true)} className="bg-gold hover:bg-gold/80 text-white">
                <Plus size={16} className="mr-2" /> Add Chef
              </Button>
            </>
          )}
        </div>
      )}

      <ChefDetailPanel
        chef={selectedChef}
        kpis={selectedChef ? chefKPIs[selectedChef.id] : null}
        events={events}
        eventChefs={eventChefs}
        clients={clients}
        open={!!selectedChef}
        onClose={() => setSelectedChef(null)}
        onCreateEvent={(chef) => { setSelectedChef(null); setCreateEventForChef(chef); }}
      />

      <AddChefDialog open={showAddChef} onClose={() => setShowAddChef(false)} />

      <CreateEventModal
        open={!!createEventForChef}
        onClose={() => setCreateEventForChef(null)}
        chefs={chefs}
        clients={clients}
        eventChefs={eventChefs}
        prefillChef={createEventForChef}
      />
    </div>
  );
}