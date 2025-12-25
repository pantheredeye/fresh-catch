import type { LayoutProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import { AuthLayoutClient } from "./AuthLayoutClient";

export function AuthLayout({
  children,
  requestInfo,
}: LayoutProps<RequestInfo>) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
