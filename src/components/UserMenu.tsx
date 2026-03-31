"use client";

import { Menu } from "@base-ui/react/menu";
import type { User } from "@/db";

export function UserMenu({
  user,
  currentOrganization,
  browsingOrganization
}: {
  user: User | null;
  currentOrganization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    role: string;
  } | null;
  browsingOrganization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}) {
  // Not logged in - show sign in button
  if (!user) {
    const loginHref = browsingOrganization?.slug
      ? `/login?b=${browsingOrganization.slug}`
      : "/login";
    return (
      <a href={loginHref} className="sign-in-button">
        Sign In
      </a>
    );
  }

  // Admin = owner/manager of a BUSINESS org (not individual customer org)
  const isAdmin =
    currentOrganization?.type === 'business' &&
    currentOrganization?.role &&
    ['owner', 'manager'].includes(currentOrganization.role);

  return (
    <Menu.Root>
      <Menu.Trigger className="user-menu-trigger">
        <span className="user-email">{user.username}</span>
        <span className="chevron">▾</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="user-menu-positioner">
          <Menu.Popup className="user-menu-popup glass-card">
            <Menu.Item
              className="user-menu-item"
              render={<a href="/profile" />}
            >
              Profile
            </Menu.Item>
            <Menu.Item
              className="user-menu-item"
              render={<a href="/orders" />}
            >
              Orders
            </Menu.Item>

            {isAdmin && (
              <>
                <Menu.Separator className="user-menu-separator" />
                <Menu.Item
                  className="user-menu-item admin-item"
                  render={<a href="/admin" />}
                >
                  <span className="admin-icon">🔑</span> Admin
                </Menu.Item>
              </>
            )}

            <Menu.Separator className="user-menu-separator" />
            <Menu.Item
              className="user-menu-item logout-item"
              render={<a href="/logout" />}
            >
              Logout
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
