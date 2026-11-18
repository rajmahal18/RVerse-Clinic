# Patient forms and admin record management — 18 November 2026

Maintenance is entered as bullet items, with one medicine/item per line. Enter adds another item. Existing newline text is preserved; commas inside medicine instructions are not split. The patient profile and Employee Information form display bullets. The printed maintenance area expands rather than clipping a long list.

Patient vaccine history now supports Vaccine Name, Dose / Booster, and Date Given. Existing free-text vaccine history remains available as previous history/notes. Structured history and clinic vaccination records both appear in the printed vaccine table, with separate name, dose, and date columns. Recording an administered vaccine also captures Date Given; older clinic records fall back to the visit date.

Selecting Referral shows Reason for Referral on the visit form. The printed referral form uses that reason, falling back to an older scheduled referral's reason. Its Remarks section uses the visit's Others / Additional Findings. Scheduling a referral prefills the current reason.

CSM Services Availed is read-only and derived from the visit on the server. The client cannot substitute manually entered service text. Normal recorded services are included when preparing the visit's CSM; medicine and vaccination provision are based on received medicine and administration records. Saved/printed CSM forms use current valid services rather than a stale manually typed value.

## Admin controls

- Patient profile: Delete hides the profile and its visits from normal views without deleting their data or patient number.
- Admin Record Management in a patient profile: Delete a whole visit, Remove a service selection, or Void an individual medicine, laboratory, vaccination, referral, or follow-up record. Linked clinical records must be voided before their service selection can be removed.
- Accounts: Delete ends sign-in access and sessions while retaining names on previous entries and logs. The current account and the last active admin cannot be deleted. Restored accounts remain inactive until explicitly activated.
- Inventory batch details: Delete archives the batch and preserves stock, movements, and linked requests. Current stock and pending-request count are shown in the confirmation.
- Settings → Services: Deactivate or reactivate service choices. Inactive services are excluded from new requests but preserved on existing visits.
- Settings → Archives: Review archived/voided records by category and restore them. Restore the patient before its visits, then the visit before its service records. Independently voided child records remain voided when a parent is restored.

Every archive/void/restore requires admin permission, a reason, and confirmation. The mutation and before/after audit log commit together. Password hashes are excluded from account audit snapshots. Normal reads, nested histories, counts, and service reports exclude archived records; historical inventory movements remain stored.

Restoring an active visit is rejected if the patient already has another active visit. If a medicine/vaccination/referral service selection was independently removed, restore that selection before its clinical record.

Voiding an issued medicine requires an explicit choice: record correction only (stock unchanged), or full physical return (quantity added to the linked batch with a compensating movement). Restoring a physically returned issued record deducts that quantity again and rejects restoration if stock is insufficient. Deleting an entire visit or patient does not automatically return medicines to stock.

## Deployment and compatibility

Apply pending migrations before starting the new application:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Then build and restart using the existing deployment process. Follow the existing backup procedure first. The migration only adds nullable archive/date/reason columns, a JSON history field defaulting to `[]`, and service settings. It does not delete, rename, or automatically classify existing history. The previous application can run against the expanded schema during rollout. Older versions do not enforce the new archive filters, so all application instances should run the new version before staff use Delete/Void.

No live database migrations are applied by the development task.

## Validation

- Production build and TypeScript check.
- `node scripts/check-clinical-patch.cjs` — clinical permissions, draft isolation, and all SQL migrations.
- `node scripts/check-patient-workflow-updates.cjs` — existing records across migration, corrections, and medicine requests.
- `node scripts/check-admin-record-management.cjs` — admin/CSRF/clinic gates, audit rollback, parent archive filtering, restoration, stock returns, session revocation, service settings, automatic CSM, and medical-history validation.
- `node scripts/check-patient-workflow-ui.cjs` — medicine/draft interactions, maintenance bullets, vaccine dates/doses, referral reason, CSM defaults, confirmation form, and responsive layouts.
- `node scripts/check-visit-forms.cjs` — referral print mapping, vaccine columns, maintenance bullets, and visit-specific forms.
