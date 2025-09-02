import { Hono } from "hono";

const app = new Hono()
	.basePath("/api")
	.get("/", (c) => {
		return c.json({ hello: "world" });
	})
	.get("/ping", (c) => c.text("pong"));

export default app;
