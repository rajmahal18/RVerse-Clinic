import { LabResultType } from "@prisma/client";

export type LabColumn = "result" | "siResult" | "conventionalResult";

export type LabTestDefinition = {
  key: string;
  name: string;
  unit?: string;
  referenceRange?: string;
  siUnit?: string;
  siReferenceRange?: string;
  conventionalUnit?: string;
  conventionalReferenceRange?: string;
};

export type LabSectionDefinition = {
  title: string;
  mode: "single" | "dual";
  tests: LabTestDefinition[];
};

export type LabFormDefinition = {
  type: LabResultType;
  title: string;
  shortTitle: string;
  sections: LabSectionDefinition[];
};

export const labTypeLabels: Record<LabResultType, string> = {
  CLINICAL_CHEMISTRY: "Clinical Chemistry",
  URINALYSIS: "Urinalysis",
  HEMATOLOGY: "Hematology",
};

export const labForms: Record<LabResultType, LabFormDefinition> = {
  CLINICAL_CHEMISTRY: {
    type: LabResultType.CLINICAL_CHEMISTRY,
    title: "Clinical Chemistry Result",
    shortTitle: "Clinical Chemistry",
    sections: [
      {
        title: "Glycosylated Hemoglobin",
        mode: "single",
        tests: [{ key: "hba1c", name: "Glycosylated Hemoglobin (HbA1c)", unit: "%", referenceRange: "4.0-6" }],
      },
      {
        title: "Clinical Chemistry Result",
        mode: "dual",
        tests: [
          { key: "glucose", name: "Glucose", siUnit: "mmol/L", siReferenceRange: "4.1-5.9", conventionalUnit: "mg/dL", conventionalReferenceRange: "74-106" },
          { key: "bun", name: "Blood Urea Nitrogen", siUnit: "mmol/L", siReferenceRange: "2.5-6.1", conventionalUnit: "mg/dL", conventionalReferenceRange: "7-17" },
          { key: "creatinine", name: "Creatinine", siUnit: "umol/L", siReferenceRange: "58-110", conventionalUnit: "mg/dL", conventionalReferenceRange: "0.66-1.25" },
          { key: "total_cholesterol", name: "Total Cholesterol", siUnit: "mmol/L", siReferenceRange: "0-5.2", conventionalUnit: "mg/dL", conventionalReferenceRange: "0-200" },
          { key: "triglycerides", name: "Triglycerides", siUnit: "mmol/L", siReferenceRange: "0-1.69", conventionalUnit: "mg/dL", conventionalReferenceRange: "0-150" },
          { key: "hdl", name: "HDL Cholesterol", siUnit: "mmol/L", siReferenceRange: "1.03-1.54", conventionalUnit: "mg/dL", conventionalReferenceRange: "40-59" },
          { key: "ldl", name: "LDL Cholesterol", siUnit: "mmol/L", siReferenceRange: "0-2.59", conventionalUnit: "mg/dL", conventionalReferenceRange: "0-100" },
          { key: "sgpt_alt", name: "SGPT/ALT", siUnit: "U/L", siReferenceRange: "0-35", conventionalUnit: "U/L", conventionalReferenceRange: "0-35" },
          { key: "sgot_ast", name: "SGOT/AST", siUnit: "U/L", siReferenceRange: "14-36", conventionalUnit: "U/L", conventionalReferenceRange: "14-36" },
          { key: "magnesium", name: "Magnesium", siUnit: "mmol/L", siReferenceRange: "0.7-1.0", conventionalUnit: "mg/dL", conventionalReferenceRange: "1.6-2.3" },
          { key: "sodium", name: "Sodium", siUnit: "mmol/L", siReferenceRange: "137-145", conventionalUnit: "mmol/L", conventionalReferenceRange: "137-145" },
          { key: "potassium", name: "Potassium", siUnit: "mmol/L", siReferenceRange: "3.5-5.1", conventionalUnit: "mmol/L", conventionalReferenceRange: "3.5-5.1" },
          { key: "chloride", name: "Chloride", siUnit: "mmol/L", siReferenceRange: "98-107", conventionalUnit: "mmol/L", conventionalReferenceRange: "98-107" },
          { key: "ionized_calcium", name: "Ionized Calcium", siUnit: "mmol/L", siReferenceRange: "1.10-1.35", conventionalUnit: "mg/dL", conventionalReferenceRange: "4.4-5.4" },
          { key: "uric_acid", name: "Uric Acid", siUnit: "umol/L", siReferenceRange: "149-389", conventionalUnit: "mg/dL", conventionalReferenceRange: "2.5-6.2" },
        ],
      },
    ],
  },
  URINALYSIS: {
    type: LabResultType.URINALYSIS,
    title: "Urinalysis Result",
    shortTitle: "Urinalysis",
    sections: [
      {
        title: "Physical Examination",
        mode: "single",
        tests: [
          { key: "color", name: "Color" },
          { key: "transparency", name: "Transparency" },
        ],
      },
      {
        title: "Chemical Examination",
        mode: "single",
        tests: [
          { key: "protein", name: "Protein", unit: "g/L", referenceRange: "NEGATIVE" },
          { key: "ph", name: "pH", referenceRange: "5.5-7.5" },
          { key: "specific_gravity", name: "Specific Gravity", referenceRange: "1.015-1.025" },
          { key: "glucose", name: "Glucose", unit: "mmol/L", referenceRange: "NEGATIVE" },
          { key: "micro_albumin", name: "Micro Albumin", unit: "mg/L", referenceRange: "10-30" },
          { key: "bilirubin", name: "Bilirubin", unit: "umol/L", referenceRange: "NEGATIVE" },
          { key: "urobilinogen", name: "Urobilinogen", unit: "umol/L", referenceRange: "3.4-17" },
          { key: "nitrite", name: "Nitrite", referenceRange: "NEGATIVE" },
          { key: "leukocyte", name: "Leukocyte", unit: "Leuko/uL", referenceRange: "NEGATIVE" },
          { key: "ketone", name: "Ketone", unit: "mmol/L", referenceRange: "NEGATIVE" },
          { key: "blood", name: "Blood", unit: "Ery/uL", referenceRange: "NEGATIVE" },
          { key: "calcium", name: "Calcium", unit: "mmol/L", referenceRange: "1.0-2.5" },
          { key: "creatinine", name: "Creatinine", unit: "mmol/L", referenceRange: "0.9-4.4" },
          { key: "ascorbic_acid", name: "Ascorbic Acid", unit: "mmol/L", referenceRange: "0-0.5" },
        ],
      },
      {
        title: "Urine Flow Cytometry",
        mode: "dual",
        tests: [
          { key: "wbc", name: "WBC", siUnit: "/uL", siReferenceRange: "0-27", conventionalUnit: "/HPF", conventionalReferenceRange: "0-4" },
          { key: "red_blood_cells", name: "Red Blood Cells", siUnit: "/uL", siReferenceRange: "0-28", conventionalUnit: "/HPF", conventionalReferenceRange: "0-3" },
          { key: "epithelial_cells", name: "Epithelial Cells", siUnit: "/uL", siReferenceRange: "0-7", conventionalUnit: "/LPF", conventionalReferenceRange: "0-20" },
          { key: "bacteria", name: "Bacteria", siUnit: "/uL", siReferenceRange: "0-111", conventionalUnit: "/HPF", conventionalReferenceRange: "0-10" },
          { key: "mucus_threads", name: "Mucus threads", siUnit: "/uL", siReferenceRange: "0-28", conventionalUnit: "/LPF", conventionalReferenceRange: "0-82" },
        ],
      },
    ],
  },
  HEMATOLOGY: {
    type: LabResultType.HEMATOLOGY,
    title: "Hematology Result",
    shortTitle: "Hematology",
    sections: [
      {
        title: "Complete Blood Count",
        mode: "single",
        tests: [
          { key: "hemoglobin", name: "Hemoglobin", unit: "g/L", referenceRange: "120-160 g/L" },
          { key: "hematocrit", name: "Hematocrit", referenceRange: "0.36-0.46" },
          { key: "rbc_count", name: "RBC Count", unit: "X10^12/L", referenceRange: "4.2-5.4 X10^12/L" },
          { key: "mcv", name: "MCV", unit: "fL", referenceRange: "78-102 fL" },
          { key: "mch", name: "MCH", unit: "pg", referenceRange: "26-34 pg" },
          { key: "mchc", name: "MCHC", unit: "g/L", referenceRange: "310-370 g/L" },
          { key: "rdwc", name: "RDWc", unit: "%", referenceRange: "11.5-14.5 %" },
          { key: "wbc_count", name: "WBC Count", unit: "X10^9/L", referenceRange: "4.5-10 X10^9/L" },
        ],
      },
      {
        title: "Differential Count",
        mode: "single",
        tests: [
          { key: "diff_neutrophils", name: "Neutrophils", unit: "%", referenceRange: "40-70 %" },
          { key: "diff_lymphocytes", name: "Lymphocytes", unit: "%", referenceRange: "19-48 %" },
          { key: "diff_monocytes", name: "Monocytes", unit: "%", referenceRange: "3-9 %" },
          { key: "diff_eosinophils", name: "Eosinophils", unit: "%", referenceRange: "2-8 %" },
          { key: "diff_basophils", name: "Basophils", unit: "%", referenceRange: "0-5 %" },
        ],
      },
      {
        title: "Absolute Count",
        mode: "single",
        tests: [
          { key: "abs_neutrophils", name: "Neutrophils", unit: "X10^9/L", referenceRange: "1.8-7.0 X10^9/L" },
          { key: "abs_lymphocytes", name: "Lymphocytes", unit: "X10^9/L", referenceRange: "0.85-4.8 X10^9/L" },
          { key: "abs_monocytes", name: "Monocytes", unit: "X10^9/L", referenceRange: "0.13-0.90 X10^9/L" },
          { key: "abs_eosinophils", name: "Eosinophils", unit: "X10^9/L", referenceRange: "0.09-0.80 X10^9/L" },
          { key: "abs_basophils", name: "Basophils", unit: "X10^9/L", referenceRange: "0-0.50 X10^9/L" },
        ],
      },
      {
        title: "Additional CBC Fields",
        mode: "single",
        tests: [
          { key: "platelet_count", name: "Platelet Count", unit: "X10^9/L", referenceRange: "150-400 X10^9/L" },
          { key: "mpv", name: "MPV", unit: "fL", referenceRange: "7.5-10.3 fL" },
        ],
      },
    ],
  },
};

export function labFieldKey(testKey: string, column: LabColumn) {
  return `${testKey}.${column}`;
}

export function labFieldName(testKey: string, column: LabColumn) {
  return `labValue:${labFieldKey(testKey, column)}`;
}

export function getLabResultType(value: string | null | undefined) {
  return value && value in LabResultType ? (value as LabResultType) : null;
}

export function getLabDefinition(type: LabResultType) {
  return labForms[type];
}

export function getLabFieldKeys(type: LabResultType) {
  return labForms[type].sections.flatMap((section) =>
    section.tests.flatMap((test) =>
      section.mode === "dual"
        ? [labFieldKey(test.key, "siResult"), labFieldKey(test.key, "conventionalResult")]
        : [labFieldKey(test.key, "result")]
    )
  );
}
