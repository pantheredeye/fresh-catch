import type { LayoutProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import { CustomerLayoutClient } from "./CustomerLayoutClient";

export function CustomerLayout({
  children,
  requestInfo,
}: LayoutProps<RequestInfo>) {
  const ctx = requestInfo?.ctx;

  return (
    <CustomerLayoutClient
      user={ctx?.user ?? null}
      currentOrganization={ctx?.currentOrganization ?? null}
      browsingOrganization={ctx?.browsingOrganization ?? null}
      csrfToken={ctx?.session?.csrfToken ?? ""}
    >
      {children}
    </CustomerLayoutClient>
  );
}
