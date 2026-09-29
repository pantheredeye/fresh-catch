import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { deleteCookie, setCookie } from "hono/cookie";
import type { Bindings, Variables } from "@/types";
import type { Vendor } from "@/lib/db";
import { Document } from "@/ui/document";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Card } from "@/ui/card";
import { Page } from "@/ui/page";
import { BrandBar } from "@/ui/brand-bar";
import { db } from "@/lib/db";
import { getVendor } from "@/features/vendor/queries";
import { requireSecret } from "@/lib/env";
import { createLoginCode, normalizeEmail, verifyLoginCode } from "./login-codes";
import { claimRequestsForUser } from "@/features/requests/queries";
import { checkRateLimit } from "./rate-limit";
import { sendLoginCodeEmail } from "./email";
import { createSessionValue, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./session";
import { generateCsrfToken, requireCsrf } from "./csrf";

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") ?? "unknown";
}

function isAllowlistedAdmin(env: Bindings, email: string): boolean {
  return env.ADMIN_EMAILS.split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean)
    .includes(normalizeEmail(email));
}

const EmailForm: FC<{ vendor: Vendor | null; errorText?: string }> = ({ vendor, errorText }) => (
  <Document title="Log in — Fresh Catch">
    <BrandBar vendor={vendor} />
    <Page>
      <Card>
        <h1>Log in</h1>
        <form method="post" action="/login">
          <Input
            id="email"
            name="email"
            label="Email"
            type="email"
            required
            errorText={errorText}
          />
          <Button type="submit">Send login code</Button>
        </form>
      </Card>
    </Page>
  </Document>
);

const CodeForm: FC<{ vendor: Vendor | null; email: string; devCode?: string; errorText?: string }> = ({
  vendor,
  email,
  devCode,
  errorText,
}) => (
  <Document title="Enter your code — Fresh Catch">
    <BrandBar vendor={vendor} />
    <Page>
      <Card>
        <h1>Enter your code</h1>
        <p>We sent a 6-digit code to {email}.</p>
        {devCode ? (
          <p>
            <strong>Dev mode — no email sent. Code: {devCode}</strong>
          </p>
        ) : null}
        <form method="post" action="/login/verify">
          <input type="hidden" name="email" value={email} />
          <Input id="code" name="code" label="Code" required errorText={errorText} />
          <Button type="submit">Verify</Button>
        </form>
      </Card>
    </Page>
  </Document>
);

authRoutes.get("/login", async (c) => {
  if (c.var.session) return c.redirect("/");
  const vendor = await getVendor();
  return c.html(<EmailForm vendor={vendor} />);
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const vendor = await getVendor();

  if (!email || !email.includes("@")) {
    return c.html(<EmailForm vendor={vendor} errorText="Enter a valid email." />, 400);
  }

  const rl = await checkRateLimit(clientIp(c.req.raw), "otpSend", email);
  if (!rl.allowed) {
    return c.html(<EmailForm vendor={vendor} errorText="Too many attempts. Try again later." />, 429);
  }

  const code = await createLoginCode(email);
  const sent = await sendLoginCodeEmail(c.env, email, code);
  const devCode = !sent && import.meta.env.DEV ? code : undefined;

  return c.html(<CodeForm vendor={vendor} email={email} devCode={devCode} />);
});

authRoutes.post("/login/verify", async (c) => {
  const body = await c.req.parseBody();
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const vendor = await getVendor();

  if (!email) {
    return c.html(<EmailForm vendor={vendor} errorText="Enter a valid email." />, 400);
  }

  const rl = await checkRateLimit(clientIp(c.req.raw), "otpVerify", email);
  if (!rl.allowed) {
    return c.html(<CodeForm vendor={vendor} email={email} errorText="Too many attempts. Try again later." />, 429);
  }

  const result = await verifyLoginCode(email, code);
  if (!result.valid) {
    const message = result.locked
      ? "Too many wrong attempts. Request a new code."
      : result.expired
        ? "That code expired. Request a new one."
        : "Incorrect code.";
    return c.html(<CodeForm vendor={vendor} email={email} errorText={message} />, 400);
  }

  const isAdmin = isAllowlistedAdmin(c.env, email);
  const user = await db.user.upsert({
    where: { email },
    create: { email, isAdmin },
    update: { isAdmin },
  });

  // R3: carries the device's anonymous requests over to the account being logged into.
  await claimRequestsForUser(c.var.deviceToken, user.id);

  const secret = requireSecret(c.env, "SESSION_SECRET");
  const sessionValue = await createSessionValue(
    { userId: user.id, email, isAdmin, csrfToken: generateCsrfToken() },
    secret,
  );

  setCookie(c, SESSION_COOKIE_NAME, sessionValue, {
    path: "/",
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: "Lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return c.redirect("/");
});

authRoutes.post("/logout", async (c) => {
  const session = c.var.session;
  if (session) {
    const body = await c.req.parseBody();
    const submitted = typeof body.csrfToken === "string" ? body.csrfToken : undefined;
    if (!requireCsrf(session.csrfToken, submitted)) {
      return c.text("Your session expired. Please refresh the page and try again.", 403);
    }
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.redirect("/");
});
