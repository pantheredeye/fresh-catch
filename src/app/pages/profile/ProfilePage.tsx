import { RequestInfo } from "rwsdk/worker";
import { Login } from "../user/Login";
import { ProfileUI } from "./ProfileUI";
import { db } from "@/db";

export async function ProfilePage({ ctx }: RequestInfo) {
  if (!ctx.user) {
    return <Login ctx={ctx} />;
  }

  // Fetch fresh user data
  const user = await db.user.findUnique({
    where: { id: ctx.user.id },
    include: {
      credentials: true,
    }
  });

  if (!user || user.deletedAt) {
    return (
      <div style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
        <p>Account not found or has been deleted.</p>
      </div>
    );
  }

  return <ProfileUI csrfToken={ctx.session!.csrfToken} user={user} />;
}
