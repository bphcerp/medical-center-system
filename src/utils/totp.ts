import fs from "node:fs";
import path from "node:path";
import { verifySync } from "otplib";

const TOTP_OPTIONS = {
	period: 30,
	digits: 6,
	epochTolerance: 30,
};

function readSecret(name: string): string {
	const secretPath = path.resolve("secrets", name);
	try {
		return fs.readFileSync(`/run/secrets/${name}`, "utf8").trim();
	} catch {
		return fs.readFileSync(secretPath, "utf8").trim();
	}
}

const secrets = [
	readSecret("totpToken1.txt"),
	readSecret("totpToken2.txt"),
	readSecret("totpToken3.txt"),
];

/**
 * Validate all 3 TOTP codes at once.
 * Returns true only if all 3 codes match their respective secrets.
 */
export function validateAllTOTP(codes: [string, string, string]): boolean {
	try {
		const availableSecrets = [...secrets];
		for (const code of codes) {
			const matchIndex = availableSecrets.findIndex((secret) => {
				const result = verifySync({
					token: code,
					secret,
					...TOTP_OPTIONS,
				});
				return result.valid;
			});

			if (matchIndex === -1) return false;
			availableSecrets.splice(matchIndex, 1);
		}
		return true;
	} catch {
		return false;
	}
}
