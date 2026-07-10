import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCheck, Archive, ArrowRight, Check } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// Parse notes lines for context hints
function parseNoteHints(notes) {
  if (!notes) return [];
  return notes.split('\n')
    .map(line => line.trim())
    .filter(line =>
      line.startsWith('Phone field:') ||
      line.startsWith('Email field:') ||
      line.startsWith('Note:') ||
      line.startsWith('Menu field:')
    );
}

// Heuristic: is a value a bio-page number?
function isBioPageHint(val) {
  if (!val) return false;
  const stripped = val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return /^\d{1,3}$/.test(stripped) || /page\s*\d/.test(val.toLowerCase());
}

// Heuristic: is a value a Canva link?
function isCanvaLink(val) {
  return val && val.toLowerCase().includes('canva.com/design');
}

function removeNoteLines(notes, prefixes) {
  if (!notes) return notes;
  return notes.split('\n')
    .filter(line => !prefixes.some(p => line.trim().startsWith(p)))
    .join('\n')
    .trim() || null;
}

// Inline editable cell — Enter/Tab saves, Esc cancels
function EditableCell({ value, field, chef, placeholder = '—', highlighted, onSaved, className = '' }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value || '');
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);

  const doSave = useCallback(async () => {
    const trimmed = local.trim();
    if (trimmed !== (value || '')) {
      await base44.entities.Chef.update(chef.id, { [field]: trimmed || null });
      await base44.entities.ActivityLog.create({
        actor: 'Team', action: 'Updated', entity_type: 'Chef',
        entity_label: `${chef.first_name} ${chef.last_name}`,
        summary: `Set ${field} to "${trimmed}" via Data Health`,
      });
      queryClient.invalidateQueries({ queryKey: ['chefs'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onSaved?.();
    }
    setEditing(false);
  }, [local, value, field, chef, queryClient, onSaved]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doSave(); }
    if (e.key === 'Escape') { setLocal(value || ''); setEditing(false); }
  };

  if (editing) {
    return (
      <input
        ref={ref}
        autoFocus
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={doSave}
        onKeyDown={handleKeyDown}
        className={`border border-gold rounded px-2 py-0.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-gold w-full min-w-[120px] ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => { setLocal(value || ''); setEditing(true); }}
      className={`cursor-pointer rounded px-1 py-0.5 text-sm transition-colors inline-flex items-center gap-1 ${
        highlighted ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'hover:bg-secondary'
      } ${className}`}
    >
      {saved ? (
        <span className="text-emerald-600 flex items-center gap-1"><Check size={12} /> saved</span>
      ) : value ? (
        <span className="truncate max-w-[160px]">{value}</span>
      ) : (
        <span className="text-amber-500 italic">{placeholder}</span>
      )}
    </span>
  );
}

export default function CleanupRow({
  chef,
  activeFilter,
  selected,
  onSelect,
  onMarkReviewed,
}) {
  const queryClient = useQueryClient();
  const hints = parseNoteHints(chef.notes);

  const saveField = async (field, value, notesPatch) => {
    const patch = { [field]: value };
    if (notesPatch !== undefined) patch.notes = notesPatch;
    await base44.entities.Chef.update(chef.id, patch);
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Chef',
      entity_label: `${chef.first_name} ${chef.last_name}`,
      summary: `Data Health: set ${field} → "${value}"`,
    });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
  };

  const handleStatusChange = async (val) => {
    await base44.entities.Chef.update(chef.id, { status: val });
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Chef',
      entity_label: `${chef.first_name} ${chef.last_name}`,
      summary: `Status → ${val}`,
    });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
  };

  const handleArchive = async () => {
    await base44.entities.Chef.update(chef.id, { archived: true });
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Chef',
      entity_label: `${chef.first_name} ${chef.last_name}`,
      summary: `Archived (not a chef) via Data Health`,
    });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
    toast({ title: `${chef.first_name} ${chef.last_name} archived` });
  };

  // Smart action: move a noted value to bio_page
  const moveToBioPage = async (hintLine) => {
    const match = hintLine.match(/\d{1,3}/);
    if (!match) return;
    const pageNum = parseInt(match[0]);
    const newNotes = removeNoteLines(chef.notes, [hintLine.split(':')[0] + ':']);
    await saveField('bio_page', pageNum, newNotes || null);
    toast({ title: `Bio page set to ${pageNum}` });
  };

  // Smart action: move a noted value to menu_url or bio_url
  const moveToLink = async (hintLine, rawValue) => {
    const field = !chef.menu_url ? 'menu_url' : 'bio_url';
    const newNotes = removeNoteLines(chef.notes, [hintLine.split(':')[0] + ':']);
    await saveField(field, rawValue.trim(), newNotes || null);
    toast({ title: `Moved to ${field}` });
  };

  // Extract raw value from hint line like: "Phone field: "not page 18""
  const extractHintValue = (line) => {
    const m = line.match(/:\s*"?(.+?)"?\s*$/);
    return m ? m[1].trim() : '';
  };

  const statusColors = {
    Active: 'bg-emerald-100 text-emerald-800',
    Flagged: 'bg-amber-100 text-amber-800',
    'Do Not Book': 'bg-red-100 text-red-800',
  };

  const highlight = (field) => {
    const map = {
      missing_phone: 'phone', missing_email: 'email',
      missing_menu: 'menu_url', missing_bio: 'bio_url',
    };
    return map[activeFilter] === field;
  };

  return (
    <tr className="border-b hover:bg-secondary/20 group">
      {/* Checkbox */}
      <td className="p-2 pl-3 w-8">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="rounded border-border accent-gold"
        />
      </td>

      {/* Name */}
      <td className="p-3 font-medium whitespace-nowrap text-sm">
        <span className={`${activeFilter === 'non_chef' ? 'bg-amber-100 text-amber-800 rounded px-1' : ''}`}>
          {chef.first_name} {chef.last_name}
        </span>
      </td>

      {/* Status */}
      <td className="p-2">
        <Select value={chef.status || 'Active'} onValueChange={handleStatusChange}>
          <SelectTrigger className={`h-7 w-28 text-xs border-0 ${statusColors[chef.status || 'Active']}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Flagged">Flagged</SelectItem>
            <SelectItem value="Do Not Book">Do Not Book</SelectItem>
          </SelectContent>
        </Select>
      </td>

      {/* Areas */}
      <td className="p-2 text-xs text-muted-foreground max-w-[120px]">
        {(chef.home_areas || []).slice(0, 3).join(', ') || '—'}
        {(chef.home_areas || []).length > 3 && <span className="text-muted-foreground/60"> +{(chef.home_areas || []).length - 3}</span>}
      </td>

      {/* Phone */}
      <td className="p-2">
        <EditableCell
          value={chef.phone}
          field="phone"
          chef={chef}
          placeholder="add phone"
          highlighted={!chef.phone}
        />
      </td>

      {/* Email */}
      <td className="p-2">
        <EditableCell
          value={chef.email}
          field="email"
          chef={chef}
          placeholder="add email"
          highlighted={!chef.email}
        />
      </td>

      {/* Menu URL */}
      <td className="p-2">
        <EditableCell
          value={chef.menu_url}
          field="menu_url"
          chef={chef}
          placeholder="add menu"
          highlighted={!chef.menu_url}
        />
      </td>

      {/* Bio */}
      <td className="p-2">
        <div className="space-y-0.5">
          <EditableCell
            value={chef.bio_url}
            field="bio_url"
            chef={chef}
            placeholder="add bio url"
            highlighted={!chef.bio_url && !chef.bio_page}
          />
          {chef.bio_page && (
            <span className="text-xs text-muted-foreground block">p.{chef.bio_page}</span>
          )}
        </div>
      </td>

      {/* Smart hints from notes */}
      <td className="p-2 min-w-[180px]">
        <div className="space-y-1">
          {hints.map((hint, i) => {
            const rawVal = extractHintValue(hint);
            const showBioPage = isBioPageHint(rawVal);
            const showCanva = isCanvaLink(rawVal);
            return (
              <div key={i} className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1 space-y-1">
                <p className="text-amber-700 font-mono leading-tight truncate max-w-[200px]" title={hint}>{hint}</p>
                {showBioPage && (
                  <button
                    onClick={() => moveToBioPage(hint)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <ArrowRight size={10} /> Move to Bio Page
                  </button>
                )}
                {showCanva && (
                  <button
                    onClick={() => moveToLink(hint, rawVal)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <ArrowRight size={10} /> Move to {!chef.menu_url ? 'Menu' : 'Bio'} URL
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </td>

      {/* Actions */}
      <td className="p-2 pr-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
            onClick={onMarkReviewed}
            title="Mark reviewed — removes from queue"
          >
            <CheckCheck size={13} className="mr-1" /> Done
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-red-50"
            onClick={handleArchive}
            title="Not a chef — archive"
          >
            <Archive size={13} className="mr-1" /> Archive
          </Button>
        </div>
      </td>
    </tr>
  );
}