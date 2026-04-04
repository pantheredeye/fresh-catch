"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { sessions } from "@/session/store";
import { requireCsrf } from "@/session/csrf";

interface UpdateProfileData {
  name: string | null;
  phone: string | null;
  deliveryStreet: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryZip: string | null;
  deliveryNotes: string | null;
}

function validateProfile(data: UpdateProfileData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.name && data.name.length > 100) {
    errors.push("Name too long (max 100 characters)");
  }

  if (data.phone && data.phone.length > 20) {
    errors.push("Phone too long (max 20 characters)");
  }

  if (data.deliveryStreet && data.deliveryStreet.length > 200) {
    errors.push("Street address too long (max 200 characters)");
  }

  if (data.deliveryCity && data.deliveryCity.length > 100) {
    errors.push("City too long (max 100 characters)");
  }

  if (data.deliveryState && data.deliveryState.length > 50) {
    errors.push("State too long (max 50 characters)");
  }

  if (data.deliveryZip && data.deliveryZip.length > 20) {
    errors.push("ZIP code too long (max 20 characters)");
  }

  if (data.deliveryNotes && data.deliveryNotes.length > 500) {
    errors.push("Delivery notes too long (max 500 characters)");
  }

  return { valid: errors.length === 0, errors };
}

export async function updateProfile(csrfToken: string, data: UpdateProfileData) {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!ctx.user) {
    return { success: false, error: "Not logged in" };
  }

  const validation = validateProfile(data);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(", ") };
  }

  try {
    await db.user.update({
      where: { id: ctx.user.id },
      data: {
        name: data.name || null,
        phone: data.phone || null,
        deliveryStreet: data.deliveryStreet || null,
        deliveryCity: data.deliveryCity || null,
        deliveryState: data.deliveryState || null,
        deliveryZip: data.deliveryZip || null,
        deliveryNotes: data.deliveryNotes || null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function deleteAccount(csrfToken: string) {
  requireCsrf(csrfToken);

  const { ctx, request, response } = requestInfo;

  if (!ctx.user) {
    return { success: false, error: "Not logged in" };
  }

  try {
    // Soft delete: set deletedAt timestamp
    await db.user.update({
      where: { id: ctx.user.id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Clear session and redirect
    await sessions.remove(request, response.headers);
    response.headers.set("Location", "/");

    return new Response(null, {
      status: 302,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { success: false, error: "Failed to delete account" };
  }
}
