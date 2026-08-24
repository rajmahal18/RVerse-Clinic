-- Add nullable patient information fields first so existing production records remain valid.
ALTER TABLE "Patient"
  ADD COLUMN "patientNumber" TEXT,
  ADD COLUMN "primaryContact" TEXT,
  ADD COLUMN "medicalHistory" TEXT,
  ADD COLUMN "vaccineHistory" TEXT,
  ADD COLUMN "allergy" TEXT,
  ADD COLUMN "maintenance" TEXT,
  ADD COLUMN "additionalMedicalInformation" TEXT;

-- Keep existing records deployable while assigning a stable number to each row.
WITH numbered AS (
  SELECT "id", 'P-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt", "id")::text, 6, '0') AS number
  FROM "Patient"
)
UPDATE "Patient" AS patient
SET "patientNumber" = numbered.number
FROM numbered
WHERE patient."id" = numbered."id";

ALTER TABLE "Patient" ALTER COLUMN "patientNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Patient_patientNumber_key" ON "Patient"("patientNumber");
