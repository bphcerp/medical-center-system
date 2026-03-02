#!/bin/sh

# exit if  any command returns a non zero exit code.
# so vault isnt half configured by mistake
set -e

# safety net

echo "==> [1] Waiting for Vault server to be ready..."
ATTEMPT=0
MAX_ATTEMPTS=20

until vault status > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT+1))
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        echo "ERROR: Vault did not become ready after ${MAX_ATTEMPTS} attempts."
        echo "Check if the vault service is running: docker compose --profile dev logs vault"
        exit 1
    fi
    echo "    Not ready yet, attempt ${ATTEMPT}/${MAX_ATTEMPTS}..."
    sleep 2
done
echo "Vault is ready!"

# enable KV V2 secrets engine

echo "==> [2] Enabling KV v2 secrets engine at 'secret/'..."
vault secrets enable -path=secret -version=2 kv 2>/dev/null || echo " (already enabled, skipping)"

echo "==> [3] Writing application secrets to vault..."
vault kv put secret/medical-center \
    DB_HOST="db" \
    POSTGRES_USER="" \
    POSTGRES_PASSWORD="" \
    POSTGRES_DB="" \
    PGPORT="" \
    FRONTEND_URL="" \
    FRONTEND_PORT="" \
    JWT_SECRET="$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 64)" \
    SEAWEEDFS_MASTER="" \
    EMAIL_USER="" \
    EMAIL_PASS=""

echo " Verifying stored secrets.. "
vault kv get secret/medical-center

echo "==> [4] Enabling AppRole auth method..."
vault auth enable approle 2>/dev/null || echo "(already enabled, skipping)"


echo "==> [5] Creating read-only policy 'medical-center-readonly'..."
vault policy write medical-center-readonly - <<'POLICY'
path "secret/data/medical-center" {
    capabilities = ["read"]
}
POLICY

echo "==> [6] Creating AppRole role 'medical-center-role'..."
vault write auth/approle/role/medical-center-role \
    token_policies="medical-center-readonly" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=0

echo "==> [7] Extracting AppRole credentials..."

ROLE_ID=$(vault read -field=role_id auth/approle/role/medical-center-role/role-id)
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/medical-center-role/secret-id)

echo "$ROLE_ID" > /vault-credentials/roleid
echo "$SECRET_ID" > /vault-credentials/secretid

chmod 644 /vault-credentials/roleid
chmod 644 /vault-credentials/secretid

echo ""
echo "  Vault initialization complete!"
echo "  Role ID:   ${ROLE_ID}"
echo "  Secret ID: ${SECRET_ID}"
echo "  Secrets:   secret/medical-center"
echo "  Policy:    medical-center-readonly"
echo "  Role:      medical-center-role"
echo "                    ***                    "