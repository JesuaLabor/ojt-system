#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  deploy.sh  —  Quick commit & push for OJT System
#  Usage:  ./deploy.sh "your commit message"
#          ./deploy.sh "your commit message" main       ← push to specific branch
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Exit immediately on any error

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}[INFO]${RESET}  $1"; }
success() { echo -e "${GREEN}[OK]${RESET}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $1"; }
error()   { echo -e "${RED}[ERROR]${RESET} $1"; exit 1; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║        OJT System  —  deploy.sh       ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${RESET}"

# ── Validate commit message ───────────────────────────────────────────────────
COMMIT_MSG="${1:-}"
if [[ -z "$COMMIT_MSG" ]]; then
  error "No commit message provided.\n  Usage: ./deploy.sh \"your commit message\""
fi

# ── Detect branch ─────────────────────────────────────────────────────────────
BRANCH="${2:-$(git rev-parse --abbrev-ref HEAD)}"
info "Target branch: ${BOLD}$BRANCH${RESET}"

# ── Step 1: Go vet (lint check) ───────────────────────────────────────────────
info "Running go vet..."
if (cd backend && go vet ./...); then
  success "go vet passed"
else
  error "go vet failed — fix errors before committing"
fi

# ── Step 2: Go build (compile check) ─────────────────────────────────────────
info "Running go build..."
if (cd backend && go build ./...); then
  success "go build passed"
else
  error "go build failed — fix errors before committing"
fi

# ── Step 3: Check for staged/unstaged changes ─────────────────────────────────
if git diff --quiet && git diff --cached --quiet; then
  warn "Nothing to commit — working tree is clean"
  exit 0
fi

# ── Step 4: Stage all changes ─────────────────────────────────────────────────
info "Staging all changes..."
git add .
success "All changes staged"

# ── Step 5: Show what will be committed ───────────────────────────────────────
echo ""
echo -e "${BOLD}Files to be committed:${RESET}"
git diff --cached --name-status
echo ""

# ── Step 6: Commit ────────────────────────────────────────────────────────────
info "Committing: \"$COMMIT_MSG\""
git commit -m "$COMMIT_MSG"
success "Committed successfully"

# ── Step 7: Push ──────────────────────────────────────────────────────────────
info "Pushing to origin/$BRANCH..."
git push origin "$BRANCH"
success "Pushed to origin/$BRANCH 🚀"

echo ""
echo -e "${GREEN}${BOLD}  ✅  Done! All changes committed and pushed.${RESET}"
echo ""
