# Bulk Upload test fixtures

Sample files for manual QA of **Admin → Bulk Upload** (`/admin/bulk-upload`).

| File | Flow |
|------|------|
| [`gradito_chef_import_test.xlsx`](gradito_chef_import_test.xlsx) | Import Chefs |
| [`gradito_event_import_test.xlsx`](gradito_event_import_test.xlsx) | Import Events |
| [`perfectvenue_invoice_sample.md`](perfectvenue_invoice_sample.md) | Convert to PDF → Import Invoices |

Regenerate the XLSX files:

```bash
node scripts/generate-bulk-upload-fixtures.mjs
```

Do not overwrite the root `gradito_*_import_template.xlsx` download stubs.

## Shared identities

- **Head:** Jane Smith (`jane.smith@example.com`) — Manhattan (+ Brooklyn after merge)
- **Sous:** John Doe
- **Flagged:** Flagged Chef (notes contain “do not book”)
- **Clients:** Bain & Company, Acme Holdings
- **Coordinator (invoice):** Alex Rivera — add under Commission Team if testing facilitator match

## Checklist

### 1. Import Chefs

1. Choose **Import Chefs** → upload `gradito_chef_import_test.xlsx`.
2. **Map Columns** — sheets should be Manhattan and Brooklyn; confirm First/Last Name and Canva links.
3. **Dry Run** — expect:
   - Jane Smith merged across sheets (`home_areas` includes Manhattan + Brooklyn)
   - John Doe as a clean create
   - Flagged Chef status **Flagged**
4. **Commit Import** only on a safe/dev environment (or cancel after reviewing dry run).

### 2. Import Events

1. Prefer running chef import first so Head/Sous names exist on the roster.
2. Choose **Import Events** → upload `gradito_event_import_test.xlsx`.
3. Confirm header auto-map (Date, Service Area, Client Name, Head Chef, etc.).
4. **Dry Run** — expect:
   - BK-001 complete (Bain & Company, Jane Smith + John Doe)
   - BK-002 flagged (missing service area and/or client)
   - BK-003 head-only private dinner (Acme Holdings)

### 3. Import Invoices (PDF)

1. Open `perfectvenue_invoice_sample.md` → **Print → Save as PDF** (or Export to PDF).
2. Choose **Import Invoices (PDF)** → drop the PDF → **Parse**.
3. **Review Drafts** — check food / beverage / head+sous fees / staffing / travel / admin / excluded (gratuity, CC, tax).
4. Commit only on a safe/dev environment.

**Note:** Spreadsheet flows need no AI. Invoice parse extracts PDF text in the browser (text PDFs only), then structures fields via OpenAI (`Admin → Integrations → OpenAI` must be enabled). Apply the `uploads` storage migration if using Chef Intake photo upload.
