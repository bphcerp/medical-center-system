import "dotenv/config";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import env from "@/config/env";

const authenticated = new Hono().use(
	jwt({
		cookie: "token",
		secret: env.JWT_SECRET,
	}),
);

authenticated.get("/test", async (c) => {
	return c.json({
		success: true,
	});
});

export default authenticated;
