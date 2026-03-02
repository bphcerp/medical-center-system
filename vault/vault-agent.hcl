pid_file = "/tmp/vault-agent-pidfile"

auto_auth {
    method "approle" {
        mount_path = "auth/approle"

        config = {
            role_id_file_path   = "/vault/credentials/roleid"
            secret_id_file_path = "/vault/credentials/secretid"
            remove_secret_id_file_after_reading = false
        }
    }

    sink "file" {
        config = {
            path = "/tmp/vault-token"
            mode = 0600
        }
    }
}

template {
    source      = "/vault/config/secrets.ctmpl"
    destination = "/vault/secrets/app-secrets.env"
    # 0640: owner (vault, UID 100) rw, group (GID 1000 = bun) r, others none
    perms       = 0640
}

vault {
    address = "http://vault:8200"
}
