import { RequestInfo } from "rwsdk/worker";
import { Setup } from "./Setup";

/**
 * SetupPage - Server component wrapper for admin setup
 *
 * Business owner registration flow - separate from customer registration
 * Allows Evan to register with WebAuthn and claim ownership of existing organization
 */
export function SetupPage(requestInfo: RequestInfo) {
  return <Setup ctx={requestInfo.ctx} csrfToken={requestInfo.ctx.session?.csrfToken ?? ""} />;
}