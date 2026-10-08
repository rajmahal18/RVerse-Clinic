Clinic workflow patch — 8 October 2026

Monthly Accomplishment and Client Satisfaction reports are now implemented; see `monthly-reports.md` for the counting basis. Disease analytics remains deferred.

Chief Complaint now includes optional, unchecked “For CS 211 Medical Certificate” and “For Regular Medical Certificate” selections. They use the existing complaint autosave/print format. Selecting a complaint does not automatically select a service; Services Requested remains a separate selection. No additional database migration is needed for these two complaint options.

Before running this version against an existing database, apply migrations:

```powershell
npx prisma migrate deploy
npx prisma generate
```

In Accounts, open each existing combined Doctor / Nurse account and explicitly assign Doctor or Nurse. Combined accounts retain nursing permissions until assigned. Changing a role ends existing sessions; the account must sign in again.

Visit intake requires at least one valid BP, temperature, pulse rate, respiratory rate, or RBS reading. Progress notes, diagnosis, PE findings, and treatment belong to doctors. A doctor edit also locks that intake field against nursing edits. Admin overrides are logged. “Done” on progress notes or treatment signals the assigned nurse; unassigned visits are visible to nursing staff. Editing a completed section clears its done marker until marked done again.

Nursing staff record chief complaint, vitals, and optional Intake Notes / Initial History, then click Ready for doctor / Notify doctor. Doctors receive the handoff notification, linked directly to the visit's Progress Notes. Queuing a patient alone does not notify doctors that intake is ready.

Settings now has a Disease Master List tab. Admin can add and remove diseases; removed entries are archived rather than erasing diagnoses from existing records. There is no hardcoded disease list. Diagnosis / Findings contains disease checkboxes with an explicit Confirmed / To consider / Rule out status, the optional normal P.E. finding preset, and additional findings text. Disease IDs, recorded names, and statuses are stored separately for future analytics. Existing free text remains intact and is never automatically classified as confirmed.

Autosave stores separate drafts per user, visit, and form. Drafts are restored after closing or refreshing and are finalized only by Save/Done/Submit. Services and status changes in drafts do not update the actual visit until submitted.

The latest draft is saved before submission; rejected submissions retain the draft. Save, doctor Done, and nurse Notify doctor save the full visit form together, including service/status edits. Autosave continues after submitting. Successful saves consume the draft without allowing a late cleanup save to recreate it.

Vaccine requests select the requested service. Record vaccination after administration to update the patient vaccine history and services availed. The migration links existing administration records to vaccination services without fabricating administrations from requests.

Admin appointment deletion removes queued/cancelled entries from normal views while retaining the original data and activity history. Started clinical visits remain in patient history.

Checks: typecheck, production build, clinic workflow/SQL migration checks, notification interactions, draft recovery, mobile layouts, and printed forms.
