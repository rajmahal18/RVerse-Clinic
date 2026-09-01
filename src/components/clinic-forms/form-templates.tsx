import type { ClinicFormData, ClinicFormSlug } from "@/lib/clinic-forms";
import { formatLongDate } from "@/lib/date-time";

const covidDoseLabels = ["1", "2", "3", "Booster 1 & 2"];

function value(text?: string | null) {
  return text ?? "";
}

function FieldLine({ label, children, className = "" }: { label: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`clinic-form-line ${className}`}>
      <span className="clinic-form-label">{label}</span>
      <span className="clinic-form-underline">{children}</span>
    </div>
  );
}

function OfficialHeader() {
  return (
    <div className="clinic-letterhead">
      <img src="/icons/ocmlogo.png" alt="" />
      <div>
        <p className="clinic-office-name">OFFICE OF THE CHIEF MINISTER</p>
        <p className="clinic-region-name">BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO</p>
        <div className="clinic-head-rule" />
        <p className="clinic-letterhead-title">THE CLINIC</p>
      </div>
    </div>
  );
}

function Footer({ revision, data }: { revision: string; data: ClinicFormData }) {
  return (
    <div className="clinic-official-footer">
      <p className="clinic-validity">(NOT VALID WITHOUT OFFICIAL STAMP/SEAL)</p>
      <p className="clinic-revision">{revision}</p>
      <div className="clinic-footer-rule" />
      <p>{data.clinic.address} | {data.clinic.email}</p>
    </div>
  );
}

function Signatory({ name, position, className = "" }: { name: string; position: string; className?: string }) {
  return (
    <div className={`clinic-signatory ${className}`}>
      <p className="clinic-signatory-name">{name}</p>
      <p>{position}</p>
    </div>
  );
}

function EmployeeInformationForm({ data }: { data: ClinicFormData }) {
  const covidVaccines = data.vaccinations.filter((record) => record.vaccine.toLowerCase().includes("covid")).slice(0, 4);
  const otherVaccines = data.vaccinations.filter((record) => !record.vaccine.toLowerCase().includes("covid")).slice(0, 8);
  const medicineLines = data.latestVisit?.medicines.length ? data.latestVisit.medicines : data.selectedVisit?.medicines ?? [];

  return (
    <div className="clinic-form-page employee-form-page">
      <table className="employee-info-table">
        <colgroup>
          <col className="employee-label-col" />
          <col />
          <col className="employee-small-label-col" />
          <col className="employee-small-value-col" />
          <col className="employee-small-label-col" />
          <col className="employee-small-value-col" />
        </colgroup>
        <tbody>
          <tr><th colSpan={6} className="employee-main-title">EMPLOYEE&apos;S INFORMATION</th></tr>
          <tr className="employee-name-row"><td className="label">Name:</td><td colSpan={5}>{data.patient.fullName}</td></tr>
          <tr><td className="label">Date of Birth:</td><td>{data.patient.birthDate}</td><td className="label">Age:</td><td>{data.patient.age}</td><td className="label">Gender:</td><td>{data.patient.gender}</td></tr>
          <tr><td className="label">Contact number</td><td>{data.patient.contact}</td><td className="label">Religion:</td><td /><td className="label">Tribe:</td><td /></tr>
          <tr className="employee-address-row"><td className="label">Address:</td><td colSpan={5}>{data.patient.address}</td></tr>
          <tr><td className="label">Email:</td><td colSpan={5} /></tr>
          <tr><td className="label">Office/Division:</td><td colSpan={5}>{data.patient.officeDivision}</td></tr>
          <tr><td className="label">Designation:</td><td colSpan={5}>{data.patient.designation}</td></tr>
          <tr><th colSpan={6} className="employee-subtitle">Primary Contact</th></tr>
          <tr><td className="label">Name:</td><td colSpan={5}>{data.patient.primaryContact}</td></tr>
          <tr><td className="label">Relationship:</td><td colSpan={5} /></tr>
          <tr><td className="label">Contact Number:</td><td colSpan={5}>{data.patient.contact}</td></tr>
        </tbody>
      </table>

      <div className="employee-section-title employee-medical-title">MEDICAL INFORMATION</div>
      <div className="employee-medical-grid">
        <div className="employee-left">
          <div className="employee-measure-row">
            <div><b>Height:</b> {data.patient.height}</div>
            <div><b>Weight:</b> {data.patient.weight}</div>
          </div>
          <table className="employee-vaccine-table">
            <tbody>
              <tr>
                <td className="vaccine-strip" rowSpan={13}>V<br />A<br />C<br />C<br />I<br />N<br />E<br /><br />R<br />E<br />C<br />E<br />I<br />V<br />E<br />D</td>
                <th>Name of Vaccine</th>
                <th>Dose</th>
                <th>Date</th>
              </tr>
              {covidDoseLabels.map((dose, index) => (
                <tr key={dose}>
                  {index === 0 ? <td className="covid-cell" rowSpan={4}>COVID 19</td> : null}
                  <td className="center">{dose}</td>
                  <td>{covidVaccines[index]?.date ?? ""}</td>
                </tr>
              ))}
              {Array.from({ length: 8 }, (_, index) => (
                <tr key={index}>
                  {index === 0 ? <td className="others-cell" rowSpan={8}>*Others</td> : null}
                  <td>{otherVaccines[index]?.dose ?? ""}</td>
                  <td>{otherVaccines[index] ? `${otherVaccines[index].vaccine} ${otherVaccines[index].date}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="employee-box-title">Allergy History</div>
          <div className="employee-allergy-box">
            <p>Medicine/Drugs: {data.patient.allergy}</p>
            <p>Foods/Insects Etc.:</p>
          </div>
          <div className="employee-box-title">Maintenance Medicine/ Current Medication</div>
          <div className="employee-medication-box">{medicineLines.map((line) => <p key={line}>{line}</p>)}</div>
        </div>
        <div className="employee-right">
          <div className="employee-box-title">Medical History</div>
          <div className="employee-history-box">{data.patient.medicalHistory || data.latestVisit?.medicalHistory}</div>
          <div className="employee-box-title">Additional Medical Info</div>
          <div className="employee-additional-box">
            <p>Physicians Name:</p>
            <p>Clinic Address</p>
            <p>Date of Last Visit: {data.latestVisit?.date}</p>
            <p>Reason for visit: {data.latestVisit?.reason}</p>
            <p>Surgeries:</p>
            <p>Smoking: &nbsp; [ ] Yes &nbsp;&nbsp;&nbsp;&nbsp; [ ] No</p>
            <p>Exercise: &nbsp; [ ] Yes &nbsp;&nbsp;&nbsp;&nbsp; [ ] No</p>
            <p>Family History:</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssessmentMonitoringSheet({ data }: { data: ClinicFormData }) {
  const rows = Array.from({ length: Math.max(42, data.visits.length) }, (_, index) => data.visits[index]);

  return (
    <div className="clinic-form-page assessment-page">
      <div className="assessment-header">
        <p>OFFICE OF THE CHIEF MINISTER- BARMM</p>
        <p>THE CLINIC</p>
      </div>
      <div className="assessment-info-row">
        <span>Name: <b>{data.patient.fullName}</b></span>
        <span>Age/Sex: <b>{data.patient.ageSex}</b></span>
        <span>Date of Birth: <b>{data.patient.shortBirthDate}</b></span>
        <span>Allergies: <b>{data.patient.allergy}</b></span>
      </div>
      <h1>ASSESSMENT MONITORING SHEET</h1>
      <table className="assessment-table">
        <thead>
          <tr>
            {["Date", "Time In", "Chief Complaint", "BP", "RBS", "Temp", "PR", "Services Received", "Time Out", "NOD"].map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row?.id ?? index}>
              <td>{row?.date}</td>
              <td>{row?.timeIn}</td>
              <td className="left">{row?.chiefComplaint}</td>
              <td>{row?.bloodPressure}</td>
              <td>{row?.rbs}</td>
              <td>{row?.temperature}</td>
              <td>{row?.pulseRate}</td>
              <td className="left">{row?.services}</td>
              <td>{row?.timeOut}</td>
              <td>{row?.nurseOnDuty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DailyPatientSummaryForm({ data }: { data: ClinicFormData }) {
  const visit = data.selectedVisit;
  const medicineRows = Array.from({ length: Math.max(5, visit?.medicineLog.length ?? 0) }, (_, index) => visit?.medicineLog[index]);

  return (
    <div className="clinic-form-page daily-summary-page">
      <h1>DAILY PATIENT SUMMARY</h1>
      <div className="daily-summary-patient-lines">
        <p><span>Name:</span> <b>{data.patient.fullName}</b></p>
        <div>
          <p><span>Date of Birth:</span> <b>{data.patient.shortBirthDate}</b></p>
          <p><span>Age:</span> <b>{data.patient.age}</b></p>
          <p><span>Gender:</span> <b>{data.patient.gender}</b></p>
        </div>
      </div>

      <section className="daily-summary-section daily-consent">
        <h2>CONSENT</h2>
        <p>
          I hereby give my consent for the processing of my personal health information containing my contact details, vaccination status and medical history.
        </p>
        <p>
          Furthermore, I understand that my information will be used for records-keeping by The Clinic under the Office of the Chief Minister (OCM); My record can be used by The Clinic for statistics and research in crafting the necessary health and wellness programs for potential implementation in the OCM; My information and identity will be kept confidential at all times, unless disclosure is separately permitted expressly in writing; The processing of my health information such as collection, recording, organization, storage, updating or modification, retrieval and consultation shall be in accordance with Republic Act (RA) No. 10173 or the &quot;Data Privacy Act of 2012&quot;; My permission will be obtained in case of use of my personal health information for purposes other than the foregoing.
        </p>
        <p>
          Furthermore, I hereby release and hold harmless The Clinic and its Staff from any liability and damages resulting from the processing of my health information in accordance with the specific purposes mentioned therein and Republic Act (RA) No. 10173.
        </p>
        <div className="daily-sign-line">Signature of the Patient</div>
      </section>

      <section className="daily-summary-section">
        <h2>ASSESSMENT MONITORING SHEET</h2>
        <table className="daily-summary-table assessment-table compact">
          <thead><tr>{["Date", "Time In", "Chief Complaint", "BP", "RBS", "Temp", "Services Received", "Time Out", "NOD"].map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td>{visit?.shortDate}</td>
              <td>{visit?.timeIn}</td>
              <td className="left">{visit?.chiefComplaint}</td>
              <td>{visit?.bloodPressure}</td>
              <td>{visit?.rbs}</td>
              <td>{visit?.temperature}</td>
              <td className="left">{visit?.services}</td>
              <td>{visit?.timeOut}</td>
              <td>{visit?.nurseOnDuty}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="daily-summary-section">
        <h2>DOCTORS ORDER SHEET</h2>
        <table className="daily-summary-table doctors-order-compact">
          <thead><tr><th>Progress Notes / Care Plan</th><th>Doctors Order</th></tr></thead>
          <tbody>
            <tr>
              <td>{visit?.progressNotes}</td>
              <td>{visit?.treatmentPlan}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="daily-summary-section">
        <h2>MEDICINE LOG</h2>
        <table className="daily-summary-table medicine-log-table">
          <thead>
            <tr>{["Date", "Time Requested", "Item (Indicate Dosage)", "Qty", "Released by", "Received by", "Time Received"].map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {medicineRows.map((row, index) => (
              <tr key={index}>
                <td>{row?.date}</td>
                <td>{row?.timeRequested}</td>
                <td className="left">{row?.item}</td>
                <td>{row?.quantity}</td>
                <td>{row?.releasedBy}</td>
                <td>{row?.receivedBy}</td>
                <td>{row?.timeReceived}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="daily-summary-section daily-remarks">
        <h2>REMARKS</h2>
        <div />
      </section>

      <div className="daily-summary-signatures">
        <div><span>Signature of the Patient</span><p>Date and Time</p></div>
        <div><span>Signature of the Nurse</span><p>Date and Time</p></div>
      </div>
    </div>
  );
}

function MedicalCertificate({ data }: { data: ClinicFormData }) {
  const visit = data.selectedVisit;

  return (
    <div className="clinic-form-page certificate-page">
      <OfficialHeader />
      <h1 className="clinic-document-title">MEDICAL CERTIFICATE</h1>
      <p className="certificate-intro">This is to certify that the person named hereunder has the following records of consultation and treatment in this clinic.</p>
      <div className="certificate-fields">
        <FieldLine label="Name:">{data.patient.fullName}</FieldLine>
        <div className="clinic-form-row">
          <FieldLine label="Age:" className="short">{data.patient.age}</FieldLine>
          <FieldLine label="Sex:" className="short">{data.patient.gender}</FieldLine>
          <FieldLine label="Civil Status:" className="wide">{data.patient.civilStatus}</FieldLine>
        </div>
        <FieldLine label="Address:">{data.patient.address}</FieldLine>
        <FieldLine label="Date of Consultation:" className="date-line">{visit?.date}</FieldLine>
      </div>
      <p className="box-label">Diagnosis/Findings:</p>
      <div className="certificate-box diagnosis-box">{visit?.diagnosis}</div>
      <p className="box-label">Remarks</p>
      <div className="certificate-box remarks-box">{visit?.treatmentPlan}</div>
      <p className="certificate-purpose">This certification is being issued upon his/her request for whatever PURPOSE/LEGAL INTENT it may serve him/her best.</p>
      <p className="issuance-line">Issued this <b>{data.issued.ordinalDay}</b> day of <b>{data.issued.month}</b> <b>{data.issued.year}</b> at Cotabato City.</p>
      <Signatory name={data.signatory.physicianName} position={data.signatory.physicianPosition} />
      <Footer revision={data.signatory.certificateRevision} data={data} />
    </div>
  );
}

function ReferralForm({ data }: { data: ClinicFormData }) {
  const visit = data.selectedVisit;
  const referral = visit?.referral;

  return (
    <div className="clinic-form-page referral-page">
      <OfficialHeader />
      <h1 className="clinic-document-title">REFERRAL FORM</h1>
      <div className="referral-fields">
        <div className="clinic-form-row">
          <FieldLine label="Date of Consultation:" className="wide">{visit?.date}</FieldLine>
          <FieldLine label="Time:" className="short">{visit?.timeIn}</FieldLine>
        </div>
        <div className="clinic-form-row">
          <FieldLine label="Name:" className="wide">{data.patient.fullName}</FieldLine>
          <FieldLine label="Date of Birth:" className="medium">{data.patient.shortBirthDate}</FieldLine>
        </div>
        <div className="clinic-form-row">
          <FieldLine label="Age:" className="short">{data.patient.age}</FieldLine>
          <FieldLine label="Sex:" className="short">{data.patient.gender}</FieldLine>
          <FieldLine label="Civil Status:" className="wide">{data.patient.civilStatus}</FieldLine>
        </div>
        <FieldLine label="Address:">{data.patient.address}</FieldLine>
      </div>
      <table className="vital-signs-table">
        <tbody>
          <tr><th colSpan={8}>Vital Signs</th></tr>
          <tr>
            <td><b>Temp:</b></td><td>{visit?.temperature}</td>
            <td><b>Blood Pressure:</b></td><td>{visit?.bloodPressure}</td>
            <td><b>RR:</b></td><td>{visit?.respiratoryRate}</td>
            <td><b>O2Sat:</b></td><td />
          </tr>
          <tr>
            <td><b>PR:</b></td><td>{visit?.pulseRate}</td>
            <td><b>Height:</b></td><td>{data.patient.height}</td>
            <td><b>Weight:</b></td><td>{data.patient.weight}</td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
      <div className="referral-narratives">
        <section><h2>Chief Complaint</h2><p>{visit?.chiefComplaint}</p></section>
        <section><h2>Medical History</h2><p>{value(referral?.medicalHistory) || visit?.progressNotes}</p></section>
        <section><h2>Reason for Referral</h2><p>{value(referral?.reasonForReferral)}</p></section>
        <section><h2>Remarks</h2><p>{value(referral?.remarks) || visit?.treatmentPlan}</p></section>
      </div>
      <Signatory name={data.signatory.nurseName} position={data.signatory.nursePosition} className="referral-nurse" />
      <Signatory name={data.signatory.physicianName} position={data.signatory.physicianPosition} className="referral-physician" />
      <Footer revision={data.signatory.referralRevision} data={data} />
    </div>
  );
}

function MedicalAllowanceForm({ data }: { data: ClinicFormData }) {
  return (
    <div className="clinic-form-page allowance-page">
      <OfficialHeader />
      <h1 className="allowance-title">CERTIFICATION FOR THE GRANT OF<br />MEDICAL ALLOWANCE</h1>
      <div className="allowance-body">
        <div className="allowance-employee-line"><span>This is to certify that</span><span className="allowance-underline">{data.patient.fullName}</span></div>
        <div className="allowance-identity-row"><div><b>{data.patient.designation}</b><i>Position/Title</i></div><div><b>{data.patient.officeDivision}</b><i>Office/Division</i></div></div>
        <p>based on the review and validation of this office, the submitted documents were found to be complete and authentic consisting of official receipts and supporting medical documents with a total amount equal or exceeding to Seven Thousand Pesos (P7,000.00).</p>
        <p>This certification is issued pursuant to Memorandum Order No. 0381. Series of 2025, &quot;Supplemental Guidelines on the Grant of Medical Allowance to Eligible Employees of the Office of the Chief Minister - BARMM.&quot; to endorse the said employee as <b>CLEARED</b> for the Medical Allowance liquidation to the FMS-Accounting and AMS-HRMD.</p>
        <p className="allowance-issued">Issued this <b>{data.issued.ordinalDay}</b> day of <b>{data.issued.month}</b> <b>{data.issued.year}</b> at Cotabato City.</p>
        <div className="allowance-signature-block"><div className="allowance-signature-row"><span>Reviewed and Validated by:</span><Signatory name={data.signatory.nurseName} position={data.signatory.nursePosition} /></div><div className="allowance-signature-row"><span>Certified by:</span><Signatory name={data.signatory.physicianName} position={data.signatory.physicianPosition} /></div></div>
      </div>
      <Footer revision="OCMTC_CFYOMA_2025_01" data={data} />
    </div>
  );
}

function DoctorsOrderForm({ data }: { data: ClinicFormData }) {
  const visit = data.selectedVisit;
  const progressLines = [
    visit ? `${visit.shortDate} @ ${visit.timeIn}` : "",
    visit?.chiefComplaint ? `Chief Complaint: ${visit.chiefComplaint}` : "",
    [
      visit?.bloodPressure ? `BP ${visit.bloodPressure}` : "",
      visit?.rbs ? `RBS ${visit.rbs}` : "",
      visit?.temperature ? `Temp ${visit.temperature}` : "",
      visit?.pulseRate ? `PR ${visit.pulseRate}` : "",
      visit?.respiratoryRate ? `RR ${visit.respiratoryRate}` : "",
    ].filter(Boolean).join(" / "),
    visit?.progressNotes ? `Progress Notes / Medical History: ${visit.progressNotes}` : "",
    visit?.diagnosis ? `Diagnosis: ${visit.diagnosis}` : "",
  ].filter(Boolean);
  const orderLines = [
    visit?.treatmentPlan,
    ...(visit?.medicines ?? []).map((medicine) => `Medicine: ${medicine}`),
  ].filter(Boolean);
  const rows = Array.from({ length: 30 }, (_, index) => index);

  return (
    <div className="clinic-form-page doctors-order-page">
      <div className="doctors-order-top">
        <p>OFFICE OF THE CHIEF MINISTER- BARMM</p>
        <p>THE CLINIC</p>
      </div>
      <div className="doctors-order-patient">
        <span>Name: <b>{data.patient.fullName}</b></span>
        <span>Age/Sex: <b>{data.patient.ageSex}</b></span>
        <span>Date of Birth: <b>{data.patient.shortBirthDate}</b></span>
        <span>Allergies: <b>{data.patient.allergy}</b></span>
      </div>
      <h1>DOCTORS ORDER SHEET</h1>
      <table className="doctors-order-table">
        <thead>
          <tr><th>Progress Notes/Care Plan</th><th>Doctors Order</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td>{row === 0 ? progressLines.map((line) => <p key={line}>{line}</p>) : null}</td>
              <td>{row === 0 ? orderLines.map((line) => <p key={line}>{line}</p>) : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const csmScale = ["Strongly Disagree", "Disagree", "Neither Agree nor Disagree", "Agree", "Strongly Agree", "N/A"];
const csmQuestions = [
  ["sqd0", "I am satisfied with the service that I availed."],
  ["sqd1", "I spent a reasonable amount of time for my transaction."],
  ["sqd2", "The office followed the transaction's requirements and steps based on the information provided."],
  ["sqd3", "The steps (including payment) I needed to do for my transaction were easy and simple."],
  ["sqd4", "I easily found information about my transaction from the office or its website."],
  ["sqd5", "I paid a reasonable amount of fees for my transaction."],
  ["sqd6", "I feel the office was fair to everyone, or walang palakasan, during my transaction."],
  ["sqd7", "I was treated courteously by the staff, and the staff was helpful."],
  ["sqd8", "I got what I needed from the government office, or denial was sufficiently explained to me."],
] as const;

function CsmCheckbox({ selected, label }: { selected: string | null | undefined; label: string }) {
  return <span className="csm-check">{selected === label ? "X" : ""}</span>;
}

function ClientSatisfactionSurveyForm({ data }: { data: ClinicFormData }) {
  const survey = data.selectedVisit?.satisfactionSurvey;
  const visit = data.selectedVisit;
  const ccOptions = {
    cc1: ["1. I know what a CC is and I saw this office's CC.", "2. I know what a CC is but I did NOT see this office's CC.", "3. I learned of the CC only when I saw this office's CC.", "4. I do not know what a CC is and I did not see one in this office."],
    cc2: ["1. Easy to see", "2. Somewhat easy to see", "3. Difficult to see", "4. Not visible at all", "5. Not Applicable"],
    cc3: ["1. Helped very much", "2. Somewhat helped", "3. Did not help", "4. Not Applicable"],
  };
  return <>
    <div className="clinic-form-page csm-page">
      <OfficialHeader />
      <div className="csm-approval">(On-Site Version)<br /><b>CLIENT SATISFACTION FORM</b></div>
      <h1>HELP US SERVE YOU BETTER!</h1>
      <p className="csm-intro">This CLIENT SATISFACTION MEASUREMENT (CSM) tracks the customer experience of government offices. Your feedback on your recently concluded transaction will help this office provide a better service. Personal information shared will be kept confidential and you always have the option to not answer this form.</p>
      <div className="csm-respondent-grid">
        <span>Client type: <b>{survey?.clientType || ""}</b></span><span>Date: <b>{survey?.surveyDate ? formatLongDate(survey.surveyDate) : visit?.shortDate || ""}</b></span><span>Sex: <b>{survey?.respondentSex || ""}</b></span><span>Age: <b>{survey?.respondentAge || ""}</b></span><span>Region of residence: <b>{survey?.regionOfResidence || ""}</b></span><span>Office visited/transacted with: <b>{survey?.officeVisited || "The Clinic"}</b></span><span>Service Availed: <b>{survey?.serviceAvailed || visit?.services || ""}</b></span>
      </div>
      <p className="csm-instructions"><b>INSTRUCTIONS:</b> Please place a Check mark (✓) in the designated box that corresponds to your answer on the Citizen&apos;s Charter (CC) questions. The Citizen&apos;s Charter is an official document that reflects the services of a government agency/office including its requirements, fees, and processing times among others.</p>
      {(["cc1", "cc2", "cc3"] as const).map((key) => <section className="csm-question" key={key}><h2>{key.toUpperCase()} {key === "cc1" ? "Which of the following best describes your awareness of a CC?" : key === "cc2" ? "If aware of CC, would you say that the CC of this office was ...?" : "If aware of CC, how much did the CC help you in your transaction?"}</h2>{ccOptions[key].map((option) => <p key={option}><CsmCheckbox selected={survey?.[key]} label={option} /> {option}</p>)}</section>)}
    </div>
    <div className="clinic-form-page csm-page csm-page-two">
      <p className="csm-instructions"><b>INSTRUCTIONS:</b> For SQD 0-8, please put a check mark (✓) on the column that best corresponds to your answer.</p>
      <table className="csm-sqd-table"><thead><tr><th>Dimension</th>{csmScale.map((scale) => <th key={scale}>{scale}</th>)}</tr></thead><tbody>{csmQuestions.map(([key, question]) => <tr key={key}><td><b>{key.toUpperCase()}.</b> {question}</td>{csmScale.map((scale) => <td key={scale}><CsmCheckbox selected={String(survey?.[key as keyof typeof survey] ?? "")} label={scale} /></td>)}</tr>)}</tbody></table>
      <p className="csm-suggestion-label">Suggestions on how we can further improve our services (optional):</p><div className="csm-lines">{survey?.suggestions}</div>
      <p className="csm-email">Email address (optional): <b>{survey?.email}</b></p><p className="csm-thanks">THANK YOU!</p><Footer revision="OCM.OCOS.F.01.EN Rev.0" data={data} />
    </div>
  </>;
}

export function ClinicFormTemplate({ form, data }: { form: ClinicFormSlug; data: ClinicFormData }) {
  if (form === "employee-information") return <EmployeeInformationForm data={data} />;
  if (form === "assessment-monitoring") return <AssessmentMonitoringSheet data={data} />;
  if (form === "daily-patient-summary") return <DailyPatientSummaryForm data={data} />;
  if (form === "medical-certificate") return <MedicalCertificate data={data} />;
  if (form === "medical-allowance") return <MedicalAllowanceForm data={data} />;
  if (form === "doctors-order") return <DoctorsOrderForm data={data} />;
  if (form === "client-satisfaction-survey") return <ClientSatisfactionSurveyForm data={data} />;
  return <ReferralForm data={data} />;
}
