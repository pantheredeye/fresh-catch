import { defineApp, ErrorResponse } from "rwsdk/worker";
import { route, render, prefix, layout } from "rwsdk/router";
import { Document } from "@/app/Document";
import { Home } from "@/app/pages/Home";
import { CustomerHome } from "@/app/pages/home/CustomerHome";
import { DesignTest } from "@/app/pages/DesignTest";

import { setCommonHeaders } from "@/app/headers";
import { hasAdminAccess } from "@/utils/permissions";
import { userRoutes } from "@/app/pages/user/routes";
import { adminRoutes } from "@/app/pages/admin/routes";
import { orderRoutes } from "@/app/pages/orders/routes";
import { profileRoutes } from "@/app/pages/profile/routes";
import { darkModeTestRoutes } from "@/app/pages/dark-mode-test/routes";
import { CustomerLayout } from "@/layouts/CustomerLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { sessions, setupSessionStore } from "./session/store";
import { Session } from "./session/durableObject";
import { type User, type Prisma, db, setupDb } from "@/db";
import { env } from "cloudflare:workers";
import { handleStripeWebhook } from "@/api/stripe-webhook";
export { SessionDurableObject } from "./session/durableObject";

type UserWithMemberships = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        organization: true;
      };
    };
  };
}>;

export type AppContext = {
  session: Session | null;
  user: UserWithMemberships | null;
  currentOrganization: {
    id: string;
    name: string;
    type: string;
    role: string;
  } | null;
};

export default defineApp([
  // Stripe webhook — must run before session/auth middleware to preserve raw body
  async ({ request }) => {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/stripe/webhook") {
      return handleStripeWebhook(request);
    }
  },
  setCommonHeaders(),
  async ({ ctx, request, response }) => {
    await setupDb(env);
    setupSessionStore(env);

    try {
      ctx.session = await sessions.load(request);
    } catch (error) {
      if (error instanceof ErrorResponse && error.code === 401) {
        await sessions.remove(request, response.headers);
        response.headers.set("Location", "/login");

        return new Response(null, {
          status: 302,
          headers: response.headers,
        });
      }

      throw error;
    }

    if (ctx.session?.userId) {
      ctx.user = await db.user.findUnique({
        where: {
          id: ctx.session.userId,
        },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      // Check if user is soft deleted
      if (ctx.user?.deletedAt) {
        await sessions.remove(request, response.headers);
        response.headers.set("Location", "/");

        return new Response(null, {
          status: 302,
          headers: response.headers,
        });
      }

      // If session lacks organization context, set it from user's memberships
      if (ctx.user && ctx.user.memberships.length > 0 && !ctx.session.currentOrganizationId) {
        // Default to first membership (could be enhanced with user preference later)
        const defaultMembership = ctx.user.memberships[0];

        // Update the session with organization context
        await sessions.save(response.headers, {
          userId: ctx.session.userId,
          currentOrganizationId: defaultMembership.organizationId,
          role: defaultMembership.role,
        });

        // Update the session object in context
        ctx.session.currentOrganizationId = defaultMembership.organizationId;
        ctx.session.role = defaultMembership.role;
      }

      // Re-validate session role from DB on each request
      if (ctx.session.currentOrganizationId && ctx.user) {
        const currentMembership = ctx.user.memberships.find(
          (m) => m.organizationId === ctx.session!.currentOrganizationId
        );

        if (currentMembership) {
          ctx.currentOrganization = {
            id: currentMembership.organization.id,
            name: currentMembership.organization.name,
            type: currentMembership.organization.type,
            role: currentMembership.role,  // Always use DB role, not session
          };

          // Sync session role if it drifted from DB
          if (ctx.session.role !== currentMembership.role) {
            await sessions.save(response.headers, {
              userId: ctx.session.userId,
              currentOrganizationId: ctx.session.currentOrganizationId,
              role: currentMembership.role,
            });
            ctx.session.role = currentMembership.role;
          }
        } else {
          // Membership revoked — clear org context and redirect
          await sessions.save(response.headers, {
            userId: ctx.session.userId,
            currentOrganizationId: null,
            role: null,
          });
          response.headers.set("Location", "/");
          return new Response(null, { status: 302, headers: response.headers });
        }
      }
    }
  },
  render(Document, [
    // Auth routes with minimal layout
    ...layout(AuthLayout, userRoutes),  // /login, /logout

    // Customer routes with header + user menu
    ...layout(CustomerLayout, [
      // Root route shows customer home (Evan's markets for now)
      // TODO (Phase 2): Add smart logic for multi-tenant:
      //   - If ?b= param exists, show that business's markets
      //   - If only 1 business total, auto-show it
      //   - If multiple businesses, show directory
      route("/", CustomerHome),
      route("/design-test", DesignTest),
      ...darkModeTestRoutes,

      route("/protected", [
        ({ ctx }) => {
          if (!ctx.user) {
            return new Response(null, {
              status: 302,
              headers: { Location: "/login" },
            });
          }
        },
        Home,
      ]),
    ]),

    // Order routes with customer layout
    prefix("/orders", layout(CustomerLayout, orderRoutes)),

    // Profile routes with customer layout
    prefix("/profile", layout(CustomerLayout, profileRoutes)),

    // Admin routes with admin header + nav
    prefix("/admin", [
      ({ ctx, response }) => {
        if (!ctx.user) {
          response.headers.set("Location", "/login");
          return new Response(null, { status: 302, headers: response.headers });
        }
        if (!hasAdminAccess(ctx)) {
          return new Response("Forbidden", { status: 403 });
        }
      },
      ...layout(AdminLayout, adminRoutes),
    ]),
  ]),
]);
