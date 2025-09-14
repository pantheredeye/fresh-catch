import { defineApp, ErrorResponse } from "rwsdk/worker";
import { route, render, prefix } from "rwsdk/router";
import { Document } from "@/app/Document";
import { Home } from "@/app/pages/Home";
import { CustomerHome } from "@/app/pages/CustomerHome";
import { DesignTest } from "@/app/pages/DesignTest";
import { setCommonHeaders } from "@/app/headers";
import { userRoutes } from "@/app/pages/user/routes";
import { adminRoutes } from "@/app/pages/admin/routes";
import { sessions, setupSessionStore } from "./session/store";
import { Session } from "./session/durableObject";
import { type User, type Prisma, db, setupDb } from "@/db";
import { env } from "cloudflare:workers";
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
  setCommonHeaders(),
  async ({ ctx, request, headers }) => {
    await setupDb(env);
    setupSessionStore(env);

    try {
      ctx.session = await sessions.load(request);
    } catch (error) {
      if (error instanceof ErrorResponse && error.code === 401) {
        await sessions.remove(request, headers);
        headers.set("Location", "/user/login");

        return new Response(null, {
          status: 302,
          headers,
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

      // If session lacks organization context, set it from user's memberships
      if (ctx.user && ctx.user.memberships.length > 0 && !ctx.session.currentOrganizationId) {
        // Default to first membership (could be enhanced with user preference later)
        const defaultMembership = ctx.user.memberships[0];

        // Update the session with organization context
        await sessions.save(headers, {
          userId: ctx.session.userId,
          currentOrganizationId: defaultMembership.organizationId,
          role: defaultMembership.role,
        });

        // Update the session object in context
        ctx.session.currentOrganizationId = defaultMembership.organizationId;
        ctx.session.role = defaultMembership.role;
      }

      // Populate currentOrganization in context if session has organization data
      if (ctx.session.currentOrganizationId && ctx.user) {
        const currentMembership = ctx.user.memberships.find(
          (m) => m.organizationId === ctx.session!.currentOrganizationId
        );

        if (currentMembership) {
          ctx.currentOrganization = {
            id: currentMembership.organization.id,
            name: currentMembership.organization.name,
            type: currentMembership.organization.type,
            role: currentMembership.role,
          };
        }
      }
    }
  },
  render(Document, [
    route("/", () => new Response("Hello, World!")),
    route("/customer", CustomerHome),
    route("/design-test", DesignTest),
    route("/protected", [
      ({ ctx }) => {
        if (!ctx.user) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/user/login" },
          });
        }
      },
      Home,
    ]),
    prefix("/user", userRoutes),
    prefix("/admin", adminRoutes),
  ]),
]);
