import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

import StepIndicator from '@/components/bulkupload/StepIndicator';
import UploadStep from '@/components/bulkupload/UploadStep';
import ChefMapStep from '@/components/bulkupload/ChefMapStep';
import EventMapStep from '@/components/bulkupload/EventMapStep';
import DryRunStep from '@/components/bulkupload/DryRunStep';
import ResultStep from '@/components/bulkupload/ResultStep';
import InvoiceUploadStep from '@/components/bulkupload/InvoiceUploadStep';
import InvoiceDryRunStep from '@/components/bulkupload/InvoiceDryRunStep';

import {
  parseSheet,
  detectChefColumnRoles,
  detectEventColumnRoles,
  rowToChefDraft,
  rowToEventDraft,
  mergeDrafts,
  normalizeName,
} from '@/components/bulkupload/importUtils';

import { mapInvoiceToDraft } from '@/lib/invoiceMapper';
import { useChefs, useServiceAreas, useTeamMembers } from '@/hooks/useAppData';
import { computeCommission } from '@/lib/commissionUtils';
import { computePnL } from '@/lib/pnlUtils';

const WIZARD_STEPS = ['Upload', 'Map Columns', 'Dry Run', 'Done'];
const INVOICE_STEPS = ['Upload PDFs', 'Review Drafts', 'Done'];

// ─── Chef commit ──────────────────────────────────────────────────────────────
async function commitChefs(dryRunResult) {
  const existingChefs = await base44.entities.Chef.list('-created_date', 500);
  const byEmail = {};
  const byName = {};
  existingChefs.forEach(c => {
    if (c.email) byEmail[c.email.toLowerCase()] = c;
    byName[normalizeName(`${c.first_name} ${c.last_name}`)] = c;
  });

  let created = 0, merged = 0;
  for (const draft of dryRunResult.merged) {
    const emailKey = draft.email ? draft.email.toLowerCase() : null;
    const nameKey = normalizeName(`${draft.first_name} ${draft.last_name}`);
    const existing = (emailKey && byEmail[emailKey]) || byName[nameKey];

    if (existing) {
      const mergedAreas = [...new Set([...(existing.home_areas || []), ...draft.home_areas])];
      const mergedNotes = [existing.notes, draft.notes].filter(Boolean).join('\n');
      await base44.entities.Chef.update(existing.id, {
        home_areas: mergedAreas,
        phone: existing.phone || draft.phone || undefined,
        email: existing.email || draft.email || undefined,
        menu_url: existing.menu_url || draft.menu_url || undefined,
        bio_url: existing.bio_url || draft.bio_url || undefined,
        bio_page: existing.bio_page || draft.bio_page || undefined,
        notes: mergedNotes || undefined,
        status: draft.status === 'Flagged' ? 'Flagged' : existing.status,
      });
      merged++;
    } else {
      await base44.entities.Chef.create({
        first_name: draft.first_name,
        last_name: draft.last_name,
        phone: draft.phone || undefined,
        email: draft.email || undefined,
        menu_url: draft.menu_url || undefined,
        bio_url: draft.bio_url || undefined,
        bio_page: draft.bio_page || undefined,
        price_tier: draft.price_tier || undefined,
        home_areas: draft.home_areas,
        status: draft.status,
        notes: draft.notes || undefined,
        quality_rating: 3,
        cuisines: [],
        experience_types: [],
        dietary_specialties: [],
        languages: [],
        travel_fees: [],
      });
      created++;
    }
  }

  const existingSAs = await base44.entities.ServiceArea.list('name', 100);
  const existingSANames = new Set(existingSAs.map(s => s.name));
  const allAreas = [...new Set(dryRunResult.merged.flatMap(d => d.home_areas))];
  for (const area of allAreas) {
    if (!existingSANames.has(area)) {
      await base44.entities.ServiceArea.create({ name: area, region: area });
    }
  }

  await base44.entities.ActivityLog.create({
    actor: 'Bulk Import',
    action: 'Created',
    entity_type: 'Chef',
    entity_label: 'Workbook Import',
    summary: `Bulk import: ${created} new chefs, ${merged} merged, ${dryRunResult.flagged.length} flagged for review`,
  });

  return { created, merged, flagged: dryRunResult.flagged.length };
}

// ─── Event commit ─────────────────────────────────────────────────────────────
async function commitEvents(dryRunResult) {
  const existingChefs = await base44.entities.Chef.list('-created_date', 500);
  const chefByName = {};
  existingChefs.forEach(c => {
    chefByName[normalizeName(`${c.first_name} ${c.last_name}`)] = c;
  });

  const existingClients = await base44.entities.Client.list('name', 200);
  const clientByName = {};
  existingClients.forEach(c => { clientByName[c.name.toLowerCase()] = c; });

  let created = 0, flagged = 0;
  for (const draft of dryRunResult.merged) {
    let clientId = null;
    const clientKey = draft.client_name?.toLowerCase();
    if (clientKey) {
      let client = clientByName[clientKey];
      if (!client) {
        client = await base44.entities.Client.create({ name: draft.client_name, type: 'Private' });
        clientByName[clientKey] = client;
      }
      clientId = client.id;
    }

    const event = await base44.entities.Event.create({
      date: draft.date,
      service_area: draft.service_area,
      client_id: clientId || undefined,
      client_name: draft.client_name || undefined,
      event_type: draft.event_type || 'Private',
      experience_type: draft.experience_type || undefined,
      cuisines_served: draft.cuisines_served || [],
      guest_count: draft.guest_count || undefined,
      client_revenue: draft.client_revenue || undefined,
      status: draft.status || 'Confirmed',
      notes: draft.notes || undefined,
    });

    if (!event?.id) {
      flagged++;
      continue;
    }

    const resolveChef = (name) => name ? chefByName[normalizeName(name)] || null : null;

    if (draft.head_chef_name) {
      const headChef = resolveChef(draft.head_chef_name);
      if (headChef) {
        await base44.entities.EventChef.create({ event_id: event.id, chef_id: headChef.id, chef_name: `${headChef.first_name} ${headChef.last_name}`, role: 'Head', fee: draft.head_chef_fee || undefined, travel_fee_applied: 0 });
      } else { flagged++; }
    }
    if (draft.sous_chef_name) {
      const sousChef = resolveChef(draft.sous_chef_name);
      if (sousChef) {
        await base44.entities.EventChef.create({ event_id: event.id, chef_id: sousChef.id, chef_name: `${sousChef.first_name} ${sousChef.last_name}`, role: 'Sous', fee: draft.sous_chef_fee || undefined, travel_fee_applied: 0 });
      } else { flagged++; }
    }
    created++;
  }

  await base44.entities.ActivityLog.create({
    actor: 'Bulk Import', action: 'Created', entity_type: 'Event',
    entity_label: 'PerfectVenue Import',
    summary: `Bulk import: ${created} events created, ${flagged} chef links unresolved (flagged)`,
  });

  return { created, merged: 0, flagged };
}

// ─── Invoice commit ───────────────────────────────────────────────────────────
async function commitInvoices(drafts, teamMembers = []) {
  const existingClients = await base44.entities.Client.list('name', 200);
  const clientByName = {};
  existingClients.forEach(c => { clientByName[c.name.toLowerCase()] = c; });

  let created = 0, chefLinksCreated = 0, chefLinksSkipped = 0, commLinesCreated = 0;

  for (const draft of drafts) {
    let clientId = null;
    const clientKey = draft.client_name?.toLowerCase();
    if (clientKey) {
      let client = clientByName[clientKey];
      if (!client) {
        client = await base44.entities.Client.create({
          name: draft.client_name,
          type: draft.event_type === 'Corporate' ? 'Corporate' : 'Private',
        });
        clientByName[clientKey] = client;
      }
      clientId = client.id;
    }

    // Normalize facilitators
    const facilitators = Array.isArray(draft.facilitators) && draft.facilitators.length > 0
      ? draft.facilitators
      : (draft.facilitator_id ? [{ team_member_id: draft.facilitator_id, split_pct: 100 }] : []);

    const event = await base44.entities.Event.create({
      perfect_venue_id:      draft.perfect_venue_id || undefined,
      date: draft.date,
      service_area: draft.service_area,
      client_id: clientId || undefined,
      client_name: draft.client_name || undefined,
      event_type: draft.event_type || 'Private',
      experience_type: draft.experience_type || undefined,
      guest_count: draft.guest_count || undefined,
      status: 'Confirmed',
      package_type: draft.package_type || 'Other / Custom',
      menu_tier: draft.menu_tier || 'None / Manual',
      // Client Charges
      experience_fee:        draft.experience_fee || 0,
      food_revenue:          draft.food_revenue || 0,
      beverage_revenue:      draft.beverage_revenue || 0,
      staffing_revenue:      draft.staffing_revenue || 0,
      rental_revenue:        draft.rental_revenue || 0,
      travel_revenue:        draft.travel_revenue || 0,
      florals_revenue:       draft.florals_revenue || 0,
      printed_menus_revenue: draft.printed_menus_revenue || 0,
      other_revenue:         draft.other_revenue || 0,
      discount:              draft.discount || 0,
      admin_fee:             draft.admin_fee || 0,
      // Excluded Charges
      gratuity:              draft.gratuity || 0,
      cc_processing:         draft.cc_processing || 0,
      sales_tax:             draft.sales_tax || 0,
      // Event Costs
      chef_food_budget:      draft.chef_food_budget || 0,
      staffing_cost:         draft.staffing_cost || 0,
      beverage_cost:         draft.beverage_cost || 0,
      rental_cost:           draft.rental_cost || 0,
      other_travel_cost:     draft.other_travel_cost || 0,
      florals_cost:          draft.florals_cost || 0,
      printed_menus_cost:    draft.printed_menus_cost || 0,
      delivery_cost:         draft.delivery_cost || 0,
      other_expenses:        draft.other_expenses || 0,
      // Attribution
      lead_type:             draft.lead_type || undefined,
      closer_id:             draft.closer_id || undefined,
      facilitators:          facilitators.length > 0 ? facilitators : undefined,
      facilitator_id:        facilitators[0]?.team_member_id || undefined,
      source_rep_id:         draft.source_rep_id || undefined,
      source_split_pct:      Number(draft.source_split_pct) || 40,
      repeat_client_bonus:   draft.repeat_client_bonus || false,
      apply_min_floor:       draft.apply_min_floor || false,
      commission_status:     'Pending',
      // Reference
      client_revenue:        (draft.experience_fee || 0) + (draft.food_revenue || 0) + (draft.beverage_revenue || 0) +
                             (draft.staffing_revenue || 0) + (draft.rental_revenue || 0) + (draft.travel_revenue || 0) +
                             (draft.florals_revenue || 0) + (draft.printed_menus_revenue || 0) + (draft.other_revenue || 0) +
                             (draft.admin_fee || 0) - (draft.discount || 0) + (draft.gratuity || 0) +
                             (draft.cc_processing || 0) + (draft.sales_tax || 0),
      invoice_number:        draft.invoice_number || undefined,
      invoice_grand_total:   draft.invoice_grand_total || undefined,
      notes:                 draft.notes || undefined,
    });

    if (!event?.id) continue;

    if (draft.head_chef_id && draft.head_chef_name) {
      await base44.entities.EventChef.create({ event_id: event.id, chef_id: draft.head_chef_id, chef_name: draft.head_chef_name, role: 'Head', fee: draft.head_chef_fee || 0, travel_fee_applied: 0 });
      chefLinksCreated++;
    } else if (draft.head_chef_name) { chefLinksSkipped++; }

    if (draft.sous_chef_id && draft.sous_chef_name) {
      await base44.entities.EventChef.create({ event_id: event.id, chef_id: draft.sous_chef_id, chef_name: draft.sous_chef_name, role: 'Sous', fee: draft.sous_chef_fee || 0, travel_fee_applied: 0 });
      chefLinksCreated++;
    } else if (draft.sous_chef_name) { chefLinksSkipped++; }

    // Generate CommissionLine records if attribution is set
    if (draft.lead_type && draft.closer_id && facilitators.length > 0) {
      const pnl = computePnL(event, (draft.head_chef_fee || 0) + (draft.sous_chef_fee || 0));
      const comm = computeCommission({ ...draft, facilitators }, pnl.commissionableProfit, teamMembers);
      const eventLabel = `${draft.client_name || ''} · ${draft.date || ''}`;
      for (const line of comm.lines) {
        await base44.entities.CommissionLine.create({
          event_id: event.id,
          event_label: eventLabel,
          team_member_id: line.team_member_id,
          team_member_name: line.team_member_name,
          role: line.role === 'Closer' ? 'Closer' : line.role === 'Facilitator' ? 'Facilitator' : 'Source Rep',
          rate_pct: line.rate_pct,
          split_pct: line.split_pct,
          basis: pnl.commissionableProfit,
          amount: line.amount,
          status: 'Pending',
          payment_status: 'Unpaid',
        });
        commLinesCreated++;
      }
    }

    created++;
  }

  const invoiceNums = drafts.map(d => d.invoice_number).filter(Boolean).join(', ');
  await base44.entities.ActivityLog.create({
    actor: 'Invoice Import', action: 'Created', entity_type: 'Event',
    entity_label: invoiceNums ? `Invoice Import: ${invoiceNums}` : 'Invoice Import',
    summary: `Imported ${created} event${created !== 1 ? 's' : ''} from PerfectVenue invoices. ${chefLinksCreated} chef assignments created, ${chefLinksSkipped} unmatched (skipped). ${commLinesCreated} commission lines generated.`,
  });

  return { created, merged: 0, flagged: chefLinksSkipped };
}

// ─── Download flagged CSV ─────────────────────────────────────────────────────
function downloadFlagged(flowType, dryRunResult) {
  const rows = dryRunResult.flagged.map(d =>
    flowType === 'chefs'
      ? { Name: `${d.first_name} ${d.last_name}`, Areas: (d.home_areas || []).join(', '), Email: d.email, Phone: d.phone, Warnings: (d._warnings || []).join('; '), Notes: d.notes }
      : { Client: d.client_name, Date: d.date, Area: d.service_area, HeadChef: d.head_chef_name, Warnings: (d._warnings || []).join('; '), Notes: d.notes }
  );
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Flagged');
  XLSX.writeFile(wb, `gradito_import_flagged_${flowType}.xlsx`);
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BulkUpload() {
  const queryClient = useQueryClient();

  const [flowType, setFlowType] = useState('chefs'); // 'chefs' | 'events' | 'invoices'
  const [step, setStep] = useState(1);
  const [workbook, setWorkbook] = useState(null);
  const [sheetMappings, setSheetMappings] = useState({});
  const [dryRunResult, setDryRunResult] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);

  // Invoice-specific state
  const [invoiceDrafts, setInvoiceDrafts] = useState([]);

  const { data: chefs = [] } = useChefs();
  const { data: serviceAreas = [] } = useServiceAreas();
  const { data: teamMembers = [] } = useTeamMembers();

  const switchFlow = (type) => {
    setFlowType(type);
    setStep(1);
    setWorkbook(null);
    setSheetMappings({});
    setDryRunResult(null);
    setCommitResult(null);
    setInvoiceDrafts([]);
  };

  // Step 1 → 2: parse spreadsheet file
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      setWorkbook(wb);
      const mappings = {};
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const { dataRows, headerRow } = parseSheet(sheetName, ws);
        const colRoles = flowType === 'chefs'
          ? detectChefColumnRoles(dataRows)
          : detectEventColumnRoles(headerRow || dataRows[0]);
        mappings[sheetName] = { colRoles, area: sheetName.trim(), dataRows, headerRow };
      }
      setSheetMappings(mappings);
      setStep(2);
    };
    reader.readAsArrayBuffer(file);
  };

  // Step 2 → 3: build dry run
  const buildDryRun = () => {
    if (flowType === 'chefs') {
      let allDrafts = [];
      for (const [, mapping] of Object.entries(sheetMappings)) {
        const { dataRows, colRoles, area } = mapping;
        for (const row of dataRows) {
          if (!row.some(c => c !== null && String(c).trim() !== '')) continue;
          const draft = rowToChefDraft(row, colRoles, area);
          if (!draft.first_name) continue;
          allDrafts.push(draft);
        }
      }
      const { merged, mergeLog } = mergeDrafts(allDrafts);
      const flagged = merged.filter(d => d.status === 'Flagged');
      setDryRunResult({ merged, mergeLog, flagged, totalRows: allDrafts.length });
    } else {
      const sheetName = workbook.SheetNames[0];
      const { dataRows, colRoles } = sheetMappings[sheetName] || {};
      const drafts = [];
      for (const row of (dataRows || [])) {
        if (!row.some(c => c !== null && String(c).trim() !== '')) continue;
        drafts.push(rowToEventDraft(row, colRoles || {}));
      }
      const flagged = drafts.filter(d => d._warnings?.length > 0);
      setDryRunResult({ merged: drafts, mergeLog: [], flagged, totalRows: drafts.length });
    }
    setStep(3);
  };

  // Step 3 → 4: commit spreadsheet
  const handleCommit = async () => {
    if (!dryRunResult) return;
    setCommitting(true);
    const result = flowType === 'chefs'
      ? await commitChefs(dryRunResult)
      : await commitEvents(dryRunResult);
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['serviceAreas'] });
    setCommitResult(result);
    setCommitting(false);
    setStep(4);
  };

  // Invoice: PDFs parsed → build drafts → step 2
  const handleInvoiceParsed = (parsedList) => {
    const drafts = parsedList.map(({ parsed, fileName }) =>
      mapInvoiceToDraft(parsed, chefs, teamMembers, serviceAreas, fileName)
    );
    setInvoiceDrafts(drafts);
    setStep(2);
  };

  const handleInvoiceDraftChange = (index, updated) => {
    setInvoiceDrafts(prev => prev.map((d, i) => i === index ? updated : d));
  };

  // Invoice: commit → step 3
  const handleInvoiceCommit = async () => {
    setCommitting(true);
    const result = await commitInvoices(invoiceDrafts, teamMembers);
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['eventChefs'] });
    queryClient.invalidateQueries({ queryKey: ['commissionLines'] });
    setCommitResult(result);
    setCommitting(false);
    setStep(3);
  };

  const reset = () => {
    setStep(1);
    setWorkbook(null);
    setSheetMappings({});
    setDryRunResult(null);
    setCommitResult(null);
    setInvoiceDrafts([]);
  };

  const isInvoice = flowType === 'invoices';
  const activeSteps = isInvoice ? INVOICE_STEPS : WIZARD_STEPS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">Bulk Upload</h1>
        <p className="text-muted-foreground mt-1">Import chefs, events, or PerfectVenue invoices</p>
      </div>

      {/* Flow selector */}
      <div className="inline-flex rounded-lg border border-border p-1 bg-secondary/30">
        {[
          { key: 'chefs', label: 'Import Chefs' },
          { key: 'events', label: 'Import Events' },
          { key: 'invoices', label: 'Import Invoices (PDF)' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchFlow(key)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              flowType === key
                ? 'bg-navy text-white shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Step indicator */}
      <StepIndicator step={step} steps={activeSteps} />

      {/* ── Spreadsheet flows ── */}
      {!isInvoice && step === 1 && <UploadStep flowType={flowType} onFile={handleFile} />}

      {!isInvoice && step === 2 && workbook && flowType === 'chefs' && (
        <ChefMapStep workbook={workbook} sheetMappings={sheetMappings} setSheetMappings={setSheetMappings} onBack={() => setStep(1)} onNext={buildDryRun} />
      )}

      {!isInvoice && step === 2 && workbook && flowType === 'events' && (
        <EventMapStep workbook={workbook} sheetMappings={sheetMappings} setSheetMappings={setSheetMappings} onBack={() => setStep(1)} onNext={buildDryRun} />
      )}

      {!isInvoice && step === 3 && dryRunResult && (
        <DryRunStep flowType={flowType} dryRunResult={dryRunResult} onBack={() => setStep(2)} onCommit={handleCommit} committing={committing} onDownloadFlagged={() => downloadFlagged(flowType, dryRunResult)} />
      )}

      {!isInvoice && step === 4 && commitResult && (
        <ResultStep flowType={flowType} commitResult={commitResult} onReset={reset} />
      )}

      {/* ── Invoice PDF flow ── */}
      {isInvoice && step === 1 && (
        <InvoiceUploadStep
          onParsed={handleInvoiceParsed}
          chefs={chefs}
          teamMembers={teamMembers}
          serviceAreas={serviceAreas}
        />
      )}

      {isInvoice && step === 2 && invoiceDrafts.length > 0 && (
        <InvoiceDryRunStep
          drafts={invoiceDrafts}
          onDraftChange={handleInvoiceDraftChange}
          onBack={() => setStep(1)}
          onCommit={handleInvoiceCommit}
          committing={committing}
          chefs={chefs}
          serviceAreas={serviceAreas}
          teamMembers={teamMembers}
        />
      )}

      {isInvoice && step === 3 && commitResult && (
        <ResultStep flowType="invoices" commitResult={commitResult} onReset={reset} />
      )}
    </div>
  );
}