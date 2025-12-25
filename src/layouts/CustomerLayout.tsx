import type { LayoutProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import { UserMenu } from "@/components/UserMenu";
import "./CustomerLayout.css";
import "@/components/UserMenu.css";

export function CustomerLayout({
  children,
  requestInfo,
}: LayoutProps<RequestInfo>) {
  const ctx = requestInfo?.ctx;

  return (
    <div className="customer-layout">
      <header className="customer-header">
        <div className="header-content">
          <a href="/" className="business-name">
            <span className="business-name-text">Evan's Fresh Catch</span>
          </a>

          <div className="header-actions">
            <UserMenu
              user={ctx?.user ?? null}
              currentOrganization={ctx?.currentOrganization ?? null}
            />
          </div>
        </div>
      </header>

      <main className="customer-main">{children}</main>
    </div>
  );
}
