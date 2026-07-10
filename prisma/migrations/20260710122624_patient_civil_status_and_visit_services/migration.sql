-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RequestType" ADD VALUE 'MEDICAL_ALLOWANCE';
ALTER TYPE "RequestType" ADD VALUE 'REFERRAL';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "civilStatus" TEXT;
