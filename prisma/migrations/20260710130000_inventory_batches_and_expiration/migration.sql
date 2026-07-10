-- Extend inventory items into expiry-aware medicine batches without removing existing data.
ALTER TABLE "MedicineRequest" ADD COLUMN "inventoryItemId" TEXT;

ALTER TABLE "InventoryItem"
  ADD COLUMN "dosage" TEXT,
  ADD COLUMN "brandName" TEXT,
  ADD COLUMN "classification" TEXT,
  ADD COLUMN "pcsPerBox" INTEGER,
  ADD COLUMN "expirationDate" TIMESTAMP(3),
  ADD COLUMN "batchKey" TEXT;

-- Existing rows are already distinct; retain that identity as their legacy batch key.
UPDATE "InventoryItem" SET "batchKey" = "id" WHERE "batchKey" IS NULL;
ALTER TABLE "InventoryItem" ALTER COLUMN "batchKey" SET NOT NULL;

DROP INDEX IF EXISTS "InventoryItem_clinicId_name_key";
CREATE UNIQUE INDEX "InventoryItem_clinicId_batchKey_key" ON "InventoryItem"("clinicId", "batchKey");
CREATE INDEX "InventoryItem_clinicId_name_expirationDate_idx" ON "InventoryItem"("clinicId", "name", "expirationDate");
CREATE INDEX "InventoryItem_expirationDate_idx" ON "InventoryItem"("expirationDate");
CREATE INDEX "MedicineRequest_inventoryItemId_idx" ON "MedicineRequest"("inventoryItemId");

ALTER TABLE "MedicineRequest"
  ADD CONSTRAINT "MedicineRequest_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
