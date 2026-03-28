// @ts-expect-error
import Docker from "dockerode";
import { z } from "zod";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { validateAllTOTP } from "@/utils/totp";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const totp = createStrictHono().post(
	"/validate",
	strictValidator(
		"json",
		z.object({
			codes: z.tuple([
				z.string().length(6),
				z.string().length(6),
				z.string().length(6),
			]),
		}),
	),
	async (c) => {
		const { codes } = c.req.valid("json");
		const valid = validateAllTOTP(codes);

		if (valid) {
			try {
				const dbContainer = docker.getContainer("medical-center-system-db-1");
				const dbInfo = await dbContainer.inspect();
				if (!dbInfo.State.Running) {
					await dbContainer.start();
				}

				const pgwebContainer = docker.getContainer("pgweb");
				const pgwebInfo = await pgwebContainer.inspect();
				if (!pgwebInfo.State.Running) {
					await pgwebContainer.start();
				}
			} catch (error) {
				console.error("Failed to start containers:", error);
			}
		}

		return c.json({
			success: true as const,
			data: { valid },
		});
	},
);

export default totp;
