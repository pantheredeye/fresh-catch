import { route } from "rwsdk/router";
import { AdminDashboard } from "./AdminDashboard";
import { MarketConfigPage } from "./MarketConfigPage";
import { AdminOrdersPage } from "./AdminOrdersPage";
import { PrintOrdersPage } from "./PrintOrdersPage";
import { StripeSettingsPage } from "./StripeSettingsPage";
import { TeamPage } from "./team/TeamPage";
import { CatchPage } from "./catch/CatchPage";
import { MessagesPage } from "./messages/MessagesPage";
import { BrandingSettingsPage } from "./BrandingSettingsPage";
import { ApiSettingsPage } from "./ApiSettingsPage";
import { NotificationSettingsPage } from "./NotificationSettingsPage";
import { GapsPage } from "./gaps/GapsPage";
import { InsightsPage } from "./insights/InsightsPage";

export const adminRoutes = [
  route("/", AdminDashboard),        // /admin landing page
  route("/config", MarketConfigPage), // /admin/config
  route("/orders", AdminOrdersPage),  // /admin/orders
  route("/orders/print", PrintOrdersPage), // /admin/orders/print
  route("/settings/stripe", StripeSettingsPage), // /admin/settings/stripe
  route("/settings/branding", BrandingSettingsPage), // /admin/settings/branding
  route("/settings/api", ApiSettingsPage),             // /admin/settings/api
  route("/settings/notifications", NotificationSettingsPage), // /admin/settings/notifications
  route("/team", TeamPage),           // /admin/team
  route("/catch", CatchPage),         // /admin/catch
  route("/messages", MessagesPage),    // /admin/messages
  route("/gaps", GapsPage),            // /admin/gaps
  route("/insights", InsightsPage),    // /admin/insights
];