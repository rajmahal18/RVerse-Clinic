import type { ClinicFormData, ClinicFormSlug } from "@/lib/clinic-forms";

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
          <tr><td className="label">Name:</td><td colSpan={5} /></tr>
          <tr><td className="label">Relationship:</td><td colSpan={5} /></tr>
          <tr><td className="label">Contact Number:</td><td colSpan={5} /></tr>
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
            <p>Medicine/Drugs:</p>
            <p>Foods/Insects Etc.:</p>
          </div>
          <div className="employee-box-title">Maintenance Medicine/ Current Medication</div>
          <div className="employee-medication-box">{medicineLines.map((line) => <p key={line}>{line}</p>)}</div>
        </div>
        <div className="employee-right">
          <div className="employee-box-title">Medical History</div>
          <div className="employee-history-box">{data.latestVisit?.medicalHistory}</div>
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
        <span>Allergies:</span>
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

export function ClinicFormTemplate({ form, data }: { form: ClinicFormSlug; data: ClinicFormData }) {
  if (form === "employee-information") return <EmployeeInformationForm data={data} />;
  if (form === "assessment-monitoring") return <AssessmentMonitoringSheet data={data} />;
  if (form === "medical-certificate") return <MedicalCertificate data={data} />;
  return <ReferralForm data={data} />;
}
