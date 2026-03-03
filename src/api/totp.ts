import { Hono } from "hono";
import { validateAllTOTP } from "@/utils/totp";

const totp = new Hono()
	/**
	 * POST /api/totp/validate
	 * Body: { "code1": "123456", "code2": "654321", "code3": "111222" }
	 *
	 * Validates all 3 TOTP codes at once.
	 * Returns { success: true, data: { valid: true/false } }
	 */
	.post("/validate", async (c) => {
		const body = await c.req.json();
		const { code1, code2, code3 } = body ?? {};

		if (!code1 || !code2 || !code3) {
			return c.json(
				{ success: false, error: { message: "code1, code2, and code3 are required" } },
				400,
			);
		}

		const codeRegex = /^\d{6}$/;
		if (!codeRegex.test(code1) || !codeRegex.test(code2) || !codeRegex.test(code3)) {
			return c.json(
				{ success: false, error: { message: "Each code must be exactly 6 digits" } },
				400,
			);
		}

		const valid = validateAllTOTP([code1, code2, code3]);

		return c.json({
			success: true,
			data: { valid },
		});
	});

export default totp;