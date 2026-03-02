import { readFileSync } from "fs";

// reads docker secret and falls back to plain .env variable

export function getSecret(envKey: string, defaultValue?: string): string {
	const filePath = process.env[`${envKey}_FILE`];
	if (filePath) {
		try {
			return readFileSync(filePath, "utf8").trim();
		} catch (err) {
			console.error(
				`Failed to read secret file for ${envKey} at ${filePath}:`,
				err,
			);
		}
	}
	const envVal = process.env[envKey];
	if (envVal !== undefined) {
		return envVal;
	}
	if (defaultValue !== undefined) {
		return defaultValue;
	}
	throw new Error(`Secret "${envKey}" is not set and no default was provided.`);
}
