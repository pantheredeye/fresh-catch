-- Add delivery address and soft delete fields to User table
ALTER TABLE "User" ADD COLUMN "deliveryStreet" TEXT;
ALTER TABLE "User" ADD COLUMN "deliveryCity" TEXT;
ALTER TABLE "User" ADD COLUMN "deliveryState" TEXT;
ALTER TABLE "User" ADD COLUMN "deliveryZip" TEXT;
ALTER TABLE "User" ADD COLUMN "deliveryNotes" TEXT;
ALTER TABLE "User" ADD COLUMN "deletedAt" INTEGER;
