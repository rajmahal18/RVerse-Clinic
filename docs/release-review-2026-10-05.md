# Clinic changes review — October 5, 2026

## Scope and fixes

- Standalone patient Medicine Log under Clinic Forms; existing Daily Patient Summary retained.
- Uppercase patient name and permanent registration-based patient code on Medical Allowance.
- Public account registration removed; existing admin-only creation retained.
- Printable QR plus patient code; existing patient IDs retained and full printed codes searchable.
- Readable seal/text branding in sidebar, login, and mobile navigation.
- Review fixes: browser-origin QR URLs for reverse proxies, patient/form clinic scoping, Medicine Log column widths totaling 100%, and more space for the logo at 320 px.
- Number allocation uses a transaction table lock. Allocated numbers remain independent of deleted patient records.

## Validation

- Production build and TypeScript check passed.
- Isolated PostgreSQL engine executed the actual additive migration and numbering queries: existing patient rows/IDs unchanged, registration-order backfill, parallel requests, reprint stability, month rollover, clinic-specific code lookup, and retention of deleted numbers passed.
- QR decoder checks passed at screen and print resolution, including identical browser/server SVG generation and different deployment origins.
- Headless Chrome checked actual component templates with synthetic data at 320/375/768/1280 px: no horizontal document overflow on login/sidebar.
- Medicine Log PDFs with 0/30/31/61 rows produced 1/1/2/3 pages. Existing form templates rendered; Medical Allowance uppercase/code and one-page PDF passed. QR label printed at 30 × 34 mm on one page with controls hidden.
- Explicit Next core-web-vitals lint on changed application files: zero errors; two image optimization warnings (print letterhead and locally generated QR SVG).
- `npm run lint` has no existing configuration and prompts for setup; the explicit lint check above was used without introducing repository-wide lint changes.
- `git diff --check` passed.
- npm audit reported existing dependency alerts (37 total, including 30 high); none of the flagged packages were newly added by this change. This is not a clean security audit of the whole application, and dependency remediation is a separate task.

## Deployment prerequisite

Apply `20261005090000_patient_form_number` **before** serving the new Medical Allowance/QR screens or full patient-code search:

```sh
npx prisma migrate deploy
```

Set the existing `DATABASE_URL` and `DIRECT_URL` deployment secrets correctly. Include the migration and all new helper/component files in the commit. Do not substitute `db push`, reset, or development migrations on production.

The migration only adds a table/index/sequence and backfills numbers. It does not alter existing patient IDs or columns. Older application code continues to work with this additive table.

No production database was modified during review. Local Docker/PostgreSQL was unavailable; live migration and authenticated end-to-end workflow verification remain deployment checks. Tests used an isolated database engine and synthetic browser fixtures, not real patient records.

Generated QR labels use the browser's deployment URL unless `APP_BASE_URL` is explicitly set. Already printed stickers retain their original URL and require that URL to stay reachable, or reprinting after a domain change.

## Repeat checks

```sh
npm run typecheck
npm run build
npm run check:patient-labels
npm run check:clinic-layout
```

The layout check needs an installed Chromium browser; set `CHROME_PATH` if it is not installed at one of the detected paths. Build first so the layout check uses current compiled CSS.
