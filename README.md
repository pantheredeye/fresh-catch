# Fresh Catch

Hono on Cloudflare Workers, D1, Vite.

## Develop

```shell
pnpm install
pnpm run dev
```

Point your browser to the URL printed in the terminal (e.g.
`http://localhost:5173/`).

## Test

```shell
pnpm test
```

## Deploy

```shell
pnpm run deploy
```

`wrangler.jsonc`'s worker name and D1 `database_id` are placeholders until
production cutover — see `CLAUDE.md`.

## Further reading

- `CLAUDE.md` — stack, conventions, git workflow
- `docs/audit/` — the audit and rebuild plan this app follows
- [Hono docs](https://hono.dev/)
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
