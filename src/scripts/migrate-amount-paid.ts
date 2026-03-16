import { defineScript } from "rwsdk/worker";
import { db, setupDb } from "@/db";

/**
 * Data migration: sync amountPaid for existing orders.
 *
 * - Orders with paymentStatus='paid' and a non-null price: set amountPaid = price
 * - Orders with null price: leave amountPaid as 0
 * - Idempotent: safe to run multiple times
 *
 * Run: pnpm run worker:run ./src/scripts/migrate-amount-paid.ts
 */
export default defineScript(async ({ env }) => {
  await setupDb(env);

  // Count totals before migration
  const allOrders = await db.order.findMany({
    select: { id: true, price: true, amountPaid: true, paymentStatus: true },
  });

  const total = allOrders.length;
  let updated = 0;
  let skippedNull = 0;
  let skippedAlready = 0;
  let skippedUnpaid = 0;

  console.log(`\n📊 Found ${total} orders total\n`);

  // Update paid orders where amountPaid doesn't match price
  for (const order of allOrders) {
    if (order.paymentStatus !== "paid") {
      skippedUnpaid++;
      continue;
    }

    if (order.price === null) {
      skippedNull++;
      console.log(`⚠️  Order ${order.id}: paid but price is null, skipping`);
      continue;
    }

    if (order.amountPaid === order.price) {
      skippedAlready++;
      continue;
    }

    await db.order.update({
      where: { id: order.id },
      data: { amountPaid: order.price },
    });
    updated++;
    console.log(
      `✅ Order ${order.id}: set amountPaid = ${order.price} cents ($${(order.price / 100).toFixed(2)})`,
    );
  }

  console.log(`\n📋 Migration complete:`);
  console.log(`   Total orders: ${total}`);
  console.log(`   Updated amountPaid: ${updated}`);
  console.log(`   Skipped (not paid): ${skippedUnpaid}`);
  console.log(`   Skipped (null price): ${skippedNull}`);
  console.log(`   Skipped (already correct): ${skippedAlready}`);
});
