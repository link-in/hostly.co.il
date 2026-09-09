#!/usr/bin/env bash
#
# Cloud Agent install script for Hostly.
# Idempotent: safe to re-run on every VM boot / environment refresh.
set -euo pipefail

cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------------
# 1. Environment variables.
#    Two modes:
#    (a) Real secrets injected via the Cloud Agent "Secrets" panel are exposed
#        as process env vars. In that case we must NOT let a placeholder
#        .env.local shadow them, so any existing placeholder file is removed and
#        the app reads the real values straight from the environment.
#    (b) No secrets (e.g. public/demo context): write dummy placeholders so the
#        module-level env checks don't crash. The demo flow mocks Beds24 &
#        Supabase (see src/lib/dashboard/providers/mock.ts). Mirrors ci.yml.
#    Detection key: NEXT_PUBLIC_SUPABASE_URL is required by the Supabase client.
# ---------------------------------------------------------------------------
if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "[install] Real secrets detected in environment — using injected values"
  if [ -f .env.local ]; then
    echo "[install] Removing placeholder .env.local so it does not shadow injected secrets"
    rm -f .env.local
  fi
elif [ ! -f .env.local ]; then
  echo "[install] No injected secrets — creating .env.local with dev placeholders"
  cat > .env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://ci-placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder-anon-key
SUPABASE_SERVICE_ROLE_KEY=ci-placeholder-service-role-key
NEXTAUTH_SECRET=ci-placeholder-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=ci-placeholder-google-client-id
GOOGLE_CLIENT_SECRET=ci-placeholder-google-client-secret
BEDS24_API_BASE_URL=https://api.beds24.com/v2
BEDS24_PROPERTY_ID=306559
BEDS24_ROOM_ID=638851
BEDS24_TOKEN=ci-placeholder-token
BEDS24_REFRESH_TOKEN=ci-placeholder-refresh-token
ADMIN_CACHE_SECRET=ci-placeholder-cache-secret
EOF
fi

# ---------------------------------------------------------------------------
# 2. Node dependencies (exact lockfile install).
# ---------------------------------------------------------------------------
echo "[install] Installing npm dependencies"
npm ci

# ---------------------------------------------------------------------------
# 3. Playwright Chromium for the mocked E2E suite (npm run test:e2e).
#    Browser OS-level dependencies are already baked into the base snapshot,
#    so --with-deps (which needs root/apt) is intentionally omitted here.
# ---------------------------------------------------------------------------
echo "[install] Ensuring Playwright Chromium is installed"
npx playwright install chromium

echo "[install] Done"
