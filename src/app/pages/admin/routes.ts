import { route } from "rwsdk/router";
import { SetupPage } from "./SetupPage";

export const adminRoutes = [
  route("/admin/setup", SetupPage),
];