
import honoApp from "@/api";
import { createFileRoute } from "@tanstack/react-router";

const handle = async ({ request }: { request: Request }) =>
	honoApp.fetch(request);

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			POST: handle,
			GET: handle,
			DELETE: handle,
		}
	}
});
