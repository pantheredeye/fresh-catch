import { route } from "rwsdk/router";
import { SetupPage } from "./SetupPage";
import { MarketConfigPage } from "./MarketConfigPage";

export const adminRoutes = [
  route("/setup", SetupPage),
  route("/config", MarketConfigPage),
];