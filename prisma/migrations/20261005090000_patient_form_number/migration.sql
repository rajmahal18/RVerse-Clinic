-- Additive only: existing patient identifiers and application tables are unchanged.
CREATE TABLE "PatientFormNumber" (
  "patientId" TEXT NOT NULL,
  "number" SERIAL NOT NULL,
  CONSTRAINT "PatientFormNumber_pkey" PRIMARY KEY ("patientId")
);

CREATE UNIQUE INDEX "PatientFormNumber_number_key" ON "PatientFormNumber"("number");

-- Assign existing patients in registration order, with a deterministic tie-breaker.
INSERT INTO "PatientFormNumber" ("patientId")
SELECT "id" FROM "Patient" ORDER BY "createdAt", "id";
