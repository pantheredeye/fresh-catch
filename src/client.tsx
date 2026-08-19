import { initClient } from "rwsdk/client";

initClient({
  handleResponse(response) {
    // Safety net: redirect:"manual" turns a same-origin 3xx during an action or navigation
    // fetch into an opaque response (status 0, null body), which createFromFetch can't parse
    // (getReader crash). A page component should no longer return a bare 302 during an action
    // (see src/app/redirect.ts), but this catches any we missed instead of hanging forever.
    if (response.type === "opaqueredirect" || response.status === 0) {
      window.location.reload();
      return false;
    }
    const location = response.headers.get("Location");
    if (response.status >= 300 && response.status < 400 && location) {
      window.location.href = location;
      return false;
    }
    return true;
  },
});
