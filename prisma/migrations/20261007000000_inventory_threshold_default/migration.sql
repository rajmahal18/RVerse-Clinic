-- Preserve thresholds already configured by staff; new items default to five.
ALTER TABLE "InventoryItem" ALTER COLUMN "reorderLevel" SET DEFAULT 5;
