import { existsSync, readFileSync } from "node:fs";

const SECRETS_FILE = "/app/secrets/app-secrets.env";

export function getVaultSecrets(): Record<string, string> {
    if (!existsSync(SECRETS_FILE)) {
        console.warn(
            `[vault] Secrets file not found at ${SECRETS_FILE}. ` +
                "Falling back to process.env / .env file. " +
                "This is normal when running outside Docker.",
        );
        return {};
    }

    try {
        const content = readFileSync(SECRETS_FILE, "utf-8");
        const secrets: Record<string, string> = {};

        for (const line of content.split("\n")) {
            const trimmed = line.trim();

            // Skip empty lines
            if (!trimmed) continue;

            // Skip comment lines (lines starting with #)
            // The template file includes comments that pass through
            // to the rendered output.
            if (trimmed.startsWith("#")) continue;

            // Find the FIRST equals sign in the line.
            // We use indexOf("=") instead of split("=") because
            // values might contain "=" characters. For example:
            //   JWT_SECRET=kR7mX2nP9qS4uW0yB3dF6gH8jK1lN5oQ7rT9vX2zA4cE=
            //                                                           ^
            //                            This "=" is part of the base64 value
            //
            // split("=") would break this into 3 parts: ["JWT_SECRET", "kR7m...", ""]
            // indexOf("=") finds position 10, so:
            //   key   = line[0..10]  = "JWT_SECRET"
            //   value = line[11..]   = "kR7mX2nP9qS4uW0yB3dF6gH8jK1lN5oQ7rT9vX2zA4cE="
            const eqIndex = trimmed.indexOf("=");
            if (eqIndex === -1) continue; // No "=" found, skip this line

            const key = trimmed.slice(0, eqIndex).trim();
            let value = trimmed.slice(eqIndex + 1).trim();

            // Strip surrounding quotes added by the Consul-template.
            // The .ctmpl wraps values in double quotes so that
            // bash `source` handles spaces correctly (e.g. EMAIL_PASS),
            // but we need the raw value here.
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }

            secrets[key] = value;
        }

        console.log(
            `[vault] Loaded ${Object.keys(secrets).length} secrets ` +
                `from Vault Agent sidecar (${SECRETS_FILE})`,
        );
        return secrets;
    } catch (error) {
        // --------------------------------------------------------
        // Error handling
        // --------------------------------------------------------
        // If reading or parsing fails for any reason, log the error
        // and return an empty object. This lets env.ts fall back to
        // process.env instead of crashing the entire application.
        console.error(
            `[vault] Failed to read secrets file at ${SECRETS_FILE}:`,
            error,
        );
        return {};
    }
}