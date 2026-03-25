import { route } from "rwsdk/router";
import { LoginPage } from "./LoginPage";
import { JoinPage } from "./JoinPage";
import { AcceptInvitePage } from "./AcceptInvitePage";
import { sessions } from "@/session/store";

export const userRoutes = [
  route("/login", LoginPage),
  route("/join/invite", AcceptInvitePage),
  route("/join", JoinPage),
  route("/logout", async function ({ request }) {
    const headers = new Headers();
    await sessions.remove(request, headers);
    headers.set("Location", "/");

    return new Response(null, {
      status: 302,
      headers,
    });
  }),
];
