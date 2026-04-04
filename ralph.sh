#!/usr/bin/env bash
set -e

# Choo Choo Ralph - Autonomous coding loop
# Usage: ./ralph.sh [max_iterations] [--verbose|-v] [-p PRIORITY]
#
# Examples:
#   ./ralph.sh -p 0          # Run only P0 (critical) tasks
#   ./ralph.sh -p 1          # Run only P1 (high) tasks
#   ./ralph.sh               # Run all priorities (default)
#   ./ralph.sh 10 -p 0 -v   # 10 iterations, P0 only, verbose

MAX_ITERATIONS=100
VERBOSE_FLAG=""
PRIORITY_FILTER=""
PRIORITY_BD_FLAG=""

# Parse arguments
while [ $# -gt 0 ]; do
  case "$1" in
  --verbose | -v)
    VERBOSE_FLAG="--verbose"
    shift
    ;;
  -p)
    PRIORITY_FILTER="$2"
    PRIORITY_BD_FLAG="--priority $2"
    shift 2
    ;;
  [0-9]*)
    MAX_ITERATIONS="$1"
    shift
    ;;
  *)
    shift
    ;;
  esac
done
iteration=0

if [ -n "$PRIORITY_FILTER" ]; then
  echo "Starting Ralph loop (max $MAX_ITERATIONS iterations, P${PRIORITY_FILTER} only)"
else
  echo "Starting Ralph loop (max $MAX_ITERATIONS iterations, all priorities)"
fi

while [ $iteration -lt $MAX_ITERATIONS ]; do
  echo ""
  echo "=== Iteration $((iteration + 1)) ==="
  echo "---"

  # Check if any ready work is available (no blockers, not in_progress by another agent)
  available=$(bd ready --assignee=ralph --type epic -n 100 $PRIORITY_BD_FLAG --json 2>/dev/null | jq -r 'length')

  if [ "$available" -eq 0 ]; then
    echo "No ready work available. Done."
    exit 0
  fi

  echo "$available ready task(s) available"
  echo ""

  # Let Claude see available work, pick one, claim it, and execute
  claude --dangerously-skip-permissions --output-format stream-json --verbose -p "
Run \`bd ready --assignee=ralph --type epic -n 100 --sort=priority $PRIORITY_BD_FLAG\` to see available tasks.

Also run \`bd list --status=in_progress --assignee=ralph\` to see what tasks other Ralph agents are currently working on.

Decide which task to work on next. Selection criteria:
1. Priority - higher priority tasks are more important
2. Avoid conflicts - if other Ralph agents have tasks in_progress, you MUST pick a completely different epic. Do NOT work on any task that is a child, parent, or sibling of an in-progress task. Stay away from the entire epic tree that another Ralph is working on.
3. If all high-priority epics are being worked on by other Ralphs, pick a lower-priority epic that is completely unrelated

Pick ONE task, claim it with \`bd update <id> --status in_progress\`, then execute it according to its description.

One iteration = complete the task AND all its child tasks (if any).

IMPORTANT: After the task and all children are done (or if blocked), EXIT immediately. Do NOT pick up another top-level task. The outer loop will handle the next iteration.
" 2>&1 | "$(dirname "$0")/ralph-format.sh" $VERBOSE_FLAG || true

  ((iteration++)) || true
done

echo ""
echo "Reached max iterations ($MAX_ITERATIONS)"
