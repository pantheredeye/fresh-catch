import { defineApp, ErrorResponse } from "rwsdk/worker";
import { route, render, prefix, layout, type RouteMiddleware } from "rwsdk/router";
import { Document } from "@/app/Document";
import { Home } from "@/app/pages/Home";
import { CustomerHome } from "@/app/pages/home/CustomerHome";
import { VendorProfilePage } from "@/app/pages/home/VendorProfilePage";
import { DesignTest } from "@/app/pages/DesignTest";

import { setCommonHeaders } from "@/app/headers";
import { hasAdminAccess } from "@/utils/permissions";
import { userRoutes } from "@/app/pages/user/routes";
import { adminRoutes } from "@/app/pages/admin/routes";
import { orderRoutes } from "@/app/pages/orders/routes";
import { profileRoutes } from "@/app/pages/profile/routes";
import { marketRoutes } from "@/app/pages/markets/routes";
import { darkModeTestRoutes } from "@/app/pages/dark-mode-test/routes";
import { CustomerLayout } from "@/layouts/CustomerLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { sessions, setupSessionStore } from "./session/store";
import { Session } from "./session/durableObject";
import { type User, type Prisma, db, setupDb } from "@/db";
import { env } from "cloudflare:workers";
import { handleStripeWebhook } from "@/api/stripe-webhook";
import { validateApiKey } from "@/utils/api-keys";
import { getServerCard } from "@/api/mcp-server";
import { handleCatchRecord } from "@/api/catch-record";
import { handleVoiceCommand } from "@/api/voice-command";
import { resolveBrowsingOrg } from "@/app/middleware/tenant";
import { rateLimitAuth } from "@/rate-limit/middleware";
export { SessionDurableObject } from "./session/durableObject";
export { ChatDurableObject } from "./chat/durableObject";
export { RateLimitDurableObject } from "./rate-limit/durableObject";
export { McpDurableObject } from "./mcp/durableObject";
export { SignalDurableObject } from "./signal/durableObject";

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
    slug: string;
    type: string;
    role: string;
  } | null;
  browsingOrganization: {
    id: string;
    name: string;
    slug: string;
    accentColor: string | null;
  } | null;
};

/**
 * Origin validation middleware: rejects state-changing requests (POST/PUT/DELETE)
 * whose Origin header doesn't match our host. Defense-in-depth alongside SameSite cookies.
 */
function validateOrigin(): RouteMiddleware {
  return ({ request }) => {
    const method = request.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

    const origin = request.headers.get("Origin");
    // No Origin header — browser same-site navigation or non-browser client.
    // Safe to allow: SameSite=Strict cookies already block cross-site cookie attachment.
    if (!origin) return;

    const url = new URL(request.url);
    const expected = url.origin; // e.g. https://freshcatch.app
    if (origin === expected) return;

    return new Response("Forbidden – origin mismatch", { status: 403 });
  };
}

/**
 * Static HTML error page returned when an unhandled exception escapes the
 * RSC render pipeline. Avoids whitescreen by providing a meaningful 500 page.
 */
function errorHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fresh Catch — Error</title>
  <style>
    body { font-family: 'DM Sans', system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9f7f4; color: #1a2b3d; text-align: center; }
    .wrap { max-width: 400px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #6b7280; margin-bottom: 1.5rem; }
    a { display: inline-block; padding: 0.5rem 1.5rem; background: #0066cc; color: #fff; border-radius: 8px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Something went wrong</h1>
    <p>We hit an unexpected error. Please try again.</p>
    <a href="/">Go Home</a>
  </div>
</body>
</html>`;
}

const app = defineApp([
  // Stripe webhook — must run before session/auth AND origin middleware to preserve raw body
  // (Stripe sends POST from its own origin with signature verification)
  async ({ request }) => {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/stripe/webhook") {
      return handleStripeWebhook(request);
    }
  },
  // MCP server card — public discovery endpoint
  async ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/.well-known/mcp.json") {
      return new Response(JSON.stringify(getServerCard()), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=300",
        },
      });
    }
  },
  // MCP endpoint — before origin validation (external MCP clients send cross-origin requests)
  async ({ request }) => {
    const url = new URL(request.url);
    const mcpMatch = url.pathname.match(/^\/mcp\/([^/]+)(\/.*)?$/);
    if (!mcpMatch) return;

    await setupDb(env);
    setupSessionStore(env);

    const orgSlug = mcpMatch[1];
    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) {
      return new Response("Not Found", { status: 404 });
    }

    // Auth: API key or session cookie
    let authenticated = false;
    let authRole: string | undefined;

    const authHeader = request.headers.get("Authorization");

    // Path 1: API key — hash provided key and compare against org's stored hash
    if (authHeader?.startsWith("Bearer ")) {
      const providedKey = authHeader.slice(7);
      if (org.apiKeyHash && await validateApiKey(providedKey, org.apiKeyHash)) {
        authenticated = true;
        authRole = "owner";
      } else {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // Path 2: Session cookie — verify session org matches URL org
    if (!authenticated) {
      try {
        const session = await sessions.load(request);
        if (session?.userId && session?.currentOrganizationId === org.id) {
          authenticated = true;
        } else if (session?.userId && session?.currentOrganizationId !== org.id) {
          return new Response("Forbidden – org mismatch", { status: 403 });
        }
      } catch {
        // Session load failed — no valid auth
      }
    }

    if (!authenticated) {
      return new Response("Unauthorized", { status: 401 });
    }

    const doId = env.MCP_DURABLE_OBJECT.idFromName(org.id);
    const stub = env.MCP_DURABLE_OBJECT.get(doId);

    // Forward org/session context to the DO via headers
    const mcpRequest = new Request(request.url, {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.body,
    });
    mcpRequest.headers.set("X-Org-Id", org.id);
    mcpRequest.headers.set("X-Org-Name", org.name);
    if (authRole) {
      mcpRequest.headers.set("X-Role", authRole);
    }

    return stub.fetch(mcpRequest);
  },
  validateOrigin(),
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

    // Ensure a session exists for all visitors (needed for OTP storage).
    // The cookie is set on the response; subsequent requests will have it.
    if (!ctx.session) {
      await sessions.save(response.headers, {});
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
            orderBy: { updatedAt: "desc" },
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
        // Prefer business orgs over individual
        const defaultMembership =
          ctx.user.memberships.find(m => m.organization.type === 'business') ??
          ctx.user.memberships[0];

        // Update the session with organization context
        await sessions.save(response.headers, {
          userId: ctx.session.userId,
          currentOrganizationId: defaultMembership.organizationId,
          role: defaultMembership.role,
          csrfToken: ctx.session.csrfToken,
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
            slug: currentMembership.organization.slug,
            type: currentMembership.organization.type,
            role: currentMembership.role,  // Always use DB role, not session
          };

          // Sync session role if it drifted from DB
          if (ctx.session.role !== currentMembership.role) {
            await sessions.save(response.headers, {
              userId: ctx.session.userId,
              currentOrganizationId: ctx.session.currentOrganizationId,
              role: currentMembership.role,
              csrfToken: ctx.session.csrfToken,
            });
            ctx.session.role = currentMembership.role;
          }
        } else {
          // Membership revoked — clear org context and redirect
          await sessions.save(response.headers, {
            userId: ctx.session.userId,
            currentOrganizationId: null,
            role: null,
            csrfToken: ctx.session.csrfToken,
          });
          response.headers.set("Location", "/");
          return new Response(null, { status: 302, headers: response.headers });
        }
      }
    }
  },
  // API endpoints — after session/user middleware for auth context
  async ({ ctx, request }) => {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/catch/record") {
      return handleCatchRecord(request, ctx);
    }
    if (request.method === "POST" && url.pathname === "/api/voice/command") {
      return handleVoiceCommand(request, ctx);
    }
  },
  resolveBrowsingOrg(),
  // WebSocket upgrade handler for chat — before render() to avoid RSC processing
  async ({ ctx, request }) => {
    const url = new URL(request.url);
    const wsMatch = url.pathname.match(/^\/ws\/chat\/([^/]+)$/);
    if (!wsMatch) return; // Not a chat WebSocket path, continue to next middleware

    // Reject non-WebSocket requests to this path
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 400 });
    }

    const conversationId = wsMatch[1];

    // Verify conversation exists
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      return new Response("Conversation not found", { status: 404 });
    }

    // Authorization: admin can access any org conversation, customer only their own
    if (ctx.user && hasAdminAccess(ctx)) {
      // Admin: verify conversation belongs to their org
      if (conversation.organizationId !== ctx.currentOrganization?.id) {
        return new Response("Forbidden", { status: 403 });
      }
    } else if (ctx.user) {
      // Logged-in customer: must be the conversation's customer
      if (conversation.customerId !== ctx.user.id) {
        return new Response("Forbidden", { status: 403 });
      }
    } else if (conversation.customerId === null) {
      // Anonymous conversation: conversation ID is the bearer token
    } else {
      // Anonymous user trying to access an authenticated conversation
      return new Response("Unauthorized", { status: 401 });
    }

    // Forward to ChatDurableObject with role tag
    const role = ctx.user && hasAdminAccess(ctx) ? "vendor" : "customer";
    const doId = env.CHAT_DURABLE_OBJECT.idFromName(conversationId);
    const stub = env.CHAT_DURABLE_OBJECT.get(doId);
    const doUrl = new URL(request.url);
    doUrl.searchParams.set("role", role);
    const doRequest = new Request(doUrl.toString(), request);
    return stub.fetch(doRequest);
  },
  render(Document, [
    // Auth routes with rate limiting + minimal layout
    rateLimitAuth(),
    ...layout(AuthLayout, userRoutes),  // /login, /logout

    // Customer routes with header + user menu
    ...layout(CustomerLayout, [
      // Root route shows customer home (Evan's markets for now)
      // TODO (Phase 2): Add smart logic for multi-tenant:
      //   - If ?b= param exists, show that business's markets
      //   - If only 1 business total, auto-show it
      //   - If multiple businesses, show directory
      route("/", CustomerHome),
      route("/v/:slug", VendorProfilePage),
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

    // Market routes with customer layout (public)
    prefix("/markets", layout(CustomerLayout, marketRoutes)),

    // Admin routes with admin header + nav
    prefix("/admin", [
      ({ ctx, request, response }) => {
        // Allow RSC server actions through — they handle their own auth
        const url = new URL(request.url);
        if (url.searchParams.has("__rsc_action_id")) return;

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

    // Catch-all 404 for unmatched routes (bot scanners, typos, etc.)
    route("*", () => new Response("Not Found", { status: 404 })),
  ]),
]);

// Wrap the RWSDK app to catch unhandled errors that escape the RSC pipeline.
// Without this, Cloudflare Workers returns a raw 500 with null body → whitescreen.
export default {
  async fetch(request: Request, ...args: unknown[]) {
    try {
      return await (app as { fetch: (...a: unknown[]) => Promise<Response> }).fetch(request, ...args);
    } catch (error) {
      console.error("Unhandled worker error:", error);
      return new Response(errorHtml(), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  },
};
