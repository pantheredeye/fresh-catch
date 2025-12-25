-- Migration: Add locationDetails and customerInfo fields to Market table
-- AlterTable
ALTER TABLE "Market" ADD COLUMN "locationDetails" TEXT;
ALTER TABLE "Market" ADD COLUMN "customerInfo" TEXT;
