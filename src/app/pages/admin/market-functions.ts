"use server";

import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { requireCsrf } from "@/session/csrf";

const FIELD_LIMITS = {
  name: 200,
  schedule: 500,
  subtitle: 200,
  locationDetails: 500,
  customerInfo: 1000,
  catchPreview: 2000,
  notes: 1000,
  rawTranscript: 5000,
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

export async function createMarket(csrfToken: string, data: {
  name: string;
  schedule: string;
  subtitle?: string | null;
  locationDetails?: string | null;
  customerInfo?: string | null;
  active?: boolean;
  type?: string;
  expiresAt?: string | null;
  catchPreview?: string | null;
  notes?: string | null;
  rawTranscript?: string | null;
}) {
  requireCsrf(csrfToken);

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
      type: data.type || "regular",
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      catchPreview: data.catchPreview || null,
      notes: data.notes || null,
      rawTranscript: data.rawTranscript || null,
    },
  });

  return market;
}

export async function updateMarket(
  csrfToken: string,
  id: string,
  data: {
    name?: string;
    schedule?: string;
    subtitle?: string | null;
    locationDetails?: string | null;
    customerInfo?: string | null;
    active?: boolean;
    type?: string;
    expiresAt?: string | null;
    catchPreview?: string | null;
    notes?: string | null;
    rawTranscript?: string | null;
  }
) {
  requireCsrf(csrfToken);

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
      ...(data.type !== undefined && { type: data.type }),
      ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }),
      ...(data.catchPreview !== undefined && { catchPreview: data.catchPreview || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.rawTranscript !== undefined && { rawTranscript: data.rawTranscript || null }),
    },
  });

  return market;
}

export async function deleteMarket(csrfToken: string, id: string) {
  requireCsrf(csrfToken);

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

export async function toggleMarketActive(csrfToken: string, id: string) {
  requireCsrf(csrfToken);

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

export async function cancelPopup(csrfToken: string, id: string) {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    throw new Error("Admin access required");
  }

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
      cancelledAt: new Date(),
      active: false,
    },
  });

  return market;
}

export async function endPopup(csrfToken: string, id: string) {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    throw new Error("Admin access required");
  }

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
      active: false,
    },
  });

  return market;
}

export async function updateMarketCatchPreview(
  csrfToken: string,
  id: string,
  catchPreview: string,
  rawTranscript?: string | null
) {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    throw new Error("Admin access required");
  }

  const fieldError = validateMarketFields({ catchPreview, ...(rawTranscript !== undefined && { rawTranscript }) });
  if (fieldError) throw new Error(fieldError);

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
      catchPreview,
      ...(rawTranscript !== undefined && { rawTranscript: rawTranscript || null }),
    },
  });

  return market;
}

// Helpers

export function isPopupExpired(market: { type: string; expiresAt: Date | null }): boolean {
  return market.type === "popup" && !!market.expiresAt && market.expiresAt < new Date();
}

export function isPopupCancelled(market: { cancelledAt: Date | null }): boolean {
  return market.cancelledAt !== null;
}
