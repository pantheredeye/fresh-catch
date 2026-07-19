---
description: Medium-effort review of a GitHub PR before merge (sonnet agent)
argument-hint: <pr-number>
---

Review GitHub PR #$ARGUMENTS before merge. Spawn a **sonnet** agent (Agent tool, model: sonnet) to do the review; you stay as orchestrator and only relay/act on results.

Agent instructions (pass verbatim, filling in the PR number):

- Run `gh pr view $ARGUMENTS` and `gh pr diff $ARGUMENTS`. Read surrounding files on disk for context when the diff references them (checkout of the branch not required if the diff suffices).
- Verify the PR description's claims — don't trust them. State explicitly which claims you VERIFIED vs couldn't check.
- Medium effort: prefer fewer, high-confidence findings over broad speculation.
- Focus, ranked:
  1. Security / auth / gating correctness — WebAuthn/OTP/invite/claim flows, session handling, tenant (org) scoping. Every query touching org data must filter by the current org; guest-order visibility must not leak across tenants.
  2. Data & SQL correctness incl. edge cases (empty results, div-by-zero, off-by-one, null handling). Prisma/D1: check `where` clauses actually scope by org, `findUnique` vs `findFirst`, and result-shape assumptions.
  3. Project conventions per CLAUDE.md:
     - RSC vs client components: server components fetch data (async/await, no "use client"); mutations are server functions ("use server") that call `revalidatePath()`; interactivity is "use client". No JSON APIs for internal UI.
     - Design system: semantic tokens only (`var(--color-*)`, `var(--space-*)`) — never old flat tokens (`--deep-navy` etc.), never hardcoded hex or raw `rgba()`.
     - Component placement: primitives in `/src/design-system/`, feature compositions in the page's `/components/` folder; no cross-page component imports.
     - pnpm; feature-branch workflow (never commit to main).
  4. Migrations / destructive changes — D1 migrations under `migrations/`, Prisma schema changes. Additive vs destructive; ordering vs deploy.
  5. Tests — do they assert real behavior or a copy of it? Coverage gaps.
  6. Types / dead code / nits.
- Verify every finding by reading actual code — no speculation.
- Return raw data, not prose: ranked findings (file:line, severity critical/major/minor/nit, one-sentence defect, concrete failure scenario, proposed fix) + verified-claims list. Review only — no fixes.

Then: relay findings concisely, propose a fix plan, apply fixes only on user approval.
