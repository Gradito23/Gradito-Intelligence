import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CUISINES, EXPERIENCE_TYPES, SERVICE_AREAS, DIETARY_SPECIALTIES } from '@/lib/constants';
import { toast } from '@/components/ui/use-toast';
import GraditoLogo from '@/components/brand/GraditoLogo';
import { CheckCircle, ChefHat, Loader2, Plus, Upload, X, Calendar } from 'lucide-react';

export default function ChefIntake() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [extraLinks, setExtraLinks] = useState([]);
  const [customHomeArea, setCustomHomeArea] = useState('');
  const [customCuisine, setCustomCuisine] = useState('');
  const [customExperience, setCustomExperience] = useState('');
  const [blackoutDateEntry, setBlackoutDateEntry] = useState({ start: '', end: '' });
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', mobile: '',
    photo_url: '', menu_url: '', bio_url: '', bio_details: '',
    roles_available: 'Head',
    travel_policy: 'Home only',
    default_travel_fee: 0,
    max_solo_guests: 12,
    equipment_notes: '', signature_experiences: '',
    home_areas: [], cuisines: [], experience_types: [],
    dietary_specialties: [], languages: [],
    blackout_holidays: [], blackout_dates: [], availability_notes: '',
  });

  const toggleArray = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const addCustomToArray = (field, value, setter) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!form[field].includes(trimmed)) {
      setForm(prev => ({ ...prev, [field]: [...prev[field], trimmed] }));
    }
    setter('');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, photo_url: file_url }));
    } catch (err) {
      toast({
        title: 'Photo upload failed',
        description: err.message || 'Could not upload photo.',
        variant: 'destructive',
      });
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const addExtraLink = () => setExtraLinks(prev => [...prev, '']);
  const updateExtraLink = (i, val) => setExtraLinks(prev => prev.map((l, idx) => idx === i ? val : l));
  const removeExtraLink = (i) => setExtraLinks(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');
    const { bio_details, ...chefFields } = form;
    const allLinks = [form.bio_url, ...extraLinks].filter(Boolean).join('\n');
    try {
      await base44.entities.ChefIntakeRequest.create({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        mobile: form.mobile || null,
        photo_url: form.photo_url || null,
        status: 'pending',
        payload: {
          ...chefFields,
          bio_url: allLinks || undefined,
          notes: bio_details || undefined,
        },
      });
      try {
        await base44.entities.ActivityLog.create({
          actor: 'Intake Form',
          action: 'Created',
          entity_type: 'Intake',
          entity_label: `${form.first_name} ${form.last_name}`,
          summary: `Chef ${form.first_name} ${form.last_name} submitted intake form (pending review)`,
        });
      } catch {
        // Activity log requires auth; do not fail the chef's thank-you flow
      }
      setSubmitted(true);
    } catch (err) {
      const message = err.message || 'Something went wrong. Please try again.';
      setSubmitError(message);
      toast({ title: 'Submission failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-gold mb-4" />
          <h2 className="font-heading text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-muted-foreground">Your profile has been submitted to the Gradito team for review. We'll be in touch soon.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-navy py-8 px-4 text-center">
        <div className="flex justify-center text-white">
          <GraditoLogo className="h-9 w-auto" title="Gradito" />
        </div>
        <p className="text-gold text-sm mt-2 tracking-widest uppercase">Chef Intake Form</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Personal Information */}
        <Card className="p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required /></div>
            <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Mobile</Label><Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} /></div>

          {/* Profile Photo Upload */}
          <div>
            <Label>Profile Photo</Label>
            <div className="mt-2 flex items-center gap-4">
              {form.photo_url ? (
                <img src={form.photo_url} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <ChefHat className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <div className="flex items-center gap-2 px-4 py-2 border border-input rounded-md text-sm hover:bg-muted transition-colors">
                  {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {photoUploading ? 'Uploading...' : 'Upload Photo'}
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* Portfolio */}
        <Card className="p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Bio</h3>
          <div><Label>Bio Link</Label><Input placeholder="https://..." value={form.bio_url} onChange={e => setForm({ ...form, bio_url: e.target.value })} /></div>

          {extraLinks.map((link, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input placeholder="https://..." value={link} onChange={e => updateExtraLink(i, e.target.value)} className="flex-1" />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeExtraLink(i)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addExtraLink} className="gap-2">
            <Plus className="w-4 h-4" /> Add Link
          </Button>

          <div>
            <Label>Bio Details</Label>
            <Textarea
              value={form.bio_details}
              onChange={e => setForm({ ...form, bio_details: e.target.value })}
              placeholder="Paste your bio, background, or any notes about yourself..."
              className="min-h-[120px] mt-1"
            />
          </div>
        </Card>

        {/* Role & Availability */}
        <Card className="p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Role & Availability</h3>
          <div>
            <Label>Role</Label>
            <Select value={form.roles_available} onValueChange={v => setForm({ ...form, roles_available: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Head">Head Chef</SelectItem>
                <SelectItem value="Sous">Sous Chef</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max Solo Guests</Label>
            <Input type="number" value={form.max_solo_guests} onChange={e => setForm({ ...form, max_solo_guests: Number(e.target.value) })} />
          </div>
        </Card>

        {/* Service Areas */}
        <Card className="p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Service Areas</h3>
          <Label>Home Areas (no travel fee)</Label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_AREAS.map(area => (
              <label key={area} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.home_areas.includes(area)} onCheckedChange={() => toggleArray('home_areas', area)} />
                {area}
              </label>
            ))}
            {form.home_areas.filter(a => !SERVICE_AREAS.includes(a)).map(a => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <Checkbox checked onCheckedChange={() => toggleArray('home_areas', a)} />
                {a}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add custom area..." value={customHomeArea} onChange={e => setCustomHomeArea(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomToArray('home_areas', customHomeArea, setCustomHomeArea); }}} />
            <Button type="button" variant="outline" onClick={() => addCustomToArray('home_areas', customHomeArea, setCustomHomeArea)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div>
            <Label>Travel Policy</Label>
            <Select value={form.travel_policy} onValueChange={v => setForm({ ...form, travel_policy: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Home only">Home only</SelectItem>
                <SelectItem value="Select areas">Select areas</SelectItem>
                <SelectItem value="Anywhere">Anywhere</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.travel_policy === 'Anywhere' && (
            <div><Label>Default Travel Fee</Label><Input type="number" value={form.default_travel_fee} onChange={e => setForm({ ...form, default_travel_fee: Number(e.target.value) })} /></div>
          )}
        </Card>

        {/* Availability */}
        <Card className="p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Availability</h3>

          <div>
            <Label className="block mb-2">Blackout Dates — Holidays</Label>
            <p className="text-sm text-muted-foreground mb-3">Select any holidays you do not work.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'New Year\'s Day', 'Martin Luther King Jr. Day', 'Presidents\' Day',
                'Memorial Day', 'Juneteenth', 'Independence Day (July 4)', 'Labor Day',
                'Indigenous Peoples\' / Columbus Day', 'Veterans Day', 'Thanksgiving',
                'Day after Thanksgiving', 'Christmas Eve', 'Christmas Day', 'New Year\'s Eve',
              ].map(h => (
                <label key={h} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.blackout_holidays.includes(h)}
                    onCheckedChange={() => toggleArray('blackout_holidays', h)}
                  />
                  {h}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="block mb-2">Blackout Dates — Specific Dates</Label>
            {form.blackout_dates.length > 0 && (
              <div className="space-y-2 mb-3">
                {form.blackout_dates.map((d, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted rounded-md px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {d.start}{d.end && d.end !== d.start ? ` → ${d.end}` : ''}
                    </span>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, blackout_dates: prev.blackout_dates.filter((_, idx) => idx !== i) }))}>
                      <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                <Input type="date" value={blackoutDateEntry.start} onChange={e => setBlackoutDateEntry(p => ({ ...p, start: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">End Date (optional)</label>
                <Input type="date" value={blackoutDateEntry.end} onChange={e => setBlackoutDateEntry(p => ({ ...p, end: e.target.value }))} />
              </div>
              <Button type="button" variant="outline" className="gap-1" onClick={() => {
                if (!blackoutDateEntry.start) return;
                setForm(prev => ({ ...prev, blackout_dates: [...prev.blackout_dates, { start: blackoutDateEntry.start, end: blackoutDateEntry.end || blackoutDateEntry.start }] }));
                setBlackoutDateEntry({ start: '', end: '' });
              }}>
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
          </div>

          <div>
            <Label>Additional Availability Notes</Label>
            <Textarea
              value={form.availability_notes}
              onChange={e => setForm({ ...form, availability_notes: e.target.value })}
              placeholder="e.g. Only available weekends through summer, no events before 5pm on weekdays..."
              className="min-h-[80px] mt-1"
            />
          </div>
        </Card>

        {/* Cuisines */}
        <Card className="p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Cuisines</h3>
          <div className="grid grid-cols-2 gap-2">
            {CUISINES.map(c => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.cuisines.includes(c)} onCheckedChange={() => toggleArray('cuisines', c)} />
                {c}
              </label>
            ))}
            {form.cuisines.filter(c => !CUISINES.includes(c)).map(c => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <Checkbox checked onCheckedChange={() => toggleArray('cuisines', c)} />
                {c}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add custom cuisine..." value={customCuisine} onChange={e => setCustomCuisine(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomToArray('cuisines', customCuisine, setCustomCuisine); }}} />
            <Button type="button" variant="outline" onClick={() => addCustomToArray('cuisines', customCuisine, setCustomCuisine)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Experience Types */}
        <Card className="p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Experience Types</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPERIENCE_TYPES.map(t => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.experience_types.includes(t)} onCheckedChange={() => toggleArray('experience_types', t)} />
                {t}
              </label>
            ))}
            {form.experience_types.filter(t => !EXPERIENCE_TYPES.includes(t)).map(t => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <Checkbox checked onCheckedChange={() => toggleArray('experience_types', t)} />
                {t}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add custom experience type..." value={customExperience} onChange={e => setCustomExperience(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomToArray('experience_types', customExperience, setCustomExperience); }}} />
            <Button type="button" variant="outline" onClick={() => addCustomToArray('experience_types', customExperience, setCustomExperience)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div><Label>Signature Experiences</Label><Textarea value={form.signature_experiences} onChange={e => setForm({ ...form, signature_experiences: e.target.value })} placeholder="Describe your unique specialties..." /></div>
        </Card>

        {/* Dietary & Languages */}
        <Card className="p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Dietary & Languages</h3>
          <div className="grid grid-cols-2 gap-2">
            {DIETARY_SPECIALTIES.map(d => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.dietary_specialties.includes(d)} onCheckedChange={() => toggleArray('dietary_specialties', d)} />
                {d}
              </label>
            ))}
          </div>
          <div>
            <Label>Languages</Label>
            <Input placeholder="English, Spanish, ..." value={form.languages.join(', ')} onChange={e => setForm({ ...form, languages: e.target.value.split(',').map(l => l.trim()).filter(Boolean) })} />
          </div>
          <div><Label>Equipment Notes</Label><Textarea value={form.equipment_notes} onChange={e => setForm({ ...form, equipment_notes: e.target.value })} placeholder="Any equipment you bring..." /></div>
        </Card>

        {submitError && (
          <p className="text-sm text-destructive text-center" role="alert">{submitError}</p>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-gold hover:bg-gold/90 text-white py-6 text-lg font-heading">
          {loading ? <Loader2 className="animate-spin mr-2" /> : <ChefHat className="mr-2" />}
          Submit Profile
        </Button>
      </form>
    </div>
  );
}