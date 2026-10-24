#!/usr/bin/env bash
# Genera `.env.dev.local` con las llaves de la base LOCAL (Supabase CLI) para `compose.dev.yaml`.
# No toca `.env.local` (producción) y `.env.dev.local` está ignorado por git (`.env*`).
set -euo pipefail

cd "$(dirname "$0")/.."

if ! status="$(supabase status -o env 2>/dev/null)"; then
  echo "La base local no está corriendo. Ejecuta primero: supabase start" >&2
  exit 1
fi

# `supabase status -o env` imprime VAR="valor"; se leen aquí y no se muestran.
eval "$status"

umask 077
cat > .env.dev.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
EOF

echo "Listo: .env.dev.local (base local en 127.0.0.1:54321). Ahora: docker compose -f compose.dev.yaml up"
