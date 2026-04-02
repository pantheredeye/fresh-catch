-- Replace plain index with unique constraint for order numbers per org
DROP INDEX IF EXISTS "Order_orderNumber_idx";
CREATE UNIQUE INDEX "Order_organizationId_orderNumber_key" ON "Order"("organizationId", "orderNumber");
