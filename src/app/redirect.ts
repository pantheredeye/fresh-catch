import { RequestInfo } from "rwsdk/worker";

/**
 * Redirect that is safe during RSC server actions. A plain `new Response(null, { status: 302 })`
 * crashes the RSC client (`body.getReader()` on null): the client fetches actions with
 * `redirect: "manual"`, so a same-origin 3xx comes back as an opaque response (status 0, null
 * body) that the client can't parse. For actions we throw instead, letting the client-side catch
 * block handle it; for document GETs we return a real 302.
 *
 * For middleware / route handlers. Page components should use `pageRedirect` instead.
 */
export function safeRedirect(requestInfo: RequestInfo, location: string, headers?: Headers): Response {
  if (requestInfo.isAction) {
    throw new Error(`Session expired, redirect to ${location}`);
  }
  const h = headers ?? new Headers();
  h.set("Location", location);
  return new Response(null, { status: 302, headers: h });
}

/**
 * Redirect for page components. Returns a real 302 on document GETs. During an action, a
 * page-component 302 gets thrown by rwsdk and becomes the action's raw HTTP response — same
 * opaque-response crash as above, minus the option to throw (a thrown Error renders the 500
 * error page, which the RSC client also can't parse). So during an action this returns
 * `undefined` instead (rwsdk's route-component type allows `Response | JSX.Element | void`, not
 * `null`): an empty render. The client already navigates via `window.location` on the action's
 * own result, so the page-level redirect is only needed for the direct-GET case.
 *
 * An empty render momentarily blanks the page — only use where the call site is immediately
 * followed by a client-side hard navigation.
 */
export function pageRedirect(requestInfo: RequestInfo, location: string): Response | undefined {
  if (requestInfo.isAction) {
    return undefined;
  }
  return new Response(null, { status: 302, headers: { Location: location } });
}
