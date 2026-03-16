import { route } from "rwsdk/router";
import { AdminDashboard } from "./AdminDashboard";
import { SetupPage } from "./SetupPage";
import { MarketConfigPage } from "./MarketConfigPage";
import { AdminOrdersPage } from "./AdminOrdersPage";
import { PrintOrdersPage } from "./PrintOrdersPage";
import { StripeSettingsPage } from "./StripeSettingsPage";

export const adminRoutes = [
  route("/", AdminDashboard),        // /admin landing page
  route("/setup", SetupPage),        // /admin/setup
  route("/config", MarketConfigPage), // /admin/config
  route("/orders", AdminOrdersPage),  // /admin/orders
  route("/orders/print", PrintOrdersPage), // /admin/orders/print
  route("/settings/stripe", StripeSettingsPage), // /admin/settings/stripe
];