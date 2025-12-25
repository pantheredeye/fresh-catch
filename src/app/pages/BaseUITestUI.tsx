"use client";

import { Menu } from "@base-ui/react/menu";
import "./BaseUITest.css";

export function BaseUITestUI() {
  return (
    <div style={{ padding: "50px", background: "#1a1a2e" }}>
      <h1 style={{ color: "white", marginBottom: "20px" }}>Base UI Test</h1>

      <div style={{ marginBottom: "40px" }}>
        <h2 style={{ color: "white", fontSize: "18px", marginBottom: "10px" }}>
          Simple Menu Test
        </h2>
        <Menu.Root>
          <Menu.Trigger className="test-trigger">
            Click Me ▾
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup className="test-popup">
                <Menu.Item className="test-item" render={<a href="/test1" />}>
                  Test Item 1
                </Menu.Item>
                <Menu.Item className="test-item" render={<a href="/test2" />}>
                  Test Item 2
                </Menu.Item>
                <Menu.Separator className="test-separator" />
                <Menu.Item className="test-item" render={<a href="/test3" />}>
                  Test Item 3
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      <div style={{ marginTop: "40px", color: "#888", fontSize: "14px" }}>
        <p>If menu doesn't show styled, Base UI isn't working with RWSDK</p>
        <p>Check browser console for errors</p>
      </div>
    </div>
  );
}
