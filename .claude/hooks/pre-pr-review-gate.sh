#!/usr/bin/env bash
# PreToolUse gate: require a medium-effort branch review before `gh pr create`.
# Pass condition: the .pr-review-ok marker (resolved via `git rev-parse --git-path`, so it
# lands in the per-worktree gitdir) contains the current HEAD sha (written after a review).
# Marker is consumed on success so each new PR needs a fresh review.
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
case "$cmd" in
  *"gh pr create"*) ;;
  *) exit 0 ;;
esac

# Resolve marker via git so it works in worktrees (where .git is a file, not a dir)
marker=$(git rev-parse --git-path .pr-review-ok 2>/dev/null)
[ -n "$marker" ] || marker=".git/.pr-review-ok"
head=$(git rev-parse HEAD 2>/dev/null)
if [ -n "$head" ] && [ -f "$marker" ] && [ "$(cat "$marker" 2>/dev/null)" = "$head" ]; then
  rm -f "$marker"
  exit 0
fi

cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Pre-PR review gate: run a medium-effort review of this branch first (invoke the code-review skill at medium effort, or review git diff main...HEAD yourself: verify findings in actual code, fix confirmed critical/major issues, run pnpm test). When the review is done and the branch is final, mark it reviewed with: git rev-parse HEAD > \"$(git rev-parse --git-path .pr-review-ok)\"  — then retry gh pr create. Note: any new commit invalidates the marker."}}
EOF
exit 0
