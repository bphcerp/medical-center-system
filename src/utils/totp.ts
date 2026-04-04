import { createHmac } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const decodeBase32 = (value: string) => {
	const normalized = value.toUpperCase().replace(/[\s=]+/g, "");
	let bits = 0;
	let bitCount = 0;
	const bytes: number[] = [];

	for (const char of normalized) {
		const index = BASE32_ALPHABET.indexOf(char);
		if (index === -1) {
			throw new Error("Invalid base32 secret");
		}

		bits = (bits << 5) | index;
		bitCount += 5;

		if (bitCount >= 8) {
			bytes.push((bits >>> (bitCount - 8)) & 0xff);
			bitCount -= 8;
		}
	}

	return Buffer.from(bytes);
};

const generateTotp = ({
	secret,
	counter,
	digits = 6,
}: {
	secret: string;
	counter: number;
	digits?: number;
}) => {
	const key = decodeBase32(secret);
	const counterBuffer = Buffer.alloc(8);
	counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
	counterBuffer.writeUInt32BE(counter >>> 0, 4);

	const digest = createHmac("sha1", key).update(counterBuffer).digest();
	const offset = digest[digest.length - 1] & 0x0f;
	const code =
		(((digest[offset] & 0x7f) << 24) |
			((digest[offset + 1] & 0xff) << 16) |
			((digest[offset + 2] & 0xff) << 8) |
			(digest[offset + 3] & 0xff)) %
		10 ** digits;

	return code.toString().padStart(digits, "0");
};

export const verifyTotp = ({
	secret,
	token,
	window = 1,
	period = 30,
	digits = 6,
	now = Date.now(),
}: {
	secret: string;
	token: string;
	window?: number;
	period?: number;
	digits?: number;
	now?: number;
}) => {
	const currentCounter = Math.floor(now / 1000 / period);

	for (let offset = -window; offset <= window; offset += 1) {
		const expectedToken = generateTotp({
			secret,
			counter: currentCounter + offset,
			digits,
		});

		if (expectedToken === token) {
			return true;
		}
	}

	return false;
};

export const validateAllTotpCodes = ({
	secrets,
	codes,
	now = Date.now(),
}: {
	secrets: readonly [string, string, string];
	codes: readonly [string, string, string];
	now?: number;
}) => {
	const remainingSecrets = [...secrets];

	for (const code of codes) {
		const matchingSecretIndex = remainingSecrets.findIndex((secret) =>
			verifyTotp({
				secret,
				token: code,
				now,
			}),
		);

		if (matchingSecretIndex === -1) {
			return false;
		}

		remainingSecrets.splice(matchingSecretIndex, 1);
	}

	return true;
};
