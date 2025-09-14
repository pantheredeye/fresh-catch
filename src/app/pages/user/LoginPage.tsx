import { RequestInfo } from "rwsdk/worker";
import { Login } from "./Login";

/**
 * LoginPage - Server component wrapper for the client Login component
 *
 * This follows RWSDK RSC pattern where:
 * - LoginPage is a server component (can receive RequestInfo props)
 * - Login is a client component (handles interactivity)
 */
export function LoginPage({ ctx }: RequestInfo) {
  return <Login ctx={ctx} />;
}