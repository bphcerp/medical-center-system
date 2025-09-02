import { createServerFileRoute } from "@tanstack/react-start/server";
import honoApp from "@/api";

const handle = async ({ request }: { request: Request }) =>
	honoApp.fetch(request);

export const ServerRoute = createServerFileRoute("/api/$").methods({
	GET: handle,
	POST: handle,
});
