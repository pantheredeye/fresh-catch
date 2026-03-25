"use server";

import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";

const FIELD_LIMITS = {
  name: 200,
  schedule: 500,
  subtitle: 200,
  locationDetails: 500,
  customerInfo: 1000,
} as const;

function validateMarketFields(data: Record<string, unknown>): string | null {
  for (const [field, max] of Object.entries(FIELD_LIMITS)) {
    const val = data[field];
    if (typeof val === "string" && val.length > max) {
      return `${field} must be ${max} characters or less`;
    }
  }
  return null;
}

/**
 * Server functions for market CRUD operations
 * Following rwsdk pattern: server functions called from client components
 */

export async function createMarket(data: {
  name: string;
  schedule: string;
  subtitle?: string | null;
  locationDetails?: string | null;
  customerInfo?: string | null;
  active?: boolean;
}) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    throw new Error("Admin access required");
  }

  const fieldError = validateMarketFields(data);
  if (fieldError) throw new Error(fieldError);

  const market = await db.market.create({
    data: {
      organizationId: ctx.currentOrganization.id,
      name: data.name,
      schedule: data.schedule,
      subtitle: data.subtitle || null,
      locationDetails: data.locationDetails || null,
      customerInfo: data.customerInfo || null,
      active: data.active ?? true,
    },
  });


  return market;
}

export async function updateMarket(
  id: string,
  data: {
    name?: string;
    schedule?: string;
    subtitle?: string | null;
    locationDetails?: string | null;
    customerInfo?: string | null;
    active?: boolean;
  }
) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    throw new Error("Admin access required");
  }

  const fieldError = validateMarketFields(data);
  if (fieldError) throw new Error(fieldError);

  // Verify market belongs to current organization
  const existingMarket = await db.market.findFirst({
    where: {
      id,
      organizationId: ctx.currentOrganization.id,
    },
  });

  if (!existingMarket) {
    throw new Error("Market not found");
  }

  const market = await db.market.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.schedule !== undefined && { schedule: data.schedule }),
      ...(data.subtitle !== undefined && { subtitle: data.subtitle || null }),
      ...(data.locationDetails !== undefined && { locationDetails: data.locationDetails || null }),
      ...(data.customerInfo !== undefined && { customerInfo: data.customerInfo || null }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });


  return market;
}

export async function deleteMarket(id: string) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    throw new Error("Admin access required");
  }

  // Verify market belongs to current organization
  const existingMarket = await db.market.findFirst({
    where: {
      id,
      organizationId: ctx.currentOrganization.id,
    },
  });

  if (!existingMarket) {
    throw new Error("Market not found");
  }

  await db.market.delete({
    where: { id },
  });


  return { success: true };
}

export async function toggleMarketActive(id: string) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    throw new Error("Admin access required");
  }

  // Verify market belongs to current organization and get current state
  const existingMarket = await db.market.findFirst({
    where: {
      id,
      organizationId: ctx.currentOrganization.id,
    },
  });

  if (!existingMarket) {
    throw new Error("Market not found");
  }

  const market = await db.market.update({
    where: { id },
    data: {
      active: !existingMarket.active,
    },
  });


  return market;
}
