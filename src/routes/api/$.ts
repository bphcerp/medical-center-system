import { createFileRoute } from "@tanstack/react-router";
import { hc } from "hono/client";
import honoApp from "@/api";

const handle = async ({ request }: { request: Request }) =>
	honoApp.fetch(request);

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			POST: handle,
			GET: handle,
			DELETE: handle,
			PATCH: handle,
		},
	},
});

export const client = hc<typeof honoApp>("/", {
	init: {
		credentials: "include",
	},
});
