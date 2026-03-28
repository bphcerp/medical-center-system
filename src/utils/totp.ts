import { verifySync } from "otplib";
import { getSecret } from "@/utils/getSecret";

const TOTP_OPTIONS = {
	period: 30,
	digits: 6,
	epochTolerance: 30,
};

const secrets = [
	getSecret("TOTP_TOKEN_1"),
	getSecret("TOTP_TOKEN_2"),
	getSecret("TOTP_TOKEN_3"),
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
