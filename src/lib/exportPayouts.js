import * as XLSX from 'xlsx';

/**
 * Export payout data to a two-sheet .xlsx file.
 * @param {Array} rows - aggregated rep rows (from CommissionsByRep useMemo)
 * @param {Array} commissionLines - filtered commission lines
 * @param {Array} events - all events (for enrichment)
 * @param {string} periodLabel - human label e.g. "March 2026"
 * @param {string} periodKey - machine key e.g. "2026-03" for filename
 * @param {boolean} finalizedOnly
 */
export function exportPayoutsXlsx({ rows, commissionLines, events, periodLabel, periodKey, finalizedOnly }) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  const summaryHeader = [
    'Rep', '# Events', 'Closer $', 'Facilitator $', 'Source Rep $',
    'Total Commission $', 'Payable Now (Finalized) $', 'Pending (Forecast) $',
  ];

  const summaryRows = rows.map(r => [
    r.name,
    r.eventCount,
    r.byRole['Closer'] || 0,
    r.byRole['Facilitator'] || 0,
    r.byRole['Source Rep'] || 0,
    r.total,
    r.finalized,
    r.pending,
  ]);

  const totalsRow = [
    'TOTALS',
    rows.reduce((s, r) => s + r.eventCount, 0),
    rows.reduce((s, r) => s + (r.byRole['Closer'] || 0), 0),
    rows.reduce((s, r) => s + (r.byRole['Facilitator'] || 0), 0),
    rows.reduce((s, r) => s + (r.byRole['Source Rep'] || 0), 0),
    rows.reduce((s, r) => s + r.total, 0),
    rows.reduce((s, r) => s + r.finalized, 0),
    rows.reduce((s, r) => s + r.pending, 0),
  ];

  const summaryAoa = [summaryHeader, ...summaryRows, totalsRow];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryAoa);

  // Column widths
  ws1['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 28 }, { wch: 24 },
  ];

  // Auto-filter on header row
  ws1['!autofilter'] = { ref: `A1:H1` };

  // Currency format on money columns (C-H, 1-indexed rows 2+)
  const currencyCols = [2, 3, 4, 5, 6, 7]; // 0-indexed col indices for Closer $ through Pending $
  summaryAoa.forEach((row, rIdx) => {
    if (rIdx === 0) return;
    currencyCols.forEach(cIdx => {
      const cellAddr = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (ws1[cellAddr]) ws1[cellAddr].z = '$#,##0.00';
    });
  });

  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  // ── Sheet 2: Detail ───────────────────────────────────────────────────────
  const detailHeader = [
    'Rep', 'Event', 'Date', 'Lead Type', 'Role',
    'Net Profit (Basis) $', 'Rate %', 'Commission $', 'Status', 'Notes',
  ];

  const detailRows = commissionLines
    .map(l => {
      const event = events.find(e => e.id === l.event_id);
      const rep = rows.find(r => r.id === l.team_member_id);
      return {
        repName: rep ? rep.name : (l.team_member_name || 'Unknown'),
        eventLabel: event ? `${event.client_name}` : (l.event_label || ''),
        date: event?.date || '',
        leadType: event?.lead_type || '',
        role: l.role || '',
        basis: l.basis || 0,
        ratePct: l.rate_pct || '',
        amount: l.amount || 0,
        status: l.status || '',
        notes: l.notes || '',
      };
    })
    .sort((a, b) => a.repName.localeCompare(b.repName) || a.date.localeCompare(b.date))
    .map(l => [l.repName, l.eventLabel, l.date, l.leadType, l.role, l.basis, l.ratePct, l.amount, l.status, l.notes]);

  const detailAoa = [detailHeader, ...detailRows];
  const ws2 = XLSX.utils.aoa_to_sheet(detailAoa);

  ws2['!cols'] = [
    { wch: 22 }, { wch: 26 }, { wch: 12 }, { wch: 20 }, { wch: 14 },
    { wch: 22 }, { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 30 },
  ];

  ws2['!autofilter'] = { ref: `A1:J1` };

  // Currency format on Basis (col 5) and Commission (col 7)
  detailRows.forEach((_, rIdx) => {
    [5, 7].forEach(cIdx => {
      const cellAddr = XLSX.utils.encode_cell({ r: rIdx + 1, c: cIdx });
      if (ws2[cellAddr]) ws2[cellAddr].z = '$#,##0.00';
    });
  });

  XLSX.utils.book_append_sheet(wb, ws2, 'Detail');

  // ── Write file ────────────────────────────────────────────────────────────
  const suffix = finalizedOnly ? '_finalized' : '';
  const filename = `gradito_payouts_${periodKey}${suffix}.xlsx`;
  XLSX.writeFile(wb, filename);
}