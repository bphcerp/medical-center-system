import {
	ArrowRight,
	CheckIcon,
	ScanBarcode,
	TextCursorInput,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import type { identifierTypes } from "@/db/case";
import { handleErrors, isBarcodeDetectionAvailable } from "@/lib/utils";
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
		inputHint: "e.g. 2024A1PS0001H",
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

export function RegistrationForm({
	setToken,
	isPatientRegistering = true,
}: {
	setToken: (token: number) => void;
	isPatientRegistering?: boolean;
}) {
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

		setToken(registered.token);
		resetState();
	};

	const handleCheckExisting = async (id?: string) => {
		const identifierValue = (id ?? identifier).toLowerCase();
		let type: RegistrationType;
		if (registrationType !== "visitor") {
			if (identifierValue.startsWith("h")) {
				type = "professor";
			} else {
				type = "student";
			}
		} else {
			type = registrationType;
		}
		setRegistrationType(type);

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
		return;
	};

	const handleBarcodeScan = (scanned: string) => {
		const studentIdPattern = /^F20\d{6}H$/;

		if (studentIdPattern.test(scanned)) {
			const withoutH = scanned.slice(0, -1);
			const extractedId = withoutH.charAt(0).toLowerCase() + withoutH.slice(1);
			setIdentifier(extractedId);
			setShowScanner(false);

			setTimeout(() => {
				handleCheckExisting(extractedId);
			}, 100);
		} else {
			toast.error("Invalid student ID format. Expected format: F20yyxxxxH");
		}
	};

	const initialRegisterText = showScanner ? "Scan ID Card" : "Register";

	return (
		<form
			action={showDetails ? handleRegister : () => handleCheckExisting()}
			className="flex flex-col gap-1"
		>
			<span className="font-semibold text-xl">
				{registrationType === null
					? initialRegisterText
					: registrationTypeDetails[registrationType].title}
			</span>
			{showScanner ? (
				// Scanner form
				<BarcodeScanner onScan={handleBarcodeScan} />
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
							autoFocus
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
				{!showScanner && (
					<Button type="submit" size="lg" className="text-lg">
						{showDetails ? "Register" : "Continue"}
						{showDetails ? (
							<CheckIcon className="size-5" />
						) : (
							<ArrowRight className="size-5" />
						)}
					</Button>
				)}
				{isBarcodeDetectionAvailable() &&
					!showDetails &&
					registrationType !== "visitor" && (
						<Button
							variant="outline"
							type="button"
							onClick={() => setShowScanner((show) => !show)}
							size="lg"
							className="text-lg"
						>
							{showScanner ? (
								<>
									Enter Manually <TextCursorInput className="size-5" />
								</>
							) : (
								<>
									Scan ID Card
									<ScanBarcode className="size-5" />
								</>
							)}
						</Button>
					)}
				{!showDetails && !showScanner && (
					<Button
						variant="link"
						type="button"
						onClick={registrationType === "visitor" ? unsetVisitor : setVisitor}
						className="px-0 self-start"
					>
						{isPatientRegistering
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
