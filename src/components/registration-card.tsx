import { ArrowLeft, ArrowRight, CheckIcon, ScanBarcode } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import type { identifierTypes } from "@/db/case";
import {
	handleErrors,
	type IdResult,
	isBarcodeDetectionAvailable,
	validateIdentifier,
} from "@/lib/utils";
import { client } from "@/routes/api/$";
import { BarcodeScanner } from "./barcode-scanner";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/date-picker";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

type RegistrationType = "student" | "professor" | "visitor";

type RegistrationTypeDetails = {
	[key in RegistrationType]: {
		title: string;
		labelText: string;
		inputHint: string;
		identifierType: (typeof identifierTypes)[number];
	};
};

const registrationTypeDetails: RegistrationTypeDetails = {
	student: {
		title: "Register as a Student",
		labelText: "Student ID",
		inputHint: "e.g. F20230001",
		identifierType: "student_id",
	},
	professor: {
		title: "Register as a Professor / Dependant",
		labelText: "PSRN",
		inputHint: "e.g. H0001",
		identifierType: "psrn",
	},
	visitor: {
		title: "Register as a Visitor",
		labelText: "Phone Number",
		inputHint: "e.g. 1234567890",
		identifierType: "phone",
	},
};

export type RegistrationContext = "patient" | "reception" | "appointment";

export function RegistrationForm({
	setToken,
	onPatientId,
	registrationContext = "patient",
}: {
	setToken?: (token: number) => void;
	onPatientId?: (id: number, name: string) => void;
	registrationContext?: RegistrationContext;
}) {
	// control button focus so that registering is easier
	const submitButtonRef = useRef<HTMLButtonElement>(null);

	const id = useId();
	const nameId = useId();
	const emailId = useId();
	const sexId = useId();

	const [showDetails, setShowDetails] = useState(false);
	const [disableForm, setDisableForm] = useState(false);
	const [showScanner, setShowScanner] = useState(false);

	const [options, setOptions] = useState<
		{ id: number; name: string; birthdate: Date; sex: string }[]
	>([]);
	const [patientId, setPatientId] = useState(-1);
	const [identifier, setIdentifier] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [birthdate, setBirthdate] = useState<Date>(new Date());
	const [sex, setSex] = useState<"male" | "female" | undefined>(undefined);

	const [registrationType, setRegistrationType] =
		useState<RegistrationType | null>(null);

	const resetState = () => {
		setRegistrationType(null);
		setShowDetails(false);
		setDisableForm(false);
		setShowScanner(false);
		setOptions([]);
		setPatientId(-1);
		setIdentifier("");
		setName("");
		setEmail("");
		setBirthdate(new Date());
		setSex(undefined);
	};

	const setVisitor = () => {
		resetState();
		setRegistrationType("visitor");
	};
	const unsetVisitor = () => {
		resetState();
	};

	const handleRegister = async () => {
		if (registrationType === null) return;

		// Appointment booking context: the patient has already been looked up, just return their ID
		if (registrationContext === "appointment") {
			if (patientId === -1) {
				toast.error(
					"Patient not found. Please register them at reception first.",
				);
				return;
			}
			if (onPatientId) {
				onPatientId?.(patientId, name);
				resetState();
			}
			return;
		}

		const identifierType =
			registrationTypeDetails[registrationType].identifierType;

		const res = disableForm
			? await client.api.register.$post({
					json: {
						identifier,
						identifierType,
						patientId,
					},
				})
			: await client.api.visitorRegister.$post({
					json: {
						name,
						email,
						birthdate: `${birthdate.getFullYear()}-${(birthdate.getMonth() + 1)
							.toString()
							.padStart(2, "0")}-${birthdate
							.getDate()
							.toString()
							.padStart(2, "0")}`,
						sex: sex as "male" | "female",
						phone: identifier as string,
					},
				});
		const registered = await handleErrors(res);
		if (res.status === 400) {
			return;
		}
		if (!registered) {
			resetState();
			return;
		}

		setToken?.(registered.token);
		resetState();
	};

	const handleCheckExisting = async (identifier: string) => {
		const identifierValue = identifier.toLowerCase();
		const isProfessorPsrn = /^h\d{4}$/i.test(identifierValue);
		const isStudentHIdentifier = /^h\d{8}$/i.test(identifierValue);

		let type: RegistrationType = "visitor";
		if (registrationType !== "visitor") {
			if (isProfessorPsrn && !isStudentHIdentifier) {
				type = "professor";
			} else {
				type = "student";
			}
		}

		const identifierType = registrationTypeDetails[type].identifierType;

		const res = await client.api.existing.$get({
			query: {
				identifier: identifierValue,
				identifierType,
			},
		});
		const existing = await handleErrors(res);

		// For actual errors, handle them
		if (!existing) {
			resetState();
			return;
		}

		// If existing record not found, proceed to details form
		if (existing.exists === false || "tryVisitorRegistration" in existing) {
			if (
				"tryVisitorRegistration" in existing &&
				existing.tryVisitorRegistration
			) {
				toast.warning(
					"No existing record found. Please register as a visitor temporarily.",
				);
				setVisitor();
			} else {
				setShowDetails(true);
			}
			return;
		}

		setRegistrationType(type);

		setShowDetails(true);
		setDisableForm(true);

		if ("dependents" in existing) {
			if (existing.dependents.length === 0) {
				setPatientId(existing.professor.id);
				setName(existing.professor.name);
				setBirthdate(new Date(existing.professor.birthdate));
				setSex(existing.professor.sex);
				return;
			}
			setOptions(
				[
					{
						id: existing.professor.id,
						name: existing.professor.name,
						birthdate: new Date(existing.professor.birthdate),
						sex: existing.professor.sex,
					},
				].concat(
					existing.dependents.map((d) => ({
						id: d.id,
						name: d.name,
						birthdate: new Date(d.birthdate),
						sex: d.sex,
					})),
				),
			);
			return;
		}

		if (existing.type === "visitor") {
			setEmail(existing.email);
		}

		setPatientId(existing.id);
		setName(existing.name);
		setBirthdate(new Date(existing.birthdate));
		setSex(existing.sex);

		submitButtonRef.current?.focus();
	};

	const handleBarcodeScan = async (scanned: string) => {
		console.log(scanned);
		await handleCheckExisting(scanned);
		setShowScanner(false);
		setIdentifier(scanned);
	};

	const initialRegisterText = showScanner ? "Scan ID Card" : "Register";

	return (
		<form
			action={
				showDetails ? handleRegister : () => handleCheckExisting(identifier)
			}
			className="flex flex-col gap-1"
		>
			{(registrationContext !== "appointment" || showScanner) && (
				<span className="font-semibold text-xl">
					{registrationType === null
						? initialRegisterText
						: registrationTypeDetails[registrationType].title}
				</span>
			)}
			{showScanner ? (
				// Scanner form
				<div className="pt-4">
					<IdScanner onScan={handleBarcodeScan} />
				</div>
			) : (
				// Manually entering form
				<div className="grid gap-3 mt-2">
					<Label htmlFor={id}>
						{registrationType === null
							? "Student ID / PSRN"
							: registrationTypeDetails[registrationType].labelText}
					</Label>
					<div className="flex gap-2">
						<Input
							id={id}
							value={identifier}
							onChange={(e) => setIdentifier(e.target.value)}
							disabled={showDetails}
							name="identifier"
							placeholder={
								registrationType === null
									? "e.g. F20230001 / H0001"
									: registrationTypeDetails[registrationType].inputHint
							}
							required
							autoFocus={!showDetails}
						/>
						{showDetails && (
							<Button size={"lg"} variant={"outline"} onClick={resetState}>
								Change
							</Button>
						)}
					</div>
					{showDetails && (
						<>
							{registrationType === "professor" && options.length > 0 && (
								<>
									<Label htmlFor={nameId}>Select Dependent/Professor</Label>
									<Select
										required
										name="person"
										onValueChange={(v) => {
											const option = JSON.parse(v);
											setPatientId(option.id);
											setName(option.name);
											setBirthdate(option.birthdate);
											setSex(option.sex);
										}}
									>
										<SelectTrigger className="w-full border-ring">
											<SelectValue placeholder="Select Dependent/Professor" />
										</SelectTrigger>
										<SelectContent>
											{options.map((option) => (
												<SelectItem
													key={`${option.id}|${option.name}|${option.birthdate}|${option.sex}`}
													value={JSON.stringify(option)}
												>{`${option.name} | ${option.birthdate} | ${option.sex}`}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</>
							)}
							<Label htmlFor={nameId}>Name</Label>
							<Input
								disabled={disableForm}
								id={nameId}
								name="name"
								placeholder="Full Name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
							{registrationType === "visitor" && (
								<>
									<Label htmlFor={emailId}>Email</Label>
									<Input
										disabled={disableForm}
										id={emailId}
										name="email"
										placeholder="Email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
									/>
								</>
							)}
							<DatePicker
								disabled={disableForm}
								onChange={(date) => date && setBirthdate(date)}
								value={birthdate}
							/>
							<Label htmlFor={sexId}>Sex</Label>
							<Select
								required
								name="sex"
								disabled={disableForm}
								value={sex}
								onValueChange={(v) => setSex(v as "male" | "female")}
							>
								<SelectTrigger id={sexId}>
									<SelectValue placeholder="Sex" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="male">Male</SelectItem>
									<SelectItem value="female">Female</SelectItem>
								</SelectContent>
							</Select>
						</>
					)}
				</div>
			)}
			<div className="pt-4 flex flex-col items-stretch w-full gap-4">
				{!showScanner &&
					(registrationContext === "appointment" ? (
						<Button type="submit" ref={submitButtonRef}>
							Continue <ArrowRight />
						</Button>
					) : (
						<Button
							ref={submitButtonRef}
							type="submit"
							size="lg"
							className="text-lg"
						>
							{showDetails ? "Register" : "Continue"}
							{showDetails ? (
								<CheckIcon className="size-5" />
							) : (
								<ArrowRight className="size-5" />
							)}
						</Button>
					))}
				{isBarcodeDetectionAvailable() &&
					!showDetails &&
					registrationType !== "visitor" && (
						<Button
							variant="outline"
							type="button"
							onClick={() => setShowScanner((val) => !val)}
							size="lg"
							className="text-lg"
						>
							{showScanner ? (
								<>
									<ArrowLeft /> Enter Manually
								</>
							) : (
								<>
									Scan ID Card
									<ScanBarcode className="size-5" />
								</>
							)}
						</Button>
					)}
				{!showDetails && (
					<Button
						variant="link"
						type="button"
						onClick={registrationType === "visitor" ? unsetVisitor : setVisitor}
						className="px-0 self-start"
					>
						{registrationContext === "patient"
							? registrationType === "visitor"
								? "I am not a visitor"
								: "I am a visitor"
							: registrationType === "visitor"
								? "Patient is not a visitor"
								: "Patient is a visitor"}
					</Button>
				)}
			</div>
		</form>
	);
}

type IdScannerProps = {
	onScan: (scannedId: string) => void;
};

function IdScanner({ onScan }: IdScannerProps) {
	const [text, setText] = useState<string | null>(null);

	const handleScan = (scanned: IdResult) => {
		setText(
			scanned.type === "student_id" ? scanned.split.join(" ") : scanned.code,
		);
		onScan(scanned.code);
	};

	if (text === null) {
		return (
			<BarcodeScanner
				validateResult={validateIdentifier}
				onScanSuccess={handleScan}
			/>
		);
	}

	return (
		<div className="flex items-center justify-center gap-2">
			<p className="text-xl text-center font-semibold animate-pulse">{text}</p>
		</div>
	);
}
