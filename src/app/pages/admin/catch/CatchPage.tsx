import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { CatchUI } from "./CatchUI";
import { NotAuthenticated, AccessDenied, NoOrganization } from "../components";

export async function CatchPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

  const currentCatch = await db.catchUpdate.findFirst({
    where: {
      organizationId: ctx.currentOrganization.id,
      status: "live",
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize for client component
  const catchData = currentCatch
    ? {
        id: currentCatch.id,
        formattedContent: currentCatch.formattedContent,
        rawTranscript: currentCatch.rawTranscript,
        status: currentCatch.status,
        createdAt: currentCatch.createdAt.toISOString(),
      }
    : null;

  return <CatchUI currentCatch={catchData} csrfToken={ctx.session!.csrfToken} />;
}
