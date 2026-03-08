#!/usr/bin/env bash
# Full backend test suite for OJT System
BASE="http://localhost:8000/api"
PASS=0; FAIL=0

# Colors
GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'

check() {
  local label="$1"; local response="$2"; local expected="$3"
  if echo "$response" | grep -q "$expected"; then
    echo -e "${GREEN}  ✅ PASS${RESET}  $label"
    ((PASS++))
  else
    echo -e "${RED}  ❌ FAIL${RESET}  $label"
    echo -e "     Expected to find: ${YELLOW}$expected${RESET}"
    echo -e "     Got: ${response:0:200}"
    ((FAIL++))
  fi
}

echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}   OJT Backend API — Full Test Suite              ${RESET}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}\n"

# ── 1. AUTH ──────────────────────────────────────────────────────────────────
echo -e "${BOLD}► AUTH ENDPOINTS${RESET}"

# Register student
R=$(curl -s -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Test Student","email":"test.student@ojt.com","password":"pass1234","role":"student"}')
check "POST /auth/register (student)" "$R" "registered successfully"
STUDENT_TOKEN=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

# Register supervisor
R=$(curl -s -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Test Supervisor","email":"test.supervisor@ojt.com","password":"pass1234","role":"supervisor"}')
check "POST /auth/register (supervisor)" "$R" "registered successfully"
SUPERVISOR_TOKEN=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
STUDENT_ID=1

# Duplicate register (should fail)
R=$(curl -s -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Test Student","email":"test.student@ojt.com","password":"pass1234","role":"student"}')
check "POST /auth/register (duplicate email → 409)" "$R" "already exists"

# Bad role
R=$(curl -s -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"name":"X","email":"x@x.com","password":"pass1234","role":"admin"}')
check "POST /auth/register (bad role → 400)" "$R" "error"

# Login
R=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test.student@ojt.com","password":"pass1234"}')
check "POST /auth/login (valid)" "$R" "token"

# Wrong password
R=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test.student@ojt.com","password":"wrongpass"}')
check "POST /auth/login (wrong password → 401)" "$R" "Invalid email or password"

# ── 2. PROFILE ───────────────────────────────────────────────────────────────
echo -e "\n${BOLD}► PROFILE ENDPOINTS${RESET}"

R=$(curl -s $BASE/me -H "Authorization: Bearer $STUDENT_TOKEN")
check "GET /me (authenticated)" "$R" "test.student@ojt.com"

R=$(curl -s $BASE/me -H "Authorization: Bearer badtoken")
check "GET /me (invalid token → 401)" "$R" "Invalid or expired token"

R=$(curl -s $BASE/me)
check "GET /me (no token → 401)" "$R" "Authorization header required"

R=$(curl -s -X PUT $BASE/me -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student Updated"}')
check "PUT /me (update profile)" "$R" "updated successfully"

# ── 3. TIME LOGS ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}► TIME LOG ENDPOINTS${RESET}"

# Clock In
R=$(curl -s -X POST $BASE/timelogs/clockin -H "Authorization: Bearer $STUDENT_TOKEN")
check "POST /timelogs/clockin" "$R" "Clocked in successfully"
LOG_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('log',{}).get('ID',1))" 2>/dev/null)

# Duplicate clock-in
R=$(curl -s -X POST $BASE/timelogs/clockin -H "Authorization: Bearer $STUDENT_TOKEN")
check "POST /timelogs/clockin (already in → 409)" "$R" "already clocked in"

# Clock Out
R=$(curl -s -X PATCH $BASE/timelogs/clockout -H "Authorization: Bearer $STUDENT_TOKEN")
check "PATCH /timelogs/clockout" "$R" "Clocked out successfully"

# Manual time log
R=$(curl -s -X POST "$BASE/timelogs/" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clock_in":"2026-03-07T08:00:00+08:00","clock_out":"2026-03-07T17:00:00+08:00","remarks":"Day 2"}')
check "POST /timelogs/ (manual with clock_out)" "$R" "total_hours"

# Get own logs
R=$(curl -s "$BASE/timelogs/" -H "Authorization: Bearer $STUDENT_TOKEN")
check "GET /timelogs/ (own logs)" "$R" "logs"

# Role guard — student cannot see other student logs
R=$(curl -s "$BASE/timelogs/1" -H "Authorization: Bearer $STUDENT_TOKEN")
check "GET /timelogs/:student_id (student → 403)" "$R" "Access denied"

# Supervisor views student logs
R=$(curl -s "$BASE/timelogs/$STUDENT_ID" -H "Authorization: Bearer $SUPERVISOR_TOKEN")
check "GET /timelogs/:student_id (supervisor)" "$R" "summary"

# Approve log
R=$(curl -s -X PATCH "$BASE/timelogs/$LOG_ID/approve" -H "Authorization: Bearer $SUPERVISOR_TOKEN")
check "PATCH /timelogs/:id/approve" "$R" "approved"

# Approve already approved
R=$(curl -s -X PATCH "$BASE/timelogs/$LOG_ID/approve" -H "Authorization: Bearer $SUPERVISOR_TOKEN")
check "PATCH /timelogs/:id/approve (already approved → 400)" "$R" "already approved"

# Reject without remarks
R=$(curl -s -X PATCH "$BASE/timelogs/2/reject" -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" -d '{}')
check "PATCH /timelogs/:id/reject (no remarks → 400)" "$R" "remarks"

# Reject with remarks
R=$(curl -s -X PATCH "$BASE/timelogs/2/reject" -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" -d '{"remarks":"Location mismatch"}')
check "PATCH /timelogs/:id/reject (with remarks)" "$R" "rejected"

# Student summary
R=$(curl -s "$BASE/timelogs/$STUDENT_ID/summary" -H "Authorization: Bearer $SUPERVISOR_TOKEN")
check "GET /timelogs/:student_id/summary" "$R" "required_hours"

# ── 4. EVALUATIONS ───────────────────────────────────────────────────────────
echo -e "\n${BOLD}► EVALUATION ENDPOINTS${RESET}"

# Student cannot create eval
R=$(curl -s -X POST "$BASE/evaluations/" -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"period":"Midterm","technical_score":85,"communication_score":90,"punctuality_score":88,"teamwork_score":87,"initiative_score":82,"feedback":"Great work"}')
check "POST /evaluations/ (student → 403)" "$R" "Access denied"

# Supervisor creates eval
R=$(curl -s -X POST "$BASE/evaluations/" -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"period":"Midterm","technical_score":85,"communication_score":90,"punctuality_score":88,"teamwork_score":87,"initiative_score":82,"feedback":"Great work so far!"}')
check "POST /evaluations/ (supervisor)" "$R" "overall_score"

# Score out of range
R=$(curl -s -X POST "$BASE/evaluations/" -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"period":"Week1","technical_score":150,"communication_score":90,"punctuality_score":88,"teamwork_score":87,"initiative_score":82}')
check "POST /evaluations/ (score >100 → 400)" "$R" "error"

# Duplicate period
R=$(curl -s -X POST "$BASE/evaluations/" -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"period":"Midterm","technical_score":85,"communication_score":90,"punctuality_score":88,"teamwork_score":87,"initiative_score":82}')
check "POST /evaluations/ (duplicate period → 409)" "$R" "already submitted"

# Student views own evals
R=$(curl -s "$BASE/evaluations/me" -H "Authorization: Bearer $STUDENT_TOKEN")
check "GET /evaluations/me" "$R" "evaluations"

# Supervisor views student evals
R=$(curl -s "$BASE/evaluations/$STUDENT_ID" -H "Authorization: Bearer $SUPERVISOR_TOKEN")
check "GET /evaluations/:student_id" "$R" "summary"

# Latest evaluation
R=$(curl -s "$BASE/evaluations/$STUDENT_ID/latest" -H "Authorization: Bearer $SUPERVISOR_TOKEN")
check "GET /evaluations/:student_id/latest" "$R" "overall_score"

# ── 5. REPORT ────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}► REPORT ENDPOINT${RESET}"

HTTP_STATUS=$(curl -s -o /tmp/test_report.pdf -w "%{http_code}" \
  "$BASE/reports/$STUDENT_ID/pdf" -H "Authorization: Bearer $SUPERVISOR_TOKEN")

if [ "$HTTP_STATUS" = "200" ]; then
  PDF_SIZE=$(wc -c < /tmp/test_report.pdf)
  echo -e "${GREEN}  ✅ PASS${RESET}  GET /reports/:student_id/pdf (HTTP $HTTP_STATUS, ${PDF_SIZE} bytes) → /tmp/test_report.pdf"
  ((PASS++))
else
  echo -e "${RED}  ❌ FAIL${RESET}  GET /reports/:student_id/pdf (HTTP $HTTP_STATUS)"
  cat /tmp/test_report.pdf
  ((FAIL++))
fi

# Student cannot access PDF
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/reports/$STUDENT_ID/pdf" -H "Authorization: Bearer $STUDENT_TOKEN")
check "GET /reports/:student_id/pdf (student → 403)" "{\"error\":\"$HTTP_STATUS\"}" "403"

# ── SUMMARY ───────────────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Results: ${GREEN}$PASS passed${RESET} / ${RED}$FAIL failed${RESET} / $TOTAL total"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}\n"
