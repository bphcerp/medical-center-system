import pg from "pg";
import env from "@/lib/env";

const CHANNELS = [
	"unprocessed_changed",
	"cases_changed",
	"lab_changed",
] as const;
type Channel = (typeof CHANNELS)[number];

const channelListeners = new Map<Channel, Set<() => void>>(
	CHANNELS.map((ch) => [ch, new Set()]),
);

let activeClient: pg.Client | null = null;
let connecting = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleReconnect() {
	if (reconnectTimer) return;
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		void connect();
	}, 2000);
}

async function connect() {
	if (connecting || activeClient) return;
	connecting = true;

	const client = new pg.Client({ connectionString: env.DATABASE_URL });

	try {
		client.on("error", (err) => {
			console.error("[listener] pg error:", err.message);
			if (activeClient === client) {
				activeClient = null;
			}
			client.end().catch(() => {});
			scheduleReconnect();
		});

		client.on("end", () => {
			if (activeClient === client) {
				activeClient = null;
				scheduleReconnect();
			}
		});

		await client.connect();
		await Promise.all(CHANNELS.map((ch) => client.query(`LISTEN ${ch}`)));

		client.on("notification", (msg) => {
			const fns = channelListeners.get(msg.channel as Channel);
			if (fns) for (const fn of fns) fn();
		});

		activeClient = client;
	} catch (err) {
		if (err instanceof Error) {
			console.error("[listener] connect failed:", err.message);
		} else {
			console.error("[listener] connect failed:", err);
		}
		client.end().catch(() => {});
		scheduleReconnect();
	} finally {
		connecting = false;
	}
}

void connect();

export function subscribe(channel: Channel, fn: () => void): () => void {
	const listeners = channelListeners.get(channel);
	if (!listeners) return () => {};

	listeners.add(fn);
	return () => {
		listeners.delete(fn);
	};
}
