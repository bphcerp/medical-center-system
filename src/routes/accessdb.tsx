import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, DatabaseZap, Lock, Timer } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import TopBar from "@/components/topbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import useAuth from "@/lib/hooks/useAuth";
import { client } from "./api/$";

export const Route = createFileRoute("/accessdb")({
	component: AccessDbPage,
});

type DbAccessStatus = {
	configured: boolean;
	configurationIssues: string[];
	heartbeatIntervalSeconds: number;
	sessionTtlSeconds: number;
	maxDurationMinutes: number;
	session: {
		active: boolean;
		canAccessPgweb: boolean;
		initiatorName: string | null;
		initiatorEmail: string | null;
		reason: string | null;
		startedAt: string | null;
		expiresAt: string | null;
		hardExpiresAt: string | null;
		viewerCount: number;
	};
};

type DbAccessApiPayload<T> =
	| { success: true; data: T }
	| { success: false; error: { message: string } };

const formatRemaining = (valueMs: number) => {
	if (valueMs <= 0) {
		return "expired";
	}

	const totalSeconds = Math.floor(valueMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatDateTime = (value: string | null) => {
	if (!value) {
		return "-";
	}

	return new Date(value).toLocaleString();
};

const getDbAccessClientId = () => {
	const existing = window.sessionStorage.getItem("db-access-client-id");
	if (existing) {
		return existing;
	}

	const created = crypto.randomUUID();
	window.sessionStorage.setItem("db-access-client-id", created);
	return created;
};

function AccessDbPage() {
	useAuth();

	const navigate = useNavigate();
	const code1Id = useId();
	const code2Id = useId();
	const code3Id = useId();
	const reasonId = useId();

	const [status, setStatus] = useState<DbAccessStatus | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const [now, setNow] = useState(Date.now());
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setIsLoading(true);
			setLoadError(null);

			try {
				const response = await client.api.dbAccess.status.$get();
				const payload =
					(await response.json()) as DbAccessApiPayload<DbAccessStatus>;

				if (!payload.success) {
					if (!cancelled) {
						setLoadError(payload.error.message);
					}
					toast.error(payload.error.message);
					if ((response.status as number) === 403) {
						navigate({ to: "/" });
					}
					return;
				}

				if (!cancelled) {
					setStatus(payload.data);
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Could not load database access status";
				if (!cancelled) {
					setLoadError(message);
				}
				toast.error(message);
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, [navigate]);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setNow(Date.now());
		}, 1000);

		return () => {
			window.clearInterval(interval);
		};
	}, []);

	useEffect(() => {
		if (!status?.session.active || !status.session.canAccessPgweb) {
			return;
		}

		const clientId = getDbAccessClientId();
		const heartbeat = async () => {
			const response = await client.api.dbAccess.heartbeat.$post({
				json: { clientId },
			});
			const payload =
				(await response.json()) as DbAccessApiPayload<DbAccessStatus>;

			if (!payload.success) {
				toast.error(payload.error.message);
				setStatus((current) =>
					current
						? {
								...current,
								session: {
									...current.session,
									active: false,
									canAccessPgweb: false,
								},
							}
						: current,
				);
				return;
			}

			setStatus(payload.data);
		};

		void heartbeat();
		const interval = window.setInterval(
			() => void heartbeat(),
			status.heartbeatIntervalSeconds * 1000,
		);

		const disconnect = () => {
			const body = new Blob([JSON.stringify({ clientId })], {
				type: "application/json",
			});
			navigator.sendBeacon("/api/dbAccess/disconnect", body);
		};

		window.addEventListener("pagehide", disconnect);

		return () => {
			window.clearInterval(interval);
			window.removeEventListener("pagehide", disconnect);
		};
	}, [
		status?.heartbeatIntervalSeconds,
		status?.session.active,
		status?.session.canAccessPgweb,
	]);

	// const inactivityRemaining = useMemo(() => {
	// 	if (!status?.session.expiresAt) {
	// 		return null;
	// 	}
	//
	// 	return formatRemaining(new Date(status.session.expiresAt).getTime() - now);
	// }, [now, status?.session.expiresAt]);

	const hardExpiryRemaining = useMemo(() => {
		if (!status?.session.hardExpiresAt) {
			return null;
		}

		return formatRemaining(
			new Date(status.session.hardExpiresAt).getTime() - now,
		);
	}, [now, status?.session.hardExpiresAt]);

	const handleValidate = async (formData: FormData) => {
		setIsSubmitting(true);

		try {
			const codes: [string, string, string] = [
				String(formData.get("code1") ?? ""),
				String(formData.get("code2") ?? ""),
				String(formData.get("code3") ?? ""),
			];
			const reason = String(formData.get("reason") ?? "").trim();

			const response = await client.api.dbAccess.validate.$post({
				json: { codes, reason },
			});
			const payload =
				(await response.json()) as DbAccessApiPayload<DbAccessStatus>;

			if (!payload.success) {
				toast.error(payload.error.message);
				return;
			}

			toast.success("Database access opened.");
			setStatus(payload.data);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCloseSession = async () => {
		setIsClosing(true);
		try {
			const response = await client.api.dbAccess.close.$post();
			const payload =
				(await response.json()) as DbAccessApiPayload<DbAccessStatus>;
			if (!payload.success) {
				toast.error(payload.error.message);
				return;
			}

			toast.success("Database access closed.");
			setStatus(payload.data);
		} finally {
			setIsClosing(false);
		}
	};

	if (isLoading || !status) {
		return (
			<>
				<TopBar title="Database Access" />
				<div className="h-after-topbar flex items-center justify-center">
					{isLoading ? (
						<div className="flex items-center gap-3 text-muted-foreground">
							<Spinner className="size-5" />
							<span>Checking database access status...</span>
						</div>
					) : (
						<Alert variant="destructive" className="max-w-xl">
							<AlertTriangle className="size-4" />
							<AlertTitle>Could Not Load</AlertTitle>
							<AlertDescription>
								{loadError ?? "Database access status could not be loaded."}
							</AlertDescription>
						</Alert>
					)}
				</div>
			</>
		);
	}

	return (
		<>
			<TopBar title="Database Access" />
			<div className="container mx-auto px-6 py-6 space-y-6">
				{!status.configured && (
					<Alert variant="destructive">
						<AlertTriangle className="size-4" />
						<AlertTitle>Setup Needed</AlertTitle>
						<AlertDescription>
							<div>This page is not fully set up yet.</div>
							{status.configurationIssues.map((issue) => (
								<div key={issue}>{issue}</div>
							))}
						</AlertDescription>
					</Alert>
				)}

				{status.configured && !status.session.active && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Lock className="size-5" />
								Open Database Access
							</CardTitle>
						</CardHeader>
						<CardContent>
							<form action={handleValidate} className="space-y-6">
								<FieldSet>
									<FieldGroup>
										<Field>
											<FieldLabel htmlFor={code1Id}>Code 1</FieldLabel>
											<Input
												id={code1Id}
												type="text"
												inputMode="numeric"
												name="code1"
												pattern="\d{6}"
												maxLength={6}
												placeholder="000000"
												required
												className="text-center tracking-[0.35em] text-2xl h-16"
												onInput={(event) => {
													event.currentTarget.value =
														event.currentTarget.value.replace(/\D/g, "");
												}}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={code2Id}>Code 2</FieldLabel>
											<Input
												id={code2Id}
												type="text"
												inputMode="numeric"
												name="code2"
												pattern="\d{6}"
												maxLength={6}
												placeholder="000000"
												required
												className="text-center tracking-[0.35em] text-2xl h-16"
												onInput={(event) => {
													event.currentTarget.value =
														event.currentTarget.value.replace(/\D/g, "");
												}}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={code3Id}>Code 3</FieldLabel>
											<Input
												id={code3Id}
												type="text"
												inputMode="numeric"
												name="code3"
												pattern="\d{6}"
												maxLength={6}
												placeholder="000000"
												required
												className="text-center tracking-[0.35em] text-2xl h-16"
												onInput={(event) => {
													event.currentTarget.value =
														event.currentTarget.value.replace(/\D/g, "");
												}}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={reasonId}>Reason</FieldLabel>
											<Textarea
												id={reasonId}
												name="reason"
												minLength={10}
												maxLength={2048}
												placeholder="Add a short reason for this access."
												required
											/>
											<FieldDescription>
												This note will be saved in the log.
											</FieldDescription>
										</Field>
									</FieldGroup>
								</FieldSet>
								<div className="flex justify-end">
									<Button type="submit" disabled={isSubmitting}>
										{isSubmitting ? "Checking..." : "Open Access"}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				)}

				{status.configured &&
					status.session.active &&
					!status.session.canAccessPgweb && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<DatabaseZap className="size-5" />
									Access In Use
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm">
								<p>Database access is already open in another browser.</p>
								<p>
									Started by: <strong>{status.session.initiatorName}</strong>
									{status.session.initiatorEmail
										? ` (${status.session.initiatorEmail})`
										: ""}
								</p>
								{status.session.reason && (
									<p>
										Reason: <strong>{status.session.reason}</strong>
									</p>
								)}
								<div className="flex gap-6 text-muted-foreground">
									<span>
										Started: {formatDateTime(status.session.startedAt)}
									</span>
									<span>Ends in: {hardExpiryRemaining}</span>
								</div>
							</CardContent>
						</Card>
					)}

				{status.configured &&
					status.session.active &&
					status.session.canAccessPgweb && (
						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Timer className="size-5" />
										Current Session
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid gap-4 md:grid-cols-3">
										<div className="rounded-lg border p-4">
											<div className="text-sm text-muted-foreground">
												Initiated By
											</div>
											<div className="font-medium">
												{status.session.initiatorName}
											</div>
										</div>
										<div className="rounded-lg border p-4">
											<div className="text-sm text-muted-foreground">
												Started
											</div>
											<div className="font-medium">
												{formatDateTime(status.session.startedAt)}
											</div>
										</div>
										<div className="rounded-lg border p-4">
											<div className="text-sm text-muted-foreground">
												Ends In
											</div>
											<div className="font-medium">{hardExpiryRemaining}</div>
										</div>
									</div>

									<div className="flex justify-between items-center gap-4">
										<div className="text-sm text-muted-foreground">
											Reason: {status.session.reason}
										</div>
										<Button
											variant="destructive"
											onClick={() => void handleCloseSession()}
											disabled={isClosing}
										>
											{isClosing ? "Closing..." : "Close Access"}
										</Button>
									</div>
								</CardContent>
							</Card>

							<Card className="overflow-hidden">
								<CardContent className="p-0">
									<iframe
										title="Database Access"
										src="/api/dbAccess/proxy/"
										className="w-full min-h-[70vh] border-0"
									/>
								</CardContent>
							</Card>
						</div>
					)}
			</div>
		</>
	);
}
