import { RouteMiddleware } from "rwsdk/router";
import { db } from "@/db";

export const resolveBrowsingOrg =
  (): RouteMiddleware =>
  async ({ ctx, request }) => {
    const url = new URL(request.url);

    // Priority: route path /v/:slug > query param ?b=
    const pathMatch = url.pathname.match(/^\/v\/([^/]+)/);
    const slug = pathMatch?.[1] ?? url.searchParams.get("b");

    if (!slug) {
      return;
    }

    const org = await db.organization.findFirst({
      where: { slug, type: "business" },
      select: { id: true, name: true, slug: true, accentColor: true },
    });

    if (org) {
      ctx.browsingOrganization = org;
    }
  };
