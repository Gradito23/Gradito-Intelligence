import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ChefAvatar from '@/components/ui/ChefAvatar';
import GoldStars from '@/components/ui/GoldStars';
import { formatCurrency } from '@/hooks/useAppData';
import { Phone, Mail, ExternalLink, MapPin, Globe, Users, X, Plus, Save, Trash2, AlertTriangle, Link, Copy } from 'lucide-react';
import { CUISINES, SERVICE_AREAS, EXPERIENCE_TYPES, DIETARY_SPECIALTIES } from '@/lib/constants';
import { toast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';

function EditableField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">{label}</label>
      <Input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="h-8 text-sm"
      />
    </div>
  );
}

function ChipPicker({ label, selected, options, onChange }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])}
              className={`text-xs px-2 py-1 rounded-full border transition-all ${
                active
                  ? 'bg-navy text-white border-navy'
                  : 'bg-background text-muted-foreground border-border hover:border-navy hover:text-foreground'
              }`}
            >
              {active && <X size={10} className="inline mr-1" />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TravelFeeTable({ fees, onChange }) {
  const [newArea, setNewArea] = useState('');
  const [newFee, setNewFee] = useState('');

  const addRow = () => {
    if (!newArea || !newFee) return;
    onChange([...fees, { service_area: newArea, fee: Number(newFee) }]);
    setNewArea('');
    setNewFee('');
  };

  const removeRow = (i) => onChange(fees.filter((_, idx) => idx !== i));

  const updateFee = (i, val) => {
    const updated = [...fees];
    updated[i] = { ...updated[i], fee: Number(val) };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {fees.map((tf, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-sm flex-1 text-muted-foreground">{tf.service_area}</span>
          <Input
            type="number"
            value={tf.fee}
            onChange={e => updateFee(i, e.target.value)}
            className="w-24 h-7 text-sm"
          />
          <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Select value={newArea} onValueChange={setNewArea}>
          <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            {SERVICE_AREAS.filter(a => !fees.some(f => f.service_area === a)).map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Fee $"
          value={newFee}
          onChange={e => setNewFee(e.target.value)}
          className="w-20 h-7 text-xs"
        />
        <button
          onClick={addRow}
          disabled={!newArea || !newFee}
          className="text-gold hover:text-gold/80 disabled:opacity-40 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function BlackoutDateAdder({ onAdd }) {
  const [entry, setEntry] = useState({ start: '', end: '' });
  return (
    <div className="flex gap-1 items-end mt-1">
      <div className="flex-1">
        <label className="text-xs text-muted-foreground">Start</label>
        <Input type="date" value={entry.start} onChange={e => setEntry(p => ({ ...p, start: e.target.value }))} className="h-7 text-xs mt-0.5" />
      </div>
      <div className="flex-1">
        <label className="text-xs text-muted-foreground">End (opt.)</label>
        <Input type="date" value={entry.end} onChange={e => setEntry(p => ({ ...p, end: e.target.value }))} className="h-7 text-xs mt-0.5" />
      </div>
      <button
        type="button"
        disabled={!entry.start}
        onClick={() => { onAdd({ start: entry.start, end: entry.end || entry.start }); setEntry({ start: '', end: '' }); }}
        className="text-gold hover:text-gold/80 disabled:opacity-40 pb-0.5"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function ChefDetailPanel({ chef, kpis, events, eventChefs, clients, open, onClose, onCreateEvent }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  useEffect(() => {
    if (chef) {
      setDraft({ ...chef });
      setDirty(false);
    } else {
      setDraft(null);
      setDirty(false);
    }
  }, [chef?.id]);

  const update = useCallback((field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const save = async () => {
    if (!dirty || !draft) return;
    setSaving(true);
    await base44.entities.Chef.update(chef.id, draft);
    await base44.entities.ActivityLog.create({
      actor: 'Team',
      action: 'Updated',
      entity_type: 'Chef',
      entity_label: `${draft.first_name} ${draft.last_name}`,
      summary: `Updated chef profile for ${draft.first_name} ${draft.last_name}`,
    });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
    queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    toast({ title: `${draft.first_name} ${draft.last_name} updated` });
    setSaving(false);
    setDirty(false);
  };

  const handleClose = (nextOpen) => {
    if (nextOpen === true) return;
    if (dirty) {
      setUnsavedOpen(true);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    await base44.entities.Chef.delete(chef.id);
    await base44.entities.ActivityLog.create({
      actor: 'Team',
      action: 'Deleted',
      entity_type: 'Chef',
      entity_label: `${chef.first_name} ${chef.last_name}`,
      summary: `Deleted chef ${chef.first_name} ${chef.last_name}`,
    });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
    toast({ title: `${chef.first_name} ${chef.last_name} removed` });
    onClose();
  };

  const copyIntakeLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/intake`);
    toast({ title: 'Intake link copied!' });
  };

  if (!chef || !draft) return null;

  const fullName = `${draft.first_name} ${draft.last_name}`;
  const chefAssignments = eventChefs.filter(ec => ec.chef_id === chef.id);
  const chefEventIds = [...new Set(chefAssignments.map(ec => ec.event_id))];
  const chefEvents = events.filter(e => chefEventIds.includes(e.id)).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col" onEscapeKeyDown={(e) => { e.preventDefault(); handleClose(false); }}>
        {/* Header */}
        <TooltipProvider>
          <div className="bg-navy p-5 text-white shrink-0">
            <div className="flex items-start gap-4">
              <ChefAvatar photoUrl={draft.photo_url} name={fullName} size="xl" />
              <div className="flex-1 min-w-0">
                <SheetHeader className="p-0">
                  <SheetTitle className="text-white font-heading text-xl">{fullName}</SheetTitle>
                </SheetHeader>
                {/* Inline star rating */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 mt-1 w-fit">
                      {[3, 4, 5].map(r => (
                        <button
                          key={r}
                          onClick={() => update('quality_rating', r)}
                          className={`text-xs px-2 py-0.5 rounded border transition-all ${
                            draft.quality_rating === r ? 'bg-gold border-gold text-white' : 'border-white/30 text-white/60 hover:border-gold hover:text-gold'
                          }`}
                        >
                          {r}★
                        </button>
                      ))}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs bg-navy border-white/20">
                    Quality Rating — Gradito Stars (3–5). Click to set this chef's tier.
                  </TooltipContent>
                </Tooltip>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Select value={draft.roles_available} onValueChange={v => update('roles_available', v)}>
                    <SelectTrigger className="h-6 text-xs w-auto bg-white/10 border-white/20 text-white px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Head">Head</SelectItem>
                      <SelectItem value="Sous">Sous</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Select value={draft.profile_status} onValueChange={v => update('profile_status', v)}>
                          <SelectTrigger className="h-6 text-xs w-auto bg-gold/20 border-gold/30 text-gold px-2">
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
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs bg-navy border-white/20 max-w-xs">
                      Chef Intake Status — progress on this chef's intake form. Invited → In Progress → Complete → Stale (needs updating).
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Select value={draft.status} onValueChange={v => update('status', v)}>
                          <SelectTrigger className="h-6 text-xs w-auto bg-white/10 border-white/20 text-white px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Flagged">Flagged</SelectItem>
                            <SelectItem value="Do Not Book">Do Not Book</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs bg-navy border-white/20">
                      Booking Status — Active (bookable), Flagged (needs review), or Do Not Book.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" className="text-xs border-white/30 text-white bg-white/10 hover:bg-white/20 h-7"
              onClick={copyIntakeLink}>
              <Copy size={12} className="mr-1" /> Copy intake link
            </Button>
            {onCreateEvent && (
              <Button size="sm" className="text-xs bg-gold hover:bg-gold/80 text-white h-7"
                onClick={() => onCreateEvent(chef)}>
                <Plus size={12} className="mr-1" /> Create event
              </Button>
            )}
          </div>
          </div>
          </TooltipProvider>

        <Tabs defaultValue="overview" className="flex-1 px-4 pt-4 flex flex-col">
          <TabsList className="w-full grid grid-cols-3 mb-4 shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events ({chefEvents.length})</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pb-28">
            <TabsContent value="overview" className="space-y-4 mt-0">
              <Card className="p-4 space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Contact & Portfolio</h4>
                <EditableField label="Email" value={draft.email} onChange={v => update('email', v)} type="email" />
                <EditableField label="Mobile" value={draft.mobile} onChange={v => update('mobile', v)} />
                <EditableField label="Menu URL" value={draft.menu_url} onChange={v => update('menu_url', v)} placeholder="Canva link" />
                <EditableField label="Bio URL" value={draft.bio_url} onChange={v => update('bio_url', v)} placeholder="Canva link" />
                <EditableField label="Photo URL" value={draft.photo_url} onChange={v => update('photo_url', v)} />
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Service Areas</h4>
                <ChipPicker
                  label="Home Areas (no travel fee)"
                  selected={draft.home_areas || []}
                  options={SERVICE_AREAS}
                  onChange={v => update('home_areas', v)}
                />
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Travel Policy</label>
                  <Select value={draft.travel_policy} onValueChange={v => update('travel_policy', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Home only">Home only</SelectItem>
                      <SelectItem value="Select areas">Select areas</SelectItem>
                      <SelectItem value="Anywhere">Anywhere</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draft.travel_policy === 'Anywhere' && (
                  <EditableField label="Default Travel Fee ($)" value={draft.default_travel_fee} onChange={v => update('default_travel_fee', Number(v))} type="number" />
                )}
                {(draft.travel_policy === 'Select areas' || (draft.travel_fees || []).length > 0) && (
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-2">Per-Area Fees</label>
                    <TravelFeeTable fees={draft.travel_fees || []} onChange={v => update('travel_fees', v)} />
                  </div>
                )}
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Culinary Profile</h4>
                <ChipPicker label="Cuisines" selected={draft.cuisines || []} options={CUISINES} onChange={v => update('cuisines', v)} />
                <ChipPicker label="Experience Types" selected={draft.experience_types || []} options={EXPERIENCE_TYPES} onChange={v => update('experience_types', v)} />
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Signature Experiences</label>
                  <Textarea
                    value={draft.signature_experiences || ''}
                    onChange={e => update('signature_experiences', e.target.value)}
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Other Details</h4>
                <ChipPicker label="Dietary Specialties" selected={draft.dietary_specialties || []} options={DIETARY_SPECIALTIES} onChange={v => update('dietary_specialties', v)} />
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Languages</label>
                  <Input
                    value={(draft.languages || []).join(', ')}
                    onChange={e => update('languages', e.target.value.split(',').map(l => l.trim()).filter(Boolean))}
                    className="h-8 text-sm"
                    placeholder="English, Spanish, ..."
                  />
                </div>
                <EditableField label="Max Solo Guests" value={draft.max_solo_guests} onChange={v => update('max_solo_guests', Number(v))} type="number" />
                <EditableField label="Max Guest Capacity" value={draft.max_guest_count} onChange={v => update('max_guest_count', Number(v))} type="number" />
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Commercial Kitchen Access</label>
                  <select
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={draft.commercial_kitchen_access || ''}
                    onChange={(e) => update('commercial_kitchen_access', e.target.value || null)}
                  >
                    <option value="">—</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Depends on the project">Depends on the project</option>
                  </select>
                </div>
                <EditableField
                  label="Own Kitchen Guest Limit"
                  value={draft.own_kitchen_max_guests ?? ''}
                  onChange={(v) => update('own_kitchen_max_guests', v === '' ? null : Number(v))}
                  type="number"
                />
                <EditableField
                  label="Starting Event Fee (USD)"
                  value={draft.starting_event_fee_usd ?? ''}
                  onChange={(v) => update('starting_event_fee_usd', v === '' ? null : Number(v))}
                  type="number"
                />
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Starting Fee Flexible</label>
                  <select
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={draft.starting_fee_flexible || ''}
                    onChange={(e) => update('starting_fee_flexible', e.target.value || null)}
                  >
                    <option value="">—</option>
                    <option value="Yes">Yes</option>
                    <option value="Sometimes">Sometimes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <EditableField
                  label="Expected Compensation (USD)"
                  value={draft.expected_compensation_usd ?? ''}
                  onChange={(v) => update('expected_compensation_usd', v === '' ? null : Number(v))}
                  type="number"
                />
                <div className="grid grid-cols-2 gap-2">
                  <EditableField label="City" value={draft.city || ''} onChange={(v) => update('city', v)} />
                  <EditableField label="State" value={draft.state || ''} onChange={(v) => update('state', v)} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Personal Vehicle</label>
                  <select
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={draft.has_vehicle === true ? 'yes' : draft.has_vehicle === false ? 'no' : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      update('has_vehicle', v === 'yes' ? true : v === 'no' ? false : null);
                    }}
                  >
                    <option value="">—</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Equipment Notes</label>
                  <Textarea
                    value={draft.equipment_notes || ''}
                    onChange={e => update('equipment_notes', e.target.value)}
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Availability</h4>
                <ChipPicker
                  label="Blackout Holidays"
                  selected={draft.blackout_holidays || []}
                  options={[
                    "New Year's Day", "Martin Luther King Jr. Day", "Presidents' Day",
                    "Memorial Day", "Juneteenth", "Independence Day (July 4)", "Labor Day",
                    "Indigenous Peoples' / Columbus Day", "Veterans Day", "Thanksgiving",
                    "Day after Thanksgiving", "Christmas Eve", "Christmas Day", "New Year's Eve",
                  ]}
                  onChange={v => update('blackout_holidays', v)}
                />
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-2">Blackout Dates</label>
                  {(draft.blackout_dates || []).map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted rounded px-2 py-1 text-xs mb-1">
                      <span>{d.start}{d.end && d.end !== d.start ? ` → ${d.end}` : ''}</span>
                      <button type="button" onClick={() => update('blackout_dates', (draft.blackout_dates || []).filter((_, idx) => idx !== i))}>
                        <X size={12} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                  <BlackoutDateAdder onAdd={d => update('blackout_dates', [...(draft.blackout_dates || []), d])} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Availability Notes</label>
                  <Textarea
                    value={draft.availability_notes || ''}
                    onChange={e => update('availability_notes', e.target.value)}
                    className="text-sm resize-none"
                    rows={2}
                    placeholder="e.g. Only available weekends through summer..."
                  />
                </div>
              </Card>

              {/* Delete */}
              <div className="pt-2 pb-4">
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                    <Trash2 size={12} /> Remove chef from roster
                  </button>
                ) : (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-destructive flex items-center gap-2"><AlertTriangle size={14} /> Remove {fullName} from the roster?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={handleDelete} className="h-7 text-xs">Yes, remove</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)} className="h-7 text-xs">Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-3 mt-0">
              {chefEvents.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground mb-3">No events yet</p>
                  {onCreateEvent && (
                    <Button size="sm" onClick={() => onCreateEvent(chef)} className="bg-gold hover:bg-gold/80 text-white">
                      <Plus size={14} className="mr-1" /> Create first event
                    </Button>
                  )}
                </div>
              ) : chefEvents.map(event => {
                const assignment = chefAssignments.find(ec => ec.event_id === event.id);
                return (
                  <Card key={event.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{event.client_name || 'Unknown Client'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {event.service_area}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">{assignment?.role}</Badge>
                        <p className="text-sm font-medium mt-1">{formatCurrency(assignment?.fee || 0)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="earnings" className="space-y-4 mt-0">
              {kpis && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Earnings</p><p className="text-xl font-heading font-bold text-gold">{formatCurrency(kpis.totalEarnings)}</p></Card>
                    <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">Events</p><p className="text-xl font-heading font-bold">{kpis.eventsCount}</p></Card>
                    <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">Head Earnings</p><p className="text-lg font-heading font-semibold">{formatCurrency(kpis.headEarnings)}</p></Card>
                    <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">Sous Earnings</p><p className="text-lg font-heading font-semibold">{formatCurrency(kpis.sousEarnings)}</p></Card>
                  </div>
                  <Card className="p-4"><p className="text-xs text-muted-foreground">Most Booked Cuisine</p><p className="text-sm font-medium mt-1">{kpis.mostBookedCuisine}</p></Card>
                  <Card className="p-4"><p className="text-xs text-muted-foreground">Clients Worked With</p><p className="text-sm font-medium mt-1">{kpis.clientsWorkedWith} clients ({kpis.repeatClients} repeat)</p></Card>
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Sticky save bar */}
        {dirty && (
          <div className="sticky bottom-0 left-0 right-0 bg-card border-t p-3 flex items-center justify-between shadow-lg shrink-0">
            <p className="text-xs text-muted-foreground">Unsaved changes</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setDraft({ ...chef }); setDirty(false); }} className="h-8 text-xs">Discard</Button>
              <Button size="sm" onClick={save} disabled={saving} className="h-8 text-xs bg-gold hover:bg-gold/80 text-white">
                {saving ? 'Saving…' : <><Save size={12} className="mr-1" />Save changes</>}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <ConfirmDialog
      open={unsavedOpen}
      onOpenChange={setUnsavedOpen}
      title="Unsaved changes"
      description="Save before closing, discard them, or keep editing."
      cancelLabel="Keep editing"
      secondaryLabel="Discard"
      onSecondary={() => { setDirty(false); onClose(); }}
      confirmLabel="Save & close"
      loading={saving}
      onConfirm={async () => { await save(); onClose(); }}
    />
    </>
  );
}