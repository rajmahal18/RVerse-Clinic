-- Consolidate legacy roles into the confirmed top-level role categories.
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'DOCTOR_NURSE', 'SUPPLY_OFFICER', 'RECORDS');

ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new"
USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'ADMIN'
    WHEN 'DOCTOR' THEN 'DOCTOR_NURSE'
    WHEN 'NURSE' THEN 'DOCTOR_NURSE'
    WHEN 'PHARMACIST' THEN 'SUPPLY_OFFICER'
    WHEN 'INVENTORY_STAFF' THEN 'SUPPLY_OFFICER'
    WHEN 'CASHIER' THEN 'RECORDS'
    ELSE 'RECORDS'
  END
)::"UserRole_new";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
