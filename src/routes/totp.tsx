import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { handleErrors } from "@/lib/utils";
import Logo from "@/styles/logo.svg";
import { client } from "./api/$";

export const Route = createFileRoute("/totp")({
	component: TotpVerify,
});

function TotpVerify() {
	const code1Id = useId();
	const code2Id = useId();
	const code3Id = useId();

	const navigate = useNavigate();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [status, setStatus] = useState<"idle" | "valid" | "error">("idle");

	const handleVerification = async (formData: FormData) => {
		setIsSubmitting(true);
		setStatus("idle");

		const codes: [string, string, string] = [
			formData.get("code1") as string,
			formData.get("code2") as string,
			formData.get("code3") as string,
		];

		// Frontend check: ensure all 3 boxes have exactly 6 numbers
		if (codes.some((c) => !c || !/^\d{6}$/.test(c))) {
			setIsSubmitting(false);
			return;
		}

		try {
			const res = await client.api.totp.validate.$post({
				json: { codes },
			});
			const data = await handleErrors(res);

			// Check if the request failed OR if the API explicitly returned valid: false
			if (!data || !data.valid) {
				setStatus("error");
				setIsSubmitting(false);
				return;
			}

			setStatus("valid");
			setIsSubmitting(false);

			// Redirect after a brief moment to show success
			setTimeout(() => {
				window.location.href = `http://${window.location.hostname}:12500`;
			}, 3000);
		} catch (e) {
			console.error("Verification error ", e);
			setStatus("error");
			setIsSubmitting(false);
		}
	};

	return (
		<div className="w-full flex flex-col items-center pt-8 lg:pt-24">
			<div className="w-full items-center flex flex-col gap-8 pb-8">
				<img src={Logo} alt="Medical Center Logo" className="size-36" />
				<span className="text-2xl font-semibold">Security Verification</span>
			</div>

			<div className="w-full md:w-1/3 px-6">
				{status === "idle" && (
					<form action={handleVerification}>
						<FieldSet>
							<FieldGroup>
								<Field>
									<Input
										id={code1Id}
										type="text"
										inputMode="numeric"
										onInput={(e) => {
											e.currentTarget.value = e.currentTarget.value.replace(
												/\D/g,
												"",
											);
										}}
										pattern="\d{6}"
										maxLength={6}
										placeholder="000000"
										name="code1"
										required
										className="text-center tracking-widest text-3xl h-20"
									/>
								</Field>

								<Field>
									<Input
										id={code2Id}
										type="text"
										inputMode="numeric"
										onInput={(e) => {
											e.currentTarget.value = e.currentTarget.value.replace(
												/\D/g,
												"",
											);
										}}
										pattern="\d{6}"
										maxLength={6}
										placeholder="000000"
										name="code2"
										required
										className="text-center tracking-widest text-3xl h-20"
									/>
								</Field>

								<Field>
									<Input
										id={code3Id}
										type="text"
										inputMode="numeric"
										onInput={(e) => {
											e.currentTarget.value = e.currentTarget.value.replace(
												/\D/g,
												"",
											);
										}}
										pattern="\d{6}"
										maxLength={6}
										placeholder="000000"
										name="code3"
										required
										className="text-center tracking-widest text-3xl h-20"
									/>
								</Field>

								<Field>
									<Button
										type="submit"
										size="lg"
										disabled={isSubmitting}
										className="w-full mt-4"
									>
										{isSubmitting ? "Verifying..." : "Verify Identity"}
									</Button>
								</Field>
							</FieldGroup>
						</FieldSet>
					</form>
				)}

				{status === "valid" && (
					<Card>
						<CardContent className="pt-6">
							<Empty>
								<EmptyHeader>
									<EmptyMedia
										variant="icon"
										className="bg-green-100 text-green-600"
									>
										<CheckCircle2 className="size-8" />
									</EmptyMedia>
									<EmptyTitle>Verification Successful</EmptyTitle>
									<EmptyDescription>
										<p>Your identity has been verified. Redirecting...</p>
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						</CardContent>
					</Card>
				)}

				{status === "error" && (
					<Card>
						<CardContent className="pt-6">
							<Empty>
								<EmptyHeader>
									<EmptyMedia
										variant="icon"
										className="bg-red-100 text-destructive"
									>
										<AlertTriangle className="size-8" />
									</EmptyMedia>
									<EmptyTitle>Verification Failed</EmptyTitle>
									<EmptyDescription>
										<p>The tokens provided were invalid or expired.</p>
									</EmptyDescription>
								</EmptyHeader>
								<div className="mt-6 flex justify-center">
									<Button onClick={() => setStatus("idle")} variant="outline">
										Try Again
									</Button>
								</div>
							</Empty>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
