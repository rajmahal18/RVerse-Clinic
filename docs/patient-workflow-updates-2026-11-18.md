Clinic workflow updates — 18 November 2026

Admin can use Edit Completed Services in a patient record to correct clinical fields, services requested, assigned staff, existing medicine records, laboratory results, vaccinations, referrals, and CSM responses. The visit stays Completed. Every correction requires a reason and is committed with its before/after activity log. A stale editor must refresh before saving. Changing an issued medicine quantity adjusts the linked batch stock with a compensating inventory movement; insufficient stock rejects the entire correction.

Chief Complaint is required alongside at least one valid vital sign before starting a queued visit. Settings ? Chief Complaints lets admin add choices; existing choices, multiple selection, and Other remain available. The existing intakeNotes database field is retained and displayed as Nurse Notes. Nurse Notes and Doctor Assessment have separate bordered sections.

Medicine Request supports up to 30 medicines per submission, each with its own quantity, frequency, duration, and remarks. Additional requests remain allowed while earlier requests are pending. Submission is atomic: one unavailable medicine rejects the whole submission. Draft restoration supports the previous single-medicine draft format as well as multiple lines.

In Inventory, admin and pharmacist can hide or allow individual medicine batches through the batch details. This affects new requests only. Hidden batches remain in inventory and patient history; pending requests retain their original batch. Available, non-expired batches with stock are ordered by nearest expiry, with unknown expiry last. Staff still select the batch, allowing the pharmacist to expose the intended brand/batch. Requests and internal item selectors include typed filtering by generic name, brand, and dosage.

Patient Medicine History includes all visits, separated by visit headings, with request status and release/receipt details. Released medicines have an obvious Mark received section at the bottom of the visit group. Patient Summary provides assessment, medicine log, and laboratory-result history. CSM prefills existing sex, age, agency, and service fields without overwriting saved answers. Today's Patients uses compact wrapping rows for tablet/laptop and stacked rows on phones.

Deployment

The new migration is additive: it adds ChiefComplaintCatalog and InventoryItem.isRequestable with a true default. Existing records, enums, and columns are retained. Old application code can continue running after this migration; the new application code requires the migration first.

1. Follow the existing backup/recovery procedure.
2. Apply migrations to the target environment with `npx prisma migrate deploy`.
3. Generate the client with `npx prisma generate`, build, and restart the updated application.
4. Review batches in Inventory and hide batches that should not be offered for new requests.

The development task does not apply migrations to the live database.

Validation

- `npm run typecheck`
- `npm run build` (requires production-valid auth environment settings)
- `node scripts/check-clinical-patch.cjs` — includes all SQL migrations and required complaint regression
- `node scripts/check-patient-workflow-updates.cjs` — permissions, atomic logs, stock corrections, multi-request rollback, and batch availability
- `node scripts/check-patient-workflow-ui.cjs` — browser interactions, draft restoration, CSM defaults, and 375/768/1024/1280px layouts
