import { createStrictHono, strictValidator } from "@/lib/types/api";
import { validateAllTOTP } from "@/utils/totp";
import { z } from "zod";

const totp = createStrictHono().post("/validate", 
    strictValidator("json", z.object({
        codes: z.tuple([z.string().length(6), z.string().length(6), z.string().length(6)]),
    })),
    async (c) => {
        const { codes } = c.req.valid("json");
        const valid = validateAllTOTP(codes);
        return c.json({
            success: true as const,
            data: { valid },
        });
    });

export default totp;
