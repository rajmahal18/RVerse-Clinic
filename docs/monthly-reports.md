Monthly reports
===============

Open Reports → Monthly Reports. Available to Admin, Doctor, Nurse, legacy Doctor/Nurse, and Records; all queries are restricted to the signed-in clinic. Switch between Accomplishment and Client Satisfaction. Both support CSV and Print / PDF. Screen search and pagination never remove records from the export or printed report.

Before running this version against the database, apply all pending migrations:

```powershell
npx prisma migrate deploy
npx prisma generate
```

The new `20261008020000_monthly_reports` migration adds nullable survey customer type / agency fields and report date indexes. It does not classify or backfill historical surveys. No migration was applied to the configured database during implementation.

Counting basis
--------------

- All months use Asia/Manila, inclusive first day and exclusive first day of the next month. Invalid months or threshold filters show an error rather than silently querying another period.
- Accomplishment uses visit Time in. Deleted and cancelled visits are excluded. Gender per requested service includes queued visits, because a request is not evidence that the patient was catered. Its table shows distinct patients, their gender distribution, and visit counts separately.
- Patients catered per service uses completed visits. Consultations and selected certificates, allowance, emergency, first aid, BP/RBS services count on completion. Medicines require RECEIVED, vaccines require an administration record, and referrals require an actual referral record. No automatic consultation is inferred from an empty service list.
- A distinct patient counts once within a service, but can appear in multiple services. Service subtotals must not be added to obtain the overall unique count.
- Turnaround is recorded Time in → Time out for each completed visit, including queue time. Missing or earlier Time out is excluded from the average and listed explicitly. The average is weighted per visit, not per unique patient. It is not a measurement of doctor consultation time.
- BP/RBS and complaints use started visits, including those still open. BP flags systolic at/above the selected threshold OR diastolic at/above its threshold. RBS is numeric mg/dL or explicitly labelled mg/dL; incompatible/malformed readings are excluded. Each indicator shows unique flagged patients, flagged visits, and unique patients measured. “Both” means the same patient had both flags sometime during the month, potentially on separate visits.
- Defaults are BP 140/90 mmHg and RBS 200 mg/dL; thresholds can be adjusted in the report. These are report flags, not diagnostic classifications. References: [WHO](https://www.who.int/en/news-room/fact-sheets/detail/hypertension) and [NIDDK](https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis). Numeric historical RBS assumes mg/dL because the existing visit field has no unit column.
- Top 10 chief complaints ranks distinct patients, then visits, then name. The existing semicolon-separated format is parsed; case and whitespace differences are grouped, and “Other:” is removed without deleting the actual complaint. Multiple selections count separately. Free-text synonyms are not merged or medically inferred.

Client satisfaction
-------------------

- Uses recorded survey date, falling back to survey creation date only when absent. A survey from a September visit dated in October belongs to the October satisfaction report. Open visits with a saved survey are included; cancelled/deleted visits are excluded.
- Each survey contributes one answer per question. CC1–CC3 and SQD0–SQD8 show answered/unanswered totals and a breakdown by answer, including zero counts for standard options and any historical nonstandard answers. N/A is an answer. No scores are fabricated from missing responses.
- Service groups use the linked visit’s structured service requests and delivery records, not guesses from the survey’s editable “service availed” prose. Requests may include several services. The catered table requires actual service evidence; surveys without recorded delivery are identified in the summary.
- Gender/age per requested service counts distinct patients. The latest survey date per patient/service determines respondent sex and age, with creation date and visit time as deterministic tie-breakers. Overall submitted-survey counts remain visible separately. Missing sex is not replaced with the patient's gender; missing age is not computed from birth date.
- Age ranges: 19 or lower, 20–34, 35–49, 50–64, 65 or higher, Did not specify. Each patient is in exactly one range within each service.
- New survey Customer type is Employee / Dependent / Other / Did not specify. This is separate from the official CSM Citizen / Business / Government client type. Historical surveys stay unspecified; no relationship is inferred from employment designation or client type.
- Survey Patient agency records the agency at submission. New surveys initially offer the patient profile’s agency for staff confirmation; existing surveys without this field remain unspecified. Agency totals and gender are combined in one table, with latest-survey demographics per patient/agency. A patient can appear in multiple agencies/customer types when their recorded responses differ across visits.

Limitations
-----------

Historical records contain current patient profile names/gender and do not snapshot all requested-service changes. The report is a live aggregation, not a frozen submitted monthly report. A previously exported PDF/CSV remains the user's saved version. Survey agency/customer history cannot be recovered automatically where it was never recorded.

Verification
------------

`node scripts/check-monthly-reports.cjs --browser` covers month/age boundaries, repeat patients, multiple services, service evidence, missing/invalid times and readings, respondent demographics, unknown historical values, tenant and role guards, survey field persistence and validation, safe CSV, mobile layouts, modal navigation, pagination/search, and complete print/CSV exports.
