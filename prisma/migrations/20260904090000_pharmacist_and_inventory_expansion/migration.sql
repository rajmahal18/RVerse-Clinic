-- One additive migration for the Pharmacist role and category-aware inventory.
-- Existing inventory and medicine-request records remain unchanged and valid.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PHARMACIST';
ALTER TYPE "InventoryCategory" ADD VALUE IF NOT EXISTS 'AMBULANCE_SUPPLY';

ALTER TABLE "InventoryItem"
  ADD COLUMN "itemCode" TEXT,
  ADD COLUMN "itemDescription" TEXT,
  ADD COLUMN "remarks" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "boxStock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "physicalCount" INTEGER,
  ADD COLUMN "functionalCount" INTEGER;

ALTER TABLE "InventoryMovement"
  ADD COLUMN "boxQuantityChange" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "physicalCount" INTEGER,
  ADD COLUMN "functionalCount" INTEGER;

CREATE INDEX "InventoryItem_clinicId_itemCode_idx" ON "InventoryItem"("clinicId", "itemCode");

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_boxStock_check" CHECK ("boxStock" >= 0),
  ADD CONSTRAINT "InventoryItem_physicalCount_check" CHECK ("physicalCount" IS NULL OR "physicalCount" >= 0),
  ADD CONSTRAINT "InventoryItem_functionalCount_check" CHECK (
    "functionalCount" IS NULL OR
    ("functionalCount" >= 0 AND "physicalCount" IS NOT NULL AND "functionalCount" <= "physicalCount")
  );

ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_physicalCount_check" CHECK ("physicalCount" IS NULL OR "physicalCount" >= 0),
  ADD CONSTRAINT "InventoryMovement_functionalCount_check" CHECK (
    "functionalCount" IS NULL OR
    ("functionalCount" >= 0 AND "physicalCount" IS NOT NULL AND "functionalCount" <= "physicalCount")
  );
