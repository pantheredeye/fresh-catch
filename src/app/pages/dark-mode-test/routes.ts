import { route } from "rwsdk/router";
import { DarkModeTestPage } from "./DarkModeTestPage";

export const darkModeTestRoutes = [
  route("/dark-mode-test", DarkModeTestPage),
];
