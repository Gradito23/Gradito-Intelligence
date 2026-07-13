/**
 * Regenerates fixtures/bulk-upload/*.xlsx for Bulk Upload manual QA.
 * Usage: node scripts/generate-bulk-upload-fixtures.mjs
 */
import * as XLSX from 'xlsx';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'fixtures', 'bulk-upload');
mkdirSync(outDir, { recursive: true });

function writeBook(filename, sheets) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const path = join(outDir, filename);
  XLSX.writeFile(wb, path);
  console.log('Wrote', path);
}

// ── Chefs: sheet name = service area ──────────────────────────────────────────
const chefHeaders = [
  'First Name',
  'Last Name',
  'Phone',
  'Email',
  'Menu Link',
  'Bio Link',
  'Bio Page',
  'Price Tier',
  'Notes',
];

writeBook('gradito_chef_import_test.xlsx', [
  {
    name: 'Manhattan',
    rows: [
      chefHeaders,
      [
        'Jane',
        'Smith',
        '+1 212-555-0100',
        'jane.smith@example.com',
        'https://canva.com/design/abc123menu/view',
        'https://canva.com/design/abc123bio/view',
        '3',
        '$$$',
        '',
      ],
      [
        'John',
        'Doe',
        '+1 718-555-0144',
        'john.doe@example.com',
        'https://canva.com/design/johndoemenu/view',
        'https://canva.com/design/johndoebio/view',
        '2',
        '$$',
        '',
      ],
      [
        'Flagged',
        'Chef',
        '+1 917-555-0199',
        'flagged@example.com',
        '',
        '',
        '',
        '$',
        'do not book — legacy strike note',
      ],
    ],
  },
  {
    name: 'Brooklyn',
    rows: [
      chefHeaders,
      [
        'Jane',
        'Smith',
        '+1 212-555-0100',
        'jane.smith@example.com',
        'https://canva.com/design/abc123menu/view',
        '',
        '3',
        '$$$',
        'Also works Brooklyn dinners',
      ],
    ],
  },
]);

// ── Events: one sheet, YYYY-MM-DD date strings ────────────────────────────────
const eventHeaders = [
  'Booking ID',
  'Date',
  'Service Area',
  'Client Name',
  'Event Type',
  'Experience Type',
  'Cuisines Served',
  'Guest Count',
  'Client Revenue',
  'Status',
  'Head Chef',
  'Head Fee',
  'Sous Chef',
  'Sous Fee',
  'Notes',
];

writeBook('gradito_event_import_test.xlsx', [
  {
    name: 'Events',
    rows: [
      eventHeaders,
      [
        'BK-001',
        '2025-09-15',
        'Manhattan',
        'Bain & Company',
        'Corporate',
        'Plated Multi-Course',
        'New American',
        '20',
        '8000',
        'Completed',
        'Jane Smith',
        '2000',
        'John Doe',
        '1200',
        'Full head + sous assignment',
      ],
      [
        'BK-002',
        '2025-10-01',
        '',
        '',
        'Private',
        'Tasting Menu / Omakase',
        'Japanese',
        '8',
        '4500',
        'Confirmed',
        'Jane Smith',
        '1800',
        '',
        '',
        'Missing service area and client — expect dry-run warnings',
      ],
      [
        'BK-003',
        '2025-11-12',
        'Manhattan',
        'Acme Holdings',
        'Private',
        'Wine-Pairing Dinner',
        'French',
        '10',
        '5500',
        'Confirmed',
        'Jane Smith',
        '2200',
        '',
        '',
        'Head only — no sous',
      ],
    ],
  },
]);

console.log('Done.');
