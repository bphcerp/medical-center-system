#!/bin/bash

set -e

SECRETS_FILE="/app/secrets/app-secrets.env"
MAX_WAIT=30
WAITED=0

echo "==> Waiting for Vault secrets at ${SECRETS_FILE}..."

while [ ! -f "$SECRETS_FILE" ]; do
    if [ "$WAITED" -ge "$MAX_WAIT" ]; then
        echo ""
        echo "  ERROR: Timed out waiting for secrets file after ${MAX_WAIT}s"
        echo ""
        echo "  The Vault Agent did not write the secrets file in time."
        echo ""
        echo "  Debugging steps:"
        echo "    1. Check vault-agent logs:"
        echo "       docker compose --profile dev logs vault-agent"
        echo ""
        echo "    2. Check vault-init logs (did it complete?):"
        echo "       docker compose --profile dev logs vault-init"
        echo ""
        echo "    3. Check vault server logs:"
        echo "       docker compose --profile dev logs vault"
        echo ""
        echo "    4. Verify the shared-secrets volume exists:"
        echo "       docker volume ls | grep shared"
        echo ""
        exit 1
    fi
    sleep 1
    WAITED=$((WAITED + 1))
    echo "    Waiting... (${WAITED}s / ${MAX_WAIT}s)"
done

echo "==> Secrets file found after ${WAITED}s!"


echo "==> Loading environment variables from secrets file..."
set -a
source "$SECRETS_FILE"
set +a
echo "==> Environment variables loaded. Starting application..."

exec "$@"