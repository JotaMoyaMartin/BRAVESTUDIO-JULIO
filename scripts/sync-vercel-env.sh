#!/usr/bin/env bash
# sync-vercel-env.sh — Push local env values to Vercel for client + server
#
# Source of truth:  <project>/.env.production.local   (gitignored, you fill it)
# Sink (runtime):  <project>/.env.local              (written by `vercel env pull`)
#
# Each KEY=VALUE in the source file is pushed to Vercel in three environments
# (production, preview, development) using the official CLI pipe flow:
#     printf '%s\n' "$value" | vercel env add KEY ENV --force -y
#
# After pushing, `vercel env pull` is run into <project>/.env.local and any
# still-empty values are reported. Nothing is printed to stdout that contains
# a secret — only KEY names and pass/fail status.
#
# Usage:
#   ./scripts/sync-vercel-env.sh              # push + verify both projects
#   ./scripts/sync-vercel-env.sh client        # only client
#   ./scripts/sync-vercel-env.sh server        # only server
#   ./scripts/sync-vercel-env.sh --verify      # only verify (no push)
#   ./scripts/sync-vercel-env.sh client --verify
#
# Requires: vercel CLI installed and authenticated; projects linked at repo root
# (.vercel/repo.json maps client/ -> bravestudio-cleint, server/ -> bravestudio-backend).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENVS=(production preview development)

# Keys that are auto-injected by Vercel/runtime and must NOT be pushed.
SKIP_KEYS_REGEX='^(VERCEL|TURBO|NX_DAEMON|PORT|NODE_ENV|CI|_).*$'

# Colors
C_CYAN=$'\033[1;36m'; C_GREEN=$'\033[1;32m'; C_RED=$'\033[1;31m'
C_YELLOW=$'\033[1;33m'; C_DIM=$'\033[2m'; C_RESET=$'\033[0m'

log()  { printf '%s%s%s\n' "$C_CYAN" "$*" "$C_RESET"; }
ok()   { printf '%s✓ %s%s\n' "$C_GREEN" "$*" "$C_RESET"; }
err()  { printf '%s✗ %s%s\n' "$C_RED" "$*" "$C_RESET" >&2; }
warn() { printf '%s! %s%s\n' "$C_YELLOW" "$*" "$C_RESET" >&2; }

# Strip surrounding quotes from a value ("..." or '...').
strip_quotes() {
  local v="$1"
  v="${v#\"}"; v="${v%\"}"
  v="${v#\'}"; v="${v%\'}"
  printf '%s' "$v"
}

# Push one project's env file to Vercel.
# $1 = project dir name (client | server)
push_project() {
  local project="$1"
  local dir="$ROOT/$project"
  local src="$dir/.env.production.local"

  if [[ ! -f "$src" ]]; then
    err "$project: source file not found: $src"
    err "       create it from scripts/envs/$project.env.example"
    return 1
  fi

  log "▶ $project: pushing $src → Vercel (${ENVS[*]})"

  local count=0 skipped=0 empties=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    # skip blank lines and comments
    [[ -z "${line// }" || "${line}" =~ ^[[:space:]]*# ]] && continue
    # split on first '='
    local key="${line%%=*}"
    local value="${line#*=}"
    [[ -z "$key" ]] && continue
    # skip auto-managed
    if [[ "$key" =~ $SKIP_KEYS_REGEX ]]; then
      skipped=$((skipped+1)); continue
    fi
    value="$(strip_quotes "$value")"
    if [[ -z "$value" ]]; then
      warn "$project: $key has EMPTY value — fill it in $src (skipped)"
      empties=$((empties+1)); continue
    fi

    for env in "${ENVS[@]}"; do
      printf '  %-28s %-10s ' "$key" "$env"
      # rm first (ignore failure if not present), then add via pipe
      (cd "$dir" && vercel env rm "$key" "$env" -y >/dev/null 2>&1 || true)
      if printf '%s\n' "$value" | (cd "$dir" && vercel env add "$key" "$env" --force -y >/dev/null 2>&1); then
        ok "set"
      else
        err "$project/$env/$key failed — check value or re-run"
      fi
    done
    count=$((count+1))
  done < "$src"

  log "  $project: $count pushed, $skipped auto-managed skipped, $empties empty-skipped"
}

# Verify a project by pulling to <project>/.env.local and scanning for empties.
# $1 = project dir name
verify_project() {
  local project="$1"
  local dir="$ROOT/$project"
  local dst="$dir/.env.local"

  log "▶ $project: pulling to $dst (production) and checking for empties"
  if ! (cd "$dir" && vercel env pull "$dst" --environment production >/dev/null 2>&1); then
    err "$project: vercel env pull failed"
    return 1
  fi

  if [[ ! -f "$dst" ]]; then
    err "$project: $dst not created"
    return 1
  fi

  # collect empty assignments, excluding auto-managed and injected vars
  local empties
  empties="$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=""$' "$dst" \
              | grep -vE "$SKIP_KEYS_REGEX" \
              | grep -vE '^(VERCEL_GIT|VERCEL_OIDC|VERCEL_URL|VERCEL_TARGET_ENV|VERCEL_ENV)' || true)"
  if [[ -z "$empties" ]]; then
    ok "$project: no empty values in $dst"
  else
    err "$project: EMPTY values still present in $dst:"
    printf '%s\n' "$empties" | sed 's/^/      /' >&2
  fi
}

main() {
  local targets=() verify_only=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --verify) verify_only=1 ;;
      client|server) targets+=("$1") ;;
      -h|--help)
        sed -n '2,/^$/p' "$0" | sed 's/^# \?//'
        exit 0 ;;
      *) err "unknown arg: $1"; exit 2 ;;
    esac
    shift
  done
  [[ ${#targets[@]} -eq 0 ]] && targets=(client server)

  if ! command -v vercel >/dev/null 2>&1; then
    err "vercel CLI not found in PATH"; exit 1
  fi

  for t in "${targets[@]}"; do
    [[ $verify_only -eq 0 ]] && push_project "$t"
    verify_project "$t"
  done
  log "Done."
}

main "$@"