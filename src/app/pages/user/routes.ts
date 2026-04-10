import { route } from "rwsdk/router";
import { LoginPage } from "./LoginPage";
import { AcceptInvitePage } from "./AcceptInvitePage";
import { sessions, resilientDO } from "@/session/store";

export const userRoutes = [
  route("/login", LoginPage),
  route("/join/invite", AcceptInvitePage),
  route("/logout", async function ({ request }) {
    const headers = new Headers();
    await resilientDO(() => sessions.remove(request, headers), "logout.remove");
    headers.set("Location", "/");

    return new Response(null, {
      status: 302,
      headers,
    });
  }),
];
