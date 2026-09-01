ALTER TYPE "InventoryCategory" ADD VALUE 'OFFICE_SUPPLY';

ALTER TABLE "MedicineRequest" ADD COLUMN "requestedByUserId" TEXT;

ALTER TABLE "MedicineRequest" ALTER COLUMN "visitId" DROP NOT NULL;

CREATE INDEX "MedicineRequest_requestedByUserId_idx" ON "MedicineRequest"("requestedByUserId");

ALTER TABLE "MedicineRequest"
  ADD CONSTRAINT "MedicineRequest_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
