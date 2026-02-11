#!/bin/bash
# Pulsed E2E Smoke Test
# Tests: landing page, quota API, daily brief API, login/signup pages, brief page
set -e

BASE="${1:-https://app-six-eta-95.vercel.app}"
PASS=0
FAIL=0

check() {
  local name="$1" url="$2" expect="$3"
  local body
  body=$(curl -sL --max-time 15 "$url" 2>&1)
  if echo "$body" | grep -qi "$expect"; then
    echo "✅ $name"
    PASS=$((PASS+1))
  else
    echo "❌ $name — expected '$expect'"
    FAIL=$((FAIL+1))
  fi
}

echo "🧪 Pulsed E2E Smoke Tests — $BASE"
echo "─────────────────────────────────"

# 1. Landing page loads
check "Landing page" "$BASE" "Research any topic"

# 2. Login page (light theme)
check "Login page" "$BASE/login" "Welcome back"

# 3. Signup page (light theme)
check "Signup page" "$BASE/signup" "Join the Pulsed beta"

# 4. Quota API returns JSON
QUOTA=$(curl -sL --max-time 10 "$BASE/api/quota?fp=test123")
if echo "$QUOTA" | grep -q '"remaining"'; then
  echo "✅ Quota API returns remaining count"
  PASS=$((PASS+1))
else
  echo "❌ Quota API — expected 'remaining' field"
  FAIL=$((FAIL+1))
fi

# 5. Daily brief API
DAILY=$(curl -sL --max-time 10 "$BASE/api/daily-brief")
if echo "$DAILY" | grep -q '"topic"'; then
  echo "✅ Daily Brief API returns topic"
  PASS=$((PASS+1))
else
  echo "❌ Daily Brief API — expected 'topic' field (may be 404 if no brief today)"
  FAIL=$((FAIL+1))
fi

# 6. Search page loads
check "Search page" "$BASE/search?q=test" "Researching"

# 7. Brief page (404 for fake ID is expected)
BRIEF=$(curl -sL --max-time 10 "$BASE/brief/00000000-0000-0000-0000-000000000000")
if echo "$BRIEF" | grep -qi "not found\|Brief"; then
  echo "✅ Brief page handles missing ID"
  PASS=$((PASS+1))
else
  echo "❌ Brief page — expected error handling"
  FAIL=$((FAIL+1))
fi

echo "─────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "🎉 All tests passed!"
