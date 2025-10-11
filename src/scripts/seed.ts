import { defineScript } from "rwsdk/worker";
import { db, setupDb } from "@/db";

export default defineScript(async ({ env }) => {
  await setupDb(env);

  // Clear all tables in dependency order
  await db.$executeRawUnsafe(`\
    DELETE FROM Membership;
    DELETE FROM Organization;
    DELETE FROM Credential;
    DELETE FROM User;
    DELETE FROM sqlite_sequence;
  `);

  // Create Evan's user account
  const evanUser = await db.user.create({
    data: {
      username: "evan",
    },
  });

  // Create Evan's business organization
  const evanOrg = await db.organization.create({
    data: {
      name: "Fresh Catch Seafood Markets",
      slug: "evan",
      type: "business",
    },
  });

  // Make Evan the owner of his organization
  await db.membership.create({
    data: {
      userId: evanUser.id,
      organizationId: evanOrg.id,
      role: "owner",
    },
  });

  console.log("🌱 Finished seeding");
  console.log(`📧 Created user: ${evanUser.username} (${evanUser.id})`);
  console.log(`🏢 Created organization: ${evanOrg.name} (${evanOrg.id})`);
  console.log(`👑 Evan is owner of ${evanOrg.name}`);
});
