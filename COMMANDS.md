# Clear local DB and start Fresh


  Option 1: Fresh Start (Recommended)

  1. Stop the dev server:
  # Press Ctrl+C in the terminal running `pnpm run dev`

  2. Delete the local database:
  rm .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite

  3. Re-run migrations to recreate the schema:
  pnpm run migrate:dev

  4. Restart the dev server:
  pnpm run dev
