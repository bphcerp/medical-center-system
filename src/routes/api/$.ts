import { createFileRoute } from "@tanstack/react-router";
import type { Hono } from "hono";
import { hc } from "hono/client";
import honoApp from "@/api";
import type { StrictHono } from "@/lib/types/api";

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

export type AppType = typeof honoApp extends StrictHono<
	infer E,
	infer S,
	infer B
>
	? Hono<E, S, B>
	: never;

export const client = hc<AppType>("/", {
	init: {
		credentials: "include",
	},
});
