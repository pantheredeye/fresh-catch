"use client";

import { useState, useEffect } from "react";
import { Menu } from "@base-ui/react/menu";
import type { User } from "@/db";
import { listUserOrganizations } from "@/app/pages/user/org-functions";

type UserOrg = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

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
  const [userOrgs, setUserOrgs] = useState<UserOrg[]>([]);

  const isAdmin =
    currentOrganization?.type === 'business' &&
    currentOrganization?.role &&
    ['owner', 'manager'].includes(currentOrganization.role);

  useEffect(() => {
    if (!user || !isAdmin) return;
    listUserOrganizations().then(setUserOrgs).catch(() => {});
  }, [user, isAdmin]);

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
                {userOrgs.length >= 2 && (
                  <>
                    <Menu.Separator className="user-menu-separator" />
                    <div className="org-switcher-label">Switch Business</div>
                    {userOrgs.map((org) => (
                      <Menu.Item
                        key={org.id}
                        className={`user-menu-item org-item${org.id === currentOrganization?.id ? " org-item-active" : ""}`}
                      >
                        <span className="org-name">{org.name}</span>
                        {org.id === currentOrganization?.id && (
                          <span className="org-check">✓</span>
                        )}
                      </Menu.Item>
                    ))}
                  </>
                )}
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
