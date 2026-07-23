# Clinic Auto-Generated Forms — Visual Layout and Print Specification

## Purpose

Implement printable, auto-generated clinic forms that closely reproduce the supplied reference layouts.

This document intentionally focuses on:

- visual structure;
- labels and fields;
- print behavior;
- overflow rules;
- layout fidelity;
- expected data semantics.

The existing repository structure, routes, components, Prisma models, permissions, and patient/consultation workflows must be inspected before implementation. Integrate the forms using the patterns already used by the application rather than introducing a parallel architecture.

## Required repository review before coding

Inspect at minimum:

- `prisma/schema.prisma`
- existing patient profile and chart modules;
- consultation and vital-sign modules;
- vaccination, allergy, medication, and medical-history modules;
- existing authentication and authorization helpers;
- current API/route conventions;
- `public/icons/ocmlogo.png`;
- any existing print, report, export, or PDF utilities;
- `project_direction.md` and other active implementation notes.

Do not assume model or relation names from this specification. Map each logical field to the actual schema.

---

## Reference files

Use these images as the visual source of truth:

1. `docs/reference-forms/01-employee-information.jpg`
2. `docs/reference-forms/02-assessment-monitoring-sheet.jpg`
3. `docs/reference-forms/03-medical-certificate.jpg`
4. `docs/reference-forms/04-referral-form.jpg`

The references are scans or screenshots. Reproduce the clean document layout, not scanner noise, shadows, skew, handwriting, redactions, compression artifacts, or photographed page curvature.

There are currently **four unique form layouts** in this handoff. A fifth form can follow the same architecture when its reference is provided.

---

# Global implementation requirements

## Output

Each form must support:

- an on-screen print preview;
- browser printing at actual size or 100% scale;
- PDF download or generation;
- a deterministic filename;
- generation from the selected patient and, when applicable, the selected encounter or consultation.

Suggested filenames:

```text
employee-information-{patient-number-or-id}.pdf
assessment-monitoring-{patient-number-or-id}.pdf
medical-certificate-{patient-number-or-id}-{consultation-date}.pdf
referral-form-{patient-number-or-id}-{consultation-date}.pdf
```

## Paper and print rules

- Paper size: **A4 portrait, 210 mm × 297 mm**
- Default print scale: **100% / Actual size**
- Avoid browser-added headers and footers.
- Preserve background fills and borders during printing.
- Use physical CSS units such as `mm`, `cm`, or `pt` for print layouts when practical.
- Every supplied form must fit on **one page** unless a later business rule explicitly allows continuation pages.
- Do not let buttons, application navigation, debug content, URLs, timestamps, or browser UI appear in the printed output.
- Prefer a white background with black or dark-gray text and thin gray/black borders.
- Do not imitate scan discoloration.

A possible print container:

```css
@page {
  size: A4 portrait;
  margin: 0;
}

.form-page {
  width: 210mm;
  min-height: 297mm;
  box-sizing: border-box;
  background: white;
  color: black;
}

@media print {
  body {
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .no-print {
    display: none !important;
  }
}
```

The implementation may use HTML/CSS print templates, `pdf-lib`, a server-side PDF renderer, or the repository's existing solution. Choose the approach that gives the closest output while remaining maintainable.

## Fonts

Use a common sans-serif font close to the references, such as Arial, Helvetica, or an existing application-safe equivalent.

General sizing guidance:

- normal field text: 8–10 pt;
- labels: 8–10 pt, often bold;
- section bars: 10–14 pt, bold;
- main form titles: 18–24 pt, bold;
- footer/revision text: 5–7 pt.

Use tighter typography on the assessment sheet because it contains many columns.

## Shared header assets

For official forms, use the application's available OCM/BARMM logo asset, currently visible at:

```text
public/icons/ocmlogo.png
```

Verify that it is the correct official asset and sufficiently sharp for printing. Do not crop the logo from the scanned reference if a clean asset is available.

## Missing data

When data is unavailable:

- render an empty field;
- do not print `undefined`, `null`, `N/A`, `Not available`, or placeholder text unless the official form explicitly requires `N/A`;
- never fabricate medical or demographic information;
- preserve the layout even when a value is blank.

## Dates, times, age, and sex

Use consistent human-readable formatting.

Suggested defaults:

```text
Long date: June 16, 2026
Numeric date: 06/16/2026 or the application's established format
Time: 12:10 PM
Age: computed as of the consultation/form date, not necessarily the current date
Sex: Male / Female, or the application's stored display value
```

Use the application's business rules if they already define date formatting.

## Overflow behavior

Text must never cross borders or overlap labels.

Apply these rules:

1. Reduce font size only within a safe minimum.
2. Wrap text in multiline areas.
3. Clip or truncate only as a last resort.
4. Preserve the one-page layout.
5. For long names and addresses, use a slightly smaller font before truncating.
6. Do not silently omit clinically important multiline content.
7. Where a long clinical narrative cannot fit, show a clear continuation indicator only if continuation pages are formally implemented.

Suggested minimum sizes:

- names and addresses: 7 pt;
- table body: 6.5–7 pt;
- clinical narrative boxes: 7 pt.

## Security and privacy

- Enforce existing permissions before exposing a printable form.
- Do not place patient details in server logs.
- Do not expose forms through predictable unauthenticated URLs.
- Do not cache patient PDFs publicly.
- Use the repository's existing audit-log pattern when form generation is considered an auditable action.

---

# Form 1 — Employee's Information and Medical Information

Reference:

```text
docs/reference-forms/01-employee-information.jpg
```

## Overall appearance

- A4 portrait.
- Thin outer border inset from all sides.
- Approximately 8–10 mm page margins.
- Dense two-part form.
- Gray section headers with bold black text.
- Thin gray grid lines.
- Top half is employee and emergency-contact information.
- Bottom two-thirds is medical information arranged in left and right columns.

## Vertical structure

Approximate page-height allocation:

```text
Top outer margin                         2–3%
EMPLOYEE'S INFORMATION header           3%
Employee details                        18–20%
Primary Contact                         8–9%
Gap                                     1%
MEDICAL INFORMATION header              3%
Medical content                         58–62%
Bottom outer margin                     2–3%
```

## Header

A full-width gray bar:

```text
EMPLOYEE'S INFORMATION
```

- centered;
- uppercase;
- bold;
- about 15–18 pt;
- medium-light gray background;
- bordered on all sides.

## Employee information grid

Label column width is roughly 19% of the inner page width. Values occupy the remaining space unless split into multiple groups.

### Row 1

```text
Name: | full-width value
```

### Row 2

```text
Date of Birth: | value | Age: | value | Gender: | value
```

Suggested relative widths:

```text
Date of Birth label/value block   50%
Age label/value block             25%
Gender label/value block          25%
```

### Row 3

```text
Contact number | value | Religion: | value | Tribe: | value
```

Use the same vertical separators as Row 2.

### Row 4

```text
Address: | multiline value
```

- approximately twice the standard row height;
- top-align the value;
- wrap long addresses.

### Rows 5–7

```text
Email:           | value
Office/Division: | value
Designation:     | value
```

## Primary Contact section

A thin full-width gray bar labeled:

```text
Primary Contact
```

The label is left-aligned and bold.

Below it are three standard rows:

```text
Name:           | value
Relationship:   | value
Contact Number: | value
```

The label column aligns with the employee information label column.

## Medical Information header

A full-width gray bar labeled:

```text
MEDICAL INFORMATION
```

- centered;
- uppercase;
- bold;
- approximately 15–18 pt.

## Main medical layout

Below the header, divide the body into two columns:

```text
Left column:  approximately 53%
Right column: approximately 47%
```

The center divider continues through most of the medical section.

---

## Form 1 left column

### Height and Weight row

At the top:

```text
Height: | value | Weight: | value
```

Each label/value group occupies about half of the left column.

Do not add BMI unless the approved blank form or business owner requires it.

### Vaccine table

Below height and weight is a bordered vaccine table.

Approximate internal widths:

```text
Vertical "VACCINE RECEIVED" strip   8–10%
Name of Vaccine                     37–40%
Dose                                20–22%
Date                                remaining width
```

Header row:

```text
Name of Vaccine | Dose | Date
```

The first narrow column has vertically stacked letters:

```text
V
A
C
C
I
N
E

R
E
C
E
I
V
E
D
```

Reproduce this appearance using vertical writing, rotated text, or stacked characters. It should be centered in a gray cell.

#### COVID-19 block

The vaccine-name cell displays:

```text
COVID 19
```

The dose rows are:

```text
1
2
3
Booster 1 & 2
```

Each dose row has a corresponding date cell.

If the database stores multiple COVID vaccination events separately, place them in chronological order and map them to the closest applicable dose slot.

#### Others block

Below COVID-19 is a merged vaccine-name area labeled:

```text
*Others
```

It spans several blank rows. Use those rows for other recorded vaccines.

A practical row model is:

```text
Vaccine name | dose label | administration date
```

If there are more records than available rows, use the approved overflow rule rather than shrinking the entire page below legibility.

### Allergy History

A gray, centered header:

```text
Allergy History
```

Below it, a bordered multiline area containing:

```text
Medicine/Drugs:

Foods/Insects Etc.:
```

Each category must have enough vertical space for wrapped entries.

### Maintenance medicine/current medication

A gray, centered header:

```text
Maintenance Medicine/ Current Medication
```

Below it is a large bordered multiline area that extends to the bottom of the form.

Render current/maintenance medications as readable lines. A medication line may contain name, dose, frequency, and instructions when those data exist.

---

## Form 1 right column

### Medical History

A gray, centered header:

```text
Medical History
```

Below it is a large bordered multiline area occupying most of the upper-right column.

The area should support wrapped text or a concise list of known conditions and relevant history.

### Additional Medical Info

Near the lower-right portion is a gray, centered header:

```text
Additional Medical Info
```

Below it, render these labels on separate lines:

```text
Physicians Name:
Clinic Address
Date of Last Visit
Reason for visit:
Surgeries:
Smoking:   [ ] Yes     [ ] No
Exercise:  [ ] Yes     [ ] No
Family History:
```

Notes:

- Match the reference's compact, label-first appearance.
- Check the appropriate smoking and exercise box when values exist.
- Leave both boxes blank when unknown.
- Allow `Family History` and `Reason for visit` to wrap within the remaining space.
- Preserve the reference wording unless the clinic approves corrections such as `Physician's Name`.

## Suggested logical data fields

Adapt these to the actual Prisma schema:

```text
Patient:
- full name
- date of birth
- computed age
- sex/gender
- contact number
- religion
- tribe
- address
- email
- office/division
- designation

Primary contact:
- name
- relationship
- contact number

Medical:
- height
- weight
- vaccination records
- allergies by category
- maintenance/current medications
- medical history
- physician name
- clinic address
- last visit date
- last visit reason
- surgery history
- smoking status
- exercise status
- family history
```

---

# Form 2 — Assessment Monitoring Sheet

Reference:

```text
docs/reference-forms/02-assessment-monitoring-sheet.jpg
```

## Overall appearance

- A4 portrait.
- Nearly the full printable page is occupied by a monitoring table.
- Compact typography.
- Simple black grid.
- No decorative background.
- Header information appears above the table.
- The table has many blank rows intended to record multiple clinic visits for one patient.

## Top header

Centered, bold, two lines:

```text
OFFICE OF THE CHIEF MINISTER- BARMM
THE CLINIC
```

Below it is one patient-information line divided visually into fields:

```text
Name: [value]     Age/Sex: [value]     Date of Birth: [value]     Allergies: [value]
```

The exact spacing can adapt to long names, but the four groups must remain on the same top area when possible.

## Main title

Centered, bold, uppercase:

```text
ASSESSMENT MONITORING SHEET
```

Approximate size: 16–20 pt.

The table begins immediately below the title.

## Table columns

Use these exact column labels and order:

```text
Date
Time In
Chief Complaint
BP
RBS
Temp
PR
Services Received
Time Out
NOD
```

Approximate percentage widths based on the reference:

| Column | Approx. width |
|---|---:|
| Date | 8% |
| Time In | 9% |
| Chief Complaint | 17% |
| BP | 8% |
| RBS | 9% |
| Temp | 7% |
| PR | 6.5% |
| Services Received | 18.5% |
| Time Out | 9% |
| NOD | 8% |

The percentages may be calibrated slightly, but the broad and narrow columns should remain visually consistent with the reference.

## Header row

- bold;
- centered;
- 7–8 pt;
- white background;
- thin borders;
- slightly taller than body rows.

`Services Received` may use a slightly smaller font to remain on one line.

## Body rows

- approximately 38–45 visible rows depending on final row height;
- consistent row height;
- thin grid lines;
- top-align or center values consistently;
- clinical text may wrap inside `Chief Complaint` and `Services Received`;
- date, times, vital signs, and NOD should generally remain centered.

`NOD` means the clinic's established designation from the source form. Do not rename it without confirmation.

## Encounter mapping

Each row represents one qualifying clinic encounter for the selected patient.

Suggested semantic mapping:

```text
Date               encounter/consultation date
Time In            check-in, queue, or encounter start time
Chief Complaint    consultation chief complaint
BP                  blood pressure
RBS                 random blood sugar
Temp                temperature
PR                  pulse rate
Services Received  services, treatment, medication, consultation, or disposition summary
Time Out            encounter completion/check-out time
NOD                 nurse on duty or the clinic's approved equivalent
```

Confirm the actual meaning and data source of `NOD` in the repository or with clinic stakeholders.

## Row ordering

Default to chronological order from oldest to newest so the sheet reads like a longitudinal paper record, unless the clinic's existing workflow specifies otherwise.

## Pagination rule

The reference is a single-page monitoring sheet. For more records than available rows, implement one of these clean behaviors:

1. generate additional pages with the same patient header and column header; or
2. allow a date-range selection before generation.

Do not compress dozens of rows until text becomes unreadable.

When multiple pages are used, label them subtly:

```text
Page 1 of 2
```

Do not add page numbering if the clinic explicitly requires an exact unnumbered form.

---

# Form 3 — Medical Certificate

Reference:

```text
docs/reference-forms/03-medical-certificate.jpg
```

## Overall appearance

- A4 portrait.
- Clean official letterhead.
- Generous white space compared with Forms 1 and 2.
- Logo in the upper-left.
- Office name and clinic name across the upper portion.
- Large spaced title.
- Two large bordered narrative boxes.
- Signature block and official footer at the bottom.

## Letterhead

At the top:

- OCM/BARMM seal on the left;
- to the right of the seal:

```text
OFFICE OF THE CHIEF MINISTER
BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO
```

Below or aligned across the header:

```text
T H E   C L I N I C
```

The clinic name uses large serif-like or letter-spaced text. A safe implementation may use a serif font for this line only if available.

## Title

Centered with wide letter spacing:

```text
M E D I C A L   C E R T I F I C A T E
```

Approximate size: 18–22 pt, bold.

## Introductory statement

Left-aligned below the title:

```text
This is to certify that the person named hereunder has the following records of consultation and treatment in this clinic.
```

Keep it compact, approximately two lines or fewer.

## Patient fields

Use underlined values.

### Full-width name row

```text
Name: __________________________________________
```

### Demographic row

```text
Age: [value]   Sex: [value]   Civil Status: [value]
```

### Address row

```text
Address: [value]
```

### Date row

```text
Date of Consultation: [long date]
```

## Diagnosis/Findings box

Label:

```text
Diagnosis/Findings:
```

Below it is a large rectangular bordered box.

- width: most of the inner page;
- height: roughly 35–42 mm;
- text starts at the upper-left with padding;
- supports wrapped multiline content;
- 8–10 pt body text.

## Remarks box

Label:

```text
Remarks
```

Below it is another large rectangular bordered box, slightly shorter or similar in height to the diagnosis box.

Use it for treatment advice, medication instructions, requested rest period, laboratory requests, follow-up instructions, or other approved remarks from the consultation.

## Purpose statement

Below the boxes:

```text
This certification is being issued upon his/her request for whatever PURPOSE/LEGAL INTENT it may serve him/her best.
```

Preserve the approved clinic wording. Do not infer the purpose from diagnosis unless the user explicitly selects or enters it.

A better implementation can expose a controlled `purpose` field while rendering the approved sentence.

## Issuance line

```text
Issued this [ordinal day] day of [month] [year] at Cotabato City.
```

Examples:

```text
Issued this 16th day of June 2026 at Cotabato City.
Issued this 1st day of July 2026 at Cotabato City.
```

Implement correct ordinal suffixes: `st`, `nd`, `rd`, `th`.

## Signatory block

Near the lower-left:

```text
[DOCTOR NAME AND CREDENTIALS]
Medical Officer V
```

The reference contains a specific doctor name, but the implementation should use the clinic's approved current signatory configuration rather than hardcoding a scanned sample's name unless the business owner explicitly requires that exact signatory.

Provide enough blank space above the printed name for a handwritten or digital signature/stamp.

## Validity note and revision code

Small bold text near the bottom-left:

```text
(NOT VALID WITHOUT OFFICIAL STAMP/SEAL)
```

Below it, render the approved form revision code from configuration or the clinic-approved static value.

The scanned reference appears to contain a revision string similar to:

```text
OCMTC_MR_2025_REV_03
```

Verify the exact approved code before hardcoding it.

## Footer

At the bottom:

- a horizontal rule;
- very small centered address/contact line;
- use the clinic's approved current address and email;
- do not blindly copy unclear text from the scan.

## Suggested source data

```text
Patient:
- full name
- age as of consultation date
- sex
- civil status
- address

Consultation:
- consultation date
- diagnosis/findings
- remarks/treatment plan
- certificate purpose
- issuance date

Configuration:
- physician/signatory name
- credentials
- position
- clinic address
- clinic email
- form revision code
```

---

# Form 4 — Referral Form

Reference:

```text
docs/reference-forms/04-referral-form.jpg
```

## Overall appearance

- A4 portrait.
- Uses the same official clinic letterhead style as the medical certificate.
- Large spaced title.
- Patient and consultation details near the top.
- Compact vital-sign table.
- Four large narrative sections without surrounding boxes.
- Nurse and physician signatory blocks.
- Validity note, revision code, and footer at the bottom.

## Letterhead

Match the Medical Certificate header:

- OCM/BARMM seal at upper-left;
- office name to the right;
- large `THE CLINIC` text below the office name.

## Title

Centered with wide letter spacing:

```text
R E F E R R A L   F O R M
```

## Consultation row

```text
Date of Consultation: [value]                       Time: [value]
```

Use underlined values.

## Name and birth-date row

```text
Name: [full name]                                  Date of Birth: [value]
```

## Demographic row

```text
Age: [value]   Sex: [value]   Civil Status: [value]
```

## Address row

```text
Address: [full address]
```

Use an underline or bottom border beneath values, consistent with the reference.

## Vital Signs table

A gray header bar centered across the table:

```text
Vital Signs
```

Below it are two compact rows.

### Row 1

```text
Temp: | value | Blood Pressure: | value | RR: | value | O2Sat: | value
```

### Row 2

```text
PR: | value | Height: | value | Weight: | value | remaining cell/space
```

Use thin gray borders and a light-gray header fill.

Suggested normalized vital formats:

```text
Temperature: 36.6 °C
Blood pressure: 110/70
Respiratory rate: 18
Oxygen saturation: 98%
Pulse rate: 72
Height: use the application's unit
Weight: use the application's unit
```

Do not print a unit that conflicts with the application's stored values.

## Narrative sections

The reference uses bold labels followed by one or more lines of text, with generous vertical spacing and no enclosing rectangles.

Render in this order:

### Chief Complaint

```text
Chief Complaint
[content]
```

### Medical History

```text
Medical History
[content]
```

### Reason for Referral

```text
Reason for Referral
[content]
```

### Remarks

```text
Remarks
[content]
```

Each value must wrap and remain within the page width.

Suggested vertical allocation:

```text
Chief Complaint      18–25 mm
Medical History      25–32 mm
Reason for Referral  25–32 mm
Remarks              20–28 mm
```

Adjust while preserving space for signatories and footer.

## Nurse signatory block

Near the lower-left:

```text
[NURSE NAME, CREDENTIALS]
The Clinic Nurse
```

Leave signing space above the printed name.

## Physician signatory block

Below the nurse block:

```text
[PHYSICIAN NAME AND CREDENTIALS]
Medical Officer V
```

Leave signing space above the printed name.

Use configurable approved signatories rather than permanently embedding names from the sample scan.

## Validity note, revision code, and footer

Match the structure used on the Medical Certificate:

```text
(NOT VALID WITHOUT OFFICIAL STAMP/SEAL)
[approved referral-form revision code]
```

The scan appears to show a code similar to:

```text
OCMTC_RF_2025_REV_02
```

Verify the exact code.

At the bottom:

- horizontal rule;
- clinic address and email;
- small centered text.

## Suggested source data

```text
Patient:
- full name
- date of birth
- computed age
- sex
- civil status
- address

Consultation:
- date
- time
- temperature
- blood pressure
- respiratory rate
- oxygen saturation
- pulse rate
- height
- weight
- chief complaint
- medical history
- reason for referral
- remarks

Configuration:
- nurse name and credentials
- physician name and credentials
- positions
- clinic address
- clinic email
- form revision code
```

---

# Shared data-selection rules

## Patient-level versus encounter-level data

Use patient-level data for stable identity and history fields:

```text
name
birth date
sex
contact information
address
office/division
designation
emergency contact
allergies
vaccinations
maintenance medications
long-term medical history
```

Use encounter-level data for event-specific fields:

```text
consultation date and time
chief complaint
vital signs
diagnosis/findings
treatment/services received
remarks
reason for referral
time in/time out
attending staff
```

Do not accidentally use the latest consultation when the user selected an older consultation. Generated forms tied to an encounter must be deterministic from the selected encounter.

## Latest-value behavior

For Form 1, fields such as height, weight, physician, last visit, and reason for visit may need the most recent recorded clinical data.

Use explicit, documented logic:

```text
latest completed consultation by encounter date
```

Do not rely on database insertion order unless that is the repository's established rule.

## Derived summaries

When a form requires a compact text summary from structured records:

- use deterministic formatting;
- do not use generative AI to invent or paraphrase medical facts;
- combine only stored values;
- preserve the clinician-authored wording when available.

Example deterministic medical-history summary:

```text
Hypertension; Type 2 diabetes mellitus; Previous appendectomy (2018)
```

---

# Suggested implementation organization

Codex may adapt this to the actual architecture. A reasonable separation is:

```text
src/
  features-or-lib/
    clinic-forms/
      types.ts
      formatters.ts
      data-mappers.ts
      employee-information/
      assessment-monitoring/
      medical-certificate/
      referral-form/
```

Keep separate:

1. database querying;
2. mapping database entities to a form view model;
3. print/PDF layout;
4. authorization;
5. UI actions.

Each form should receive a typed view model rather than querying Prisma from deep inside visual layout code.

Example conceptual interfaces:

```ts
type PatientIdentity = {
  fullName: string;
  dateOfBirth?: Date | null;
  age?: number | null;
  sex?: string | null;
  civilStatus?: string | null;
  address?: string | null;
};

type MedicalCertificateViewModel = {
  patient: PatientIdentity;
  consultationDate?: Date | null;
  diagnosisFindings?: string | null;
  remarks?: string | null;
  purpose?: string | null;
  issuedAt: Date;
  signatory: {
    name: string;
    credentials?: string | null;
    position: string;
  };
};
```

These names are examples only. Reuse existing repository types where possible.

---

# UI integration expectations

Codex should determine the best integration points after inspecting the application.

Likely actions include:

```text
Generate Employee Information Form
Print Assessment Monitoring Sheet
Generate Medical Certificate
Generate Referral Form
```

Context rules:

- employee information: patient-level action;
- assessment sheet: patient-level action, optionally with date range;
- medical certificate: consultation-level action;
- referral form: consultation-level action.

Disable or explain an action when its required encounter data does not exist.

Before generating a legally or clinically meaningful document, a preview/edit-confirm step may be appropriate for fields such as:

```text
diagnosis/findings
remarks
purpose
reason for referral
selected signatory
issuance date
```

Do not silently mutate the underlying clinical record merely because a user edited a print-only field, unless the existing workflow explicitly treats that edit as a clinical-record update.

---

# Visual validation process

For each form:

1. Generate a populated preview using realistic sample data.
2. Display the generated form and reference image side by side.
3. Compare:
   - page margins;
   - section positions;
   - column widths;
   - row heights;
   - typography;
   - logo size and alignment;
   - border thickness;
   - gray fills;
   - footer placement;
   - one-page fit.
4. Print to PDF using A4 and 100% scale.
5. Inspect the produced PDF, not only the browser preview.
6. Test long names, long addresses, empty values, and multiline clinical content.
7. Verify that every generated field came from the intended patient or consultation.

Pixel-perfect matching is not required at the expense of maintainability, but the output should be immediately recognizable as the same approved form and should not look redesigned.

---

# Acceptance criteria

## All forms

- [ ] Uses A4 portrait.
- [ ] Prints at 100% without clipping.
- [ ] No application UI appears in print/PDF.
- [ ] No `null`, `undefined`, or accidental placeholders.
- [ ] Empty values preserve the form layout.
- [ ] Long values wrap or shrink safely.
- [ ] Authorization follows existing application rules.
- [ ] Patient information is not publicly cached.
- [ ] Reference scan artifacts are not reproduced.
- [ ] Layout closely matches the supplied image.
- [ ] Generated data matches the selected patient/consultation.

## Employee Information

- [ ] Employee, primary-contact, and medical sections are present.
- [ ] Vaccine table preserves the COVID and Others structure.
- [ ] Medical history and medication areas remain readable.
- [ ] Smoking and exercise checkboxes render correctly.

## Assessment Monitoring Sheet

- [ ] Column order and approximate widths match the reference.
- [ ] Multiple encounters render in rows.
- [ ] Table headers repeat on additional pages when needed.
- [ ] Date/time and vital-sign fields remain legible.

## Medical Certificate

- [ ] Official header and title match the reference hierarchy.
- [ ] Diagnosis and remarks boxes remain within one page.
- [ ] Issuance sentence uses correct ordinal date.
- [ ] Signatory, validity note, revision code, and footer are present.

## Referral Form

- [ ] Demographic and consultation rows match the reference.
- [ ] Vital-sign table uses the correct labels and order.
- [ ] Four narrative sections have sufficient space.
- [ ] Nurse and physician signatory blocks are present.
- [ ] Validity note, revision code, and footer are present.

---

# Open items requiring clinic confirmation

Before final production approval, confirm:

1. Exact official logo asset.
2. Exact clinic address and email.
3. Current doctor and nurse signatories.
4. Whether signatures are handwritten, uploaded images, or digital.
5. Exact revision codes for each form.
6. Meaning and source of `NOD`.
7. Approved date formats.
8. Whether Form 1 should include BMI.
9. Whether assessment sheets may produce multiple pages.
10. Whether the certificate purpose is free text or selected from controlled options.
11. The fifth form's reference and requirements.

Until confirmed, use configurable placeholders in development and do not invent official details.
