#!/usr/bin/env bash
#
# run-e2e.sh — Run Playwright E2E tests against the full Docker stack
#
# Usage:
#   ./scripts/run-e2e.sh              # Run tests headless (CI mode)
#   ./scripts/run-e2e.sh --headed     # Run tests with browser UI
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

HEADED="${1:-}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
EXIT_CODE=0

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  WhatsApp Bot — E2E Test Suite${NC}"
echo -e "${CYAN}  Started: $(date)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Step 1: Build and start services ──────────────────────────────
echo -e "${YELLOW}[1/5] Starting Docker services...${NC}"
docker compose up --build -d 2>&1

# ── Step 2: Wait for services to be healthy ────────────────────────
echo -e "${YELLOW}[2/5] Waiting for services to be healthy...${NC}"

wait_for_service() {
    local service="$1"
    local timeout="${2:-120}"
    local elapsed=0
    while [ $elapsed -lt "$timeout" ]; do
        local status
        status="$(docker compose ps --format json "$service" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health',''))" 2>/dev/null || echo "unknown")"
        if [ "$status" = "healthy" ]; then
            echo -e "  ${GREEN}✓${NC} $service is healthy"
            return 0
        fi
        sleep 3
        elapsed=$((elapsed + 3))
    done
    echo -e "  ${RED}✗${NC} $service not healthy after ${timeout}s"
    return 1
}

wait_for_service "app" 120
wait_for_service "dashboard" 60

echo ""

# ── Step 3: Run Playwright tests ──────────────────────────────────
echo -e "${YELLOW}[3/5] Running Playwright tests...${NC}"

if [ "$HEADED" = "--headed" ]; then
    npx playwright test --config=e2e/playwright.config.ts --headed || EXIT_CODE=$?
else
    npx playwright test --config=e2e/playwright.config.ts || EXIT_CODE=$?
fi

echo ""

# ── Step 4: Stop services ─────────────────────────────────────────
echo -e "${YELLOW}[4/5] Stopping Docker services...${NC}"
docker compose down 2>&1

echo ""

# ── Step 5: Report results ───────────────────────────────────────
echo -e "${YELLOW}[5/5] Results${NC}"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ ALL E2E TESTS PASSED${NC}"
    echo -e "${GREEN}  Timestamp: ${TIMESTAMP}${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
else
    echo -e "${RED}═══════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ❌ SOME TESTS FAILED (exit code: ${EXIT_CODE})${NC}"
    echo -e "${RED}  Check e2e-report/ for details${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════${NC}"
fi

exit $EXIT_CODE
