"use server";

import { requestInfo } from "rwsdk/worker";
import { env } from "cloudflare:workers";

import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { getStripe } from "@/utils/stripe";

function getStripeClient() {
  const secretKey = (env as unknown as Record<string, string>).STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return getStripe(secretKey);
}

export async function createConnectedAccount(orgId: string) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false as const, error: "Admin access required" };
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return { success: false as const, error: "Organization not found" };
    }

    if (org.stripeAccountId) {
      return { success: false as const, error: "Stripe account already exists" };
    }

    const stripe = getStripeClient();
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { orgId },
    });

    await db.organization.update({
      where: { id: orgId },
      data: { stripeAccountId: account.id },
    });

    return { success: true as const, accountId: account.id };
  } catch (error) {
    console.error("Failed to create connected account:", error);
    return { success: false as const, error: "Failed to create Stripe account" };
  }
}

export async function getOnboardingLink(orgId: string) {
  const { ctx, request } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false as const, error: "Admin access required" };
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
    });

    if (!org?.stripeAccountId) {
      return { success: false as const, error: "No Stripe account found" };
    }

    const stripe = getStripeClient();
    const origin = new URL(request.url).origin;

    const accountLink = await stripe.accountLinks.create({
      account: org.stripeAccountId,
      refresh_url: `${origin}/admin/settings/stripe?onboarding=refresh`,
      return_url: `${origin}/admin/settings/stripe?onboarding=complete`,
      type: "account_onboarding",
    });

    return { success: true as const, url: accountLink.url };
  } catch (error) {
    console.error("Failed to create onboarding link:", error);
    return { success: false as const, error: "Failed to create onboarding link" };
  }
}

export async function checkOnboardingStatus(orgId: string) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false as const, error: "Admin access required" };
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
    });

    if (!org?.stripeAccountId) {
      return { success: false as const, error: "No Stripe account found" };
    }

    const stripe = getStripeClient();
    const account = await stripe.accounts.retrieve(org.stripeAccountId);

    const isComplete = account.charges_enabled && account.details_submitted;

    if (isComplete && !org.stripeOnboardingComplete) {
      await db.organization.update({
        where: { id: orgId },
        data: { stripeOnboardingComplete: true },
      });
    }

    return {
      success: true as const,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingComplete: isComplete,
    };
  } catch (error) {
    console.error("Failed to check onboarding status:", error);
    return { success: false as const, error: "Failed to check onboarding status" };
  }
}

const VALID_FEE_MODELS = ["customer", "vendor", "split"] as const;
type FeeModel = (typeof VALID_FEE_MODELS)[number];

export async function updateFeeConfig(
  orgId: string,
  feeBps: number,
  feeModel: string
) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false as const, error: "Admin access required" };
  }

  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 5000) {
    return {
      success: false as const,
      error: "feeBps must be an integer between 0 and 5000",
    };
  }

  if (!VALID_FEE_MODELS.includes(feeModel as FeeModel)) {
    return {
      success: false as const,
      error: "feeModel must be one of: customer, vendor, split",
    };
  }

  try {
    const org = await db.organization.update({
      where: { id: orgId },
      data: {
        platformFeeBps: feeBps,
        feeModel: feeModel,
      },
    });

    return { success: true as const, data: org };
  } catch (error) {
    console.error("Failed to update fee config:", error);
    return { success: false as const, error: "Failed to update fee config" };
  }
}

export async function updateDepositConfig(
  orgId: string,
  depositBps: number | null
) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false as const, error: "Admin access required" };
  }

  if (
    depositBps !== null &&
    (!Number.isInteger(depositBps) || depositBps < 0 || depositBps > 10000)
  ) {
    return {
      success: false as const,
      error: "depositBps must be null or an integer between 0 and 10000",
    };
  }

  try {
    const org = await db.organization.update({
      where: { id: orgId },
      data: {
        defaultDepositBps: depositBps,
      },
    });

    return { success: true as const, data: org };
  } catch (error) {
    console.error("Failed to update deposit config:", error);
    return {
      success: false as const,
      error: "Failed to update deposit config",
    };
  }
}
