import { route } from "rwsdk/router";
import { ProfilePage } from "./ProfilePage";

export const profileRoutes = [
  route("/", ProfilePage),
];
