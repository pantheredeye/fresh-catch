-- Local dev seed. Run with `pnpm run seed` (wrangler d1 execute --local).
-- No prod data — cutover migration is a later bead (see schema.prisma header).

DELETE FROM Vendor;

INSERT INTO Vendor (id, name, platformFeeBps, stripeOnboardingComplete)
VALUES ('evan', 'Fresh Catch Seafood Markets', 500, 0);
