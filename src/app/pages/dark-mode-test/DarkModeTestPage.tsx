import type { AppContext } from "@/worker";
import { DarkModeTestUI } from "./DarkModeTestUI";

/**
 * Dark Mode Test Page - Compare different dark mode styling approaches
 *
 * WHY: Visual comparison of 4 design directions for market cards in dark mode
 */
export async function DarkModeTestPage({ ctx }: { ctx: AppContext }) {
  // Mock market data for testing
  const mockMarket = {
    id: "test-market",
    name: "Saturday Farmers Market",
    schedule: "Every Saturday 8am-2pm",
    subtitle: "Downtown Waterfront Location",
    active: true
  };

  return <DarkModeTestUI market={mockMarket} ctx={ctx} />;
}
