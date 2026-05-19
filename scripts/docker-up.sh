#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo ">>> Created .env from .env.example — set JWT_SECRET and CORS_ORIGIN for production."
  else
    cat > .env <<'EOF'
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://pearl:pearl@localhost:5432/pearl
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=change-me-min-16-chars!!
LEAD_REQUEST_LOG_PATH=logs/lead-requests.ndjson
LOG_LEVEL=info
EOF
    echo ">>> Created default .env (no .env.example in tree) — set JWT_SECRET and CORS_ORIGIN for production."
  fi
fi
docker compose up -d --build --wait
