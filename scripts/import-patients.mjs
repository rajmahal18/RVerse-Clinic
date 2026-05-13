import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, PatientGender } from "@prisma/client";

const prisma = new PrismaClient();

const importPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(process.cwd(), "data", "imports", "patients.json");

function normalizeGender(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (normalized === "MALE") return PatientGender.MALE;
  if (normalized === "FEMALE") return PatientGender.FEMALE;
  return PatientGender.OTHER;
}

function requiredString(value, fieldName, index) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`Record ${index + 1}: ${fieldName} is required.`);
  }

  return normalized;
}

async function main() {
  if (!existsSync(importPath)) {
    throw new Error(`Import file not found: ${importPath}`);
  }

  const raw = readFileSync(importPath, "utf8");
  const records = JSON.parse(raw);

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Import file must contain a non-empty JSON array.");
  }

  const clinic = await prisma.clinic.upsert({
    where: { id: "main-clinic" },
    update: {
      name: "The Clinic",
      contact: "09170000000",
    },
    create: {
      id: "main-clinic",
      name: "The Clinic",
      address: "Main Municipal Clinic",
      contact: "09170000000",
    },
  });

  const payload = records.map((record, index) => ({
    clinicId: clinic.id,
    lastName: requiredString(record.lastName, "lastName", index),
    firstName: requiredString(record.firstName, "firstName", index),
    middleName: String(record.middleName ?? "").trim() || null,
    birthDate: new Date(requiredString(record.birthDate, "birthDate", index)),
    gender: normalizeGender(record.gender),
    address: String(record.address ?? "").trim() || null,
    contactNo: String(record.contactNo ?? "").trim() || null,
    agency: String(record.agency ?? "").trim() || null,
    designation: String(record.designation ?? "").trim() || null,
  }));

  const invalidBirthDate = payload.find((record) => Number.isNaN(record.birthDate.getTime()));

  if (invalidBirthDate) {
    throw new Error("One or more records contain an invalid birthDate. Use YYYY-MM-DD.");
  }

  await prisma.patient.createMany({
    data: payload,
    skipDuplicates: false,
  });

  console.log(`Imported ${payload.length} patient records into clinic "${clinic.name}".`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
