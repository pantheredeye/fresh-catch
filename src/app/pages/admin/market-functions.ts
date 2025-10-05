"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";

/**
 * Server functions for market CRUD operations
 * Following rwsdk pattern: server functions called from client components
 */

export async function createMarket(data: {
  name: string;
  schedule: string;
  subtitle?: string;
  active?: boolean;
}) {
  const { ctx } = requestInfo;

  if (!ctx.currentOrganization) {
    throw new Error("No organization context");
  }

  const market = await db.market.create({
    data: {
      organizationId: ctx.currentOrganization.id,
      name: data.name,
      schedule: data.schedule,
      subtitle: data.subtitle || null,
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
    subtitle?: string;
    active?: boolean;
  }
) {
  const { ctx } = requestInfo;

  if (!ctx.currentOrganization) {
    throw new Error("No organization context");
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

  const market = await db.market.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.schedule !== undefined && { schedule: data.schedule }),
      ...(data.subtitle !== undefined && { subtitle: data.subtitle || null }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });

  return market;
}

export async function deleteMarket(id: string) {
  const { ctx } = requestInfo;

  if (!ctx.currentOrganization) {
    throw new Error("No organization context");
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

  if (!ctx.currentOrganization) {
    throw new Error("No organization context");
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
