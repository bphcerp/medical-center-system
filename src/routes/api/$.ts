import { createFileRoute } from "@tanstack/react-router";
import honoApp from "@/api";

const handle = async ({ request }: { request: Request }) =>
	honoApp.fetch(request);

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			POST: handle,
			GET: handle,
			DELETE: handle,
		},
	},
});
