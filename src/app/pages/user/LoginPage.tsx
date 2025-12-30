import { RequestInfo } from "rwsdk/worker";
import { Login } from "./Login";

/**
 * LoginPage - Server component wrapper for the client Login component
 *
 * This follows RWSDK RSC pattern where:
 * - LoginPage is a server component (can receive RequestInfo props)
 * - Login is a client component (handles interactivity)
 */
export function LoginPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  // If already logged in, auto-redirect to home
  if (ctx.user) {
    const destination = ctx.currentOrganization ? '/admin' : '/';
    return new Response(null, {
      status: 302,
      headers: { Location: destination },
    });
  }

  return <Login ctx={requestInfo.ctx} />;
}