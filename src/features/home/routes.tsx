import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { Document } from "../../ui/document";

export const homeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

homeRoutes.get("/", (c) => {
  const session = c.var.session;
  return c.html(
    <Document>
      <main>
        <h1>Fresh Catch</h1>
        <p>v2 foundation is up.</p>
        {session ? (
          <p>
            Signed in as {session.email}
            {session.isAdmin ? " (admin)" : ""}.{" "}
            <form method="post" action="/logout" style="display: inline">
              <input type="hidden" name="csrfToken" value={session.csrfToken} />
              <button type="submit">Log out</button>
            </form>
            {session.isAdmin ? (
              <>
                {" "}
                <a href="/admin">Admin</a>
              </>
            ) : null}
          </p>
        ) : (
          <p>
            <a href="/login">Log in</a>
          </p>
        )}
      </main>
    </Document>,
  );
});
