import { useState } from "react";
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

interface OTPVerificationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onVerify: (otp: string) => Promise<void>;
	onOverride?: (reason: string) => Promise<void>;
	patientName: string;
	isVerifying: boolean;
	error: string | null;
}

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
			try {
				await onOverride(overrideReason);
			} finally {
				setIsOverriding(false);
			}
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
								<Label htmlFor="otp">OTP Code</Label>
								<Input
									id="otp"
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
								<Label htmlFor="reason">Reason for Override</Label>
								<Textarea
									id="reason"
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
