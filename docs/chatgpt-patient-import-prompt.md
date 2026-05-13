# ChatGPT prompt for 3,000 dummy patient/employee records

Use this exact prompt in ChatGPT when you want a clean import file for this app:

```text
Generate exactly 3000 dummy records for a Philippine municipal clinic system.

Output requirements:
- Return only valid JSON.
- The output must be a single JSON array.
- Do not wrap in markdown.
- Do not include comments or explanations.
- Every object must use exactly these keys in this exact order:
  "lastName",
  "firstName",
  "middleName",
  "birthDate",
  "gender",
  "address",
  "contactNo",
  "agency",
  "designation"

Field rules:
- lastName: realistic Filipino surname
- firstName: realistic Filipino given name
- middleName: realistic Filipino middle name, or empty string if unavailable
- birthDate: string in YYYY-MM-DD format only
- gender: must be exactly one of "MALE", "FEMALE", or "OTHER"
- address: realistic barangay or poblacion-style Philippine address
- contactNo: Philippine mobile number string starting with 09 and exactly 11 digits
- agency: use realistic office or department names such as Municipal Office, Public Works, Health Office, Treasurer's Office, Engineering Office, Agriculture Office, MDRRMO, Sangguniang Bayan, Mayor's Office, Water District, Public School, Barangay Health Station
- designation: realistic employee or resident designation such as Staff, Driver, Nurse, Utility Worker, Admin Aide, Teacher, Clerk, Officer, Midwife, Barangay Worker, Laborer, Cashier, Inspector, Volunteer

Data quality rules:
- Mix genders realistically.
- Ages should mostly fall between 20 and 64 years old, with a small number of minors and seniors.
- Avoid obviously fake repeated names.
- Keep the records diverse across agencies and designations.
- Do not include duplicate full names with the same birthDate.
- Keep values plain text only.

Return the final answer as raw JSON only.
```

Save the generated JSON into:

`data/imports/patients.json`

Then run:

```bash
npm run import:patients
```
