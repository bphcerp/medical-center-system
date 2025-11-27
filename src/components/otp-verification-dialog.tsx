import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CaseDetail } from "@/components/vitals-card";
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";

interface OTPVerificationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onVerify: (otp: string) => Promise<void>;
	onOverride?: (reason: string) => Promise<void>;
	patientName: string;
	isVerifying: boolean;
	error: string | null;
}

export const useOTP = (caseId: string) => {
	const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [otpError, setOtpError] = useState<string | null>(null);
	const otpSentRef = useRef<boolean>(false);
	const [caseRecord, setCaseRecord] = useState<CaseDetail["data"] | null>(null);

	const sendOtp = useCallback(async () => {
		setIsSendingOtp(true);
		setOtpError(null);
		const res = await client.api.patientHistory.otp[":caseId"].send.$post({
			param: { caseId },
		});
		const data = await handleErrors(res);
		if (!data) {
			setOtpError(
				"Failed to send OTP. Please try again, or use emergency override.",
			);
			setIsOtpDialogOpen(true);
			setIsSendingOtp(false);
			return;
		}
		setIsOtpDialogOpen(true);
		setOtpError(null);
	}, [caseId]);

	const checkOtpRequired = useCallback(async () => {
		const consultationRes = await client.api.doctor.consultation[
			":caseId"
		].$get({
			param: { caseId: caseId },
		});
		// Bypass an error toast for 400 status (OTP required)
		if (consultationRes.status === 400) {
			return true;
		}

		const consultation = await handleErrors(consultationRes);
		if (!consultation) {
			return true;
		}
		setCaseRecord(consultation);
		setIsOtpDialogOpen(false);
		setIsVerifying(false);
		return false;
	}, [caseId]);

	// Auto-send OTP when OTP is required (only once)
	useEffect(() => {
		checkOtpRequired().then((otpRequired) => {
			if (!otpRequired) return;
			setIsOtpDialogOpen(true);
			if (!otpSentRef.current && !isSendingOtp) {
				otpSentRef.current = true;
				sendOtp();
			}
		});
	}, [isSendingOtp, sendOtp, checkOtpRequired]);

	const handleVerifyOtp = async (otp: string) => {
		setIsVerifying(true);
		setOtpError(null);
		const response = await client.api.patientHistory.otp[
			":caseId"
		].verify.$post({
			param: { caseId },
			json: { otp: Number(otp) },
		});
		const data = await handleErrors(response);
		if (!data) {
			setOtpError("Failed to verify OTP. Please try again.");
			setIsVerifying(false);
			return;
		}

		setIsOtpDialogOpen(false);
		setCaseRecord(data);
		setIsVerifying(false);
	};

	const handleOverride = async (reason: string) => {
		setOtpError(null);
		const response = await client.api.patientHistory.otp[
			":caseId"
		].override.$post({
			param: { caseId },
			json: { reason },
		});
		const data = await handleErrors(response);
		if (!data) {
			setOtpError("Failed to process override. Please try again.");
			return;
		}

		setIsOtpDialogOpen(false);
		setCaseRecord(data);
	};

	return {
		isOtpDialogOpen,
		setIsOtpDialogOpen,
		isVerifying,
		isSendingOtp,
		otpError,
		caseRecord,
		sendOtp,
		handleVerifyOtp,
		handleOverride,
	};
};

export function OTPVerificationDialog({
	open,
	onOpenChange,
	onVerify,
	onOverride,
	patientName,
	isVerifying,
	error,
}: OTPVerificationDialogProps) {
	const [otp, setOtp] = useState("");
	const [showOverride, setShowOverride] = useState(false);
	const [overrideReason, setOverrideReason] = useState("");
	const [isOverriding, setIsOverriding] = useState(false);
	const otpInputId = useId();
	const reasonInputId = useId();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (otp.length === 6) {
			await onVerify(otp);
		}
	};

	const handleOverride = async (e: React.FormEvent) => {
		e.preventDefault();
		if (overrideReason.length >= 10 && onOverride) {
			setIsOverriding(true);
			await onOverride(overrideReason);
			setIsOverriding(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{showOverride ? "Override OTP Verification" : "Verify OTP"}
					</DialogTitle>
					<DialogDescription>
						{showOverride
							? "You are requesting emergency access. Please provide a detailed reason that will be logged and reviewed by administrators."
							: `An OTP has been sent to ${patientName}'s email. Please enter the 6-digit code to view the patient history.`}
					</DialogDescription>
				</DialogHeader>

				{!showOverride ? (
					<form onSubmit={handleSubmit}>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor={otpInputId}>OTP Code</Label>
								<Input
									id={otpInputId}
									type="text"
									placeholder="Enter 6-digit OTP"
									value={otp}
									onChange={(e) => {
										const value = e.target.value.replace(/\D/g, "");
										if (value.length <= 6) {
											setOtp(value);
										}
									}}
									maxLength={6}
									className="text-center text-lg tracking-widest"
									disabled={isVerifying}
									autoFocus
								/>
							</div>
							{error && <p className="text-sm text-destructive">{error}</p>}
						</div>
						<DialogFooter className="flex-col gap-2 sm:flex-col">
							<Button
								type="submit"
								disabled={otp.length !== 6 || isVerifying}
								className="w-full"
							>
								{isVerifying ? "Verifying..." : "Verify OTP"}
							</Button>
							{onOverride && (
								<Button
									type="button"
									variant="outline"
									onClick={() => setShowOverride(true)}
									className="w-full"
									disabled={isVerifying}
								>
									Emergency Override
								</Button>
							)}
						</DialogFooter>
					</form>
				) : (
					<form onSubmit={handleOverride}>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor={reasonInputId}>Reason for Override</Label>
								<Textarea
									id={reasonInputId}
									placeholder="Provide a detailed reason (minimum 10 characters)..."
									value={overrideReason}
									onChange={(e) => setOverrideReason(e.target.value)}
									rows={4}
									disabled={isOverriding}
									autoFocus
								/>
								<p className="text-xs text-muted-foreground">
									This will be logged and reviewed by administrators.
								</p>
							</div>
							{error && <p className="text-sm text-destructive">{error}</p>}
						</div>
						<DialogFooter className="flex-col gap-2 sm:flex-col">
							<Button
								type="submit"
								variant="destructive"
								disabled={overrideReason.length < 10 || isOverriding}
								className="w-full"
							>
								{isOverriding ? "Processing..." : "Confirm Override"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setShowOverride(false);
									setOverrideReason("");
								}}
								className="w-full"
								disabled={isOverriding}
							>
								Back to OTP Entry
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
