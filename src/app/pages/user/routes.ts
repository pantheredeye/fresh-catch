import { route } from "rwsdk/router";
import { LoginPage } from "./LoginPage";
import { AcceptInvitePage } from "./AcceptInvitePage";
import { sessions, resilientDO } from "@/session/store";

export const userRoutes = [
  route("/login", LoginPage),
  route("/join/invite", AcceptInvitePage),
  route("/logout", async function ({ request }) {
    // Under SameSite=Lax, a cross-site top-level GET carries the session cookie — this is
    // the app's one state-changing GET, so it's newly reachable from an external page.
    // Sec-Fetch-Site is absent on old browsers (fails open to prior behavior, can't break
    // logout); when present and not same-origin/none, bounce without touching the session.
    const secFetchSite = request.headers.get("Sec-Fetch-Site");
    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }

    const headers = new Headers();
    await resilientDO(() => sessions.remove(request, headers), "logout.remove");
    headers.set("Location", "/");

    return new Response(null, {
      status: 302,
      headers,
    });
  }),
];
