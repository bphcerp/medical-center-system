import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { identifierTypes } from "@/db/case";
import { client } from "./api/$";

export const Route = createFileRoute("/register")({
	component: Register,
});

const TOKEN_DISPLAY_DURATION_MS = 30_000;

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

function RegistrationCard({ setToken }: { setToken: (token: number) => void }) {
	const id = useId();
	const nameId = useId();
	const emailId = useId();
	const ageId = useId();
	const sexId = useId();

	const [showDetails, setShowDetails] = useState(false);
	const [disableForm, setDisableForm] = useState(false);

	const [options, setOptions] = useState<
		{ id: number; name: string; age: number; sex: string }[]
	>([]);
	const [patientId, setPatientId] = useState(-1);
	const [identifier, setIdentifier] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [age, setAge] = useState(0);
	const [sex, setSex] = useState<"male" | "female" | undefined>(undefined);

	const [registrationType, setRegistrationType] =
		useState<RegistrationType | null>(null);

	const resetState = () => {
		setRegistrationType(null);
		setShowDetails(false);
		setDisableForm(false);
		setOptions([]);
		setPatientId(-1);
		setIdentifier("");
		setName("");
		setEmail("");
		setAge(0);
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
						age,
						sex: sex as "male" | "female",
						phone: identifier as string,
					},
				});
		if (res.status !== 200) {
			alert("Error registering. Please report this to the front desk.");
			resetState();
			return;
		}
		const data = await res.json();
		setToken(data.token);
		resetState();
	};

	const handleCheckExisting = async () => {
		let type: RegistrationType;
		if (registrationType !== "visitor") {
			if (identifier.startsWith("H")) {
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
				identifier,
				identifierType,
			},
		});
		if (res.status === 400) {
			alert(
				"No existing record found. Please register as a visitor temporarily.",
			);
			setVisitor();
			return;
		}
		if (res.status !== 200 && res.status !== 404) {
			alert("Error registering. Please report this to the front desk.");
			resetState();
			return;
		}

		setShowDetails(true);
		const data = await res.json();
		if (!data.exists) {
			return;
		}

		setDisableForm(true);
		if ("dependents" in data) {
			setOptions(
				[
					{
						id: data.professor.id,
						name: data.professor.name,
						age: data.professor.age,
						sex: data.professor.sex,
					},
				].concat(
					data.dependents.map((d) => ({
						id: d.id,
						name: d.name,
						age: d.age,
						sex: d.sex,
					})),
				),
			);
			return;
		}

		setPatientId(data.id);
		setName(data.name);
		setAge(data.age);
		setSex(data.sex);
		return;
	};

	return (
		<Card>
			<form
				action={showDetails ? handleRegister : handleCheckExisting}
				className="flex flex-col gap-1"
			>
				<CardHeader>
					<CardTitle className="text-xl">
						{registrationType === null
							? "Register"
							: registrationTypeDetails[registrationType].title}
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-6 mt-2">
					<div className="grid gap-3">
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
										? "e.g. 2024A1PS0001H / H0001"
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
												setAge(option.age);
												setSex(option.sex);
											}}
										>
											<SelectTrigger className="w-full border-ring">
												<SelectValue placeholder="Select Dependent/Professor" />
											</SelectTrigger>
											<SelectContent>
												{options.map((option) => (
													<SelectItem
														key={`${option.id}|${option.name}|${option.age}|${option.sex}`}
														value={JSON.stringify(option)}
													>{`${option.name} | ${option.age} | ${option.sex}`}</SelectItem>
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
								<Label htmlFor={ageId}>Age</Label>
								<Input
									disabled={disableForm}
									id={ageId}
									name="age"
									placeholder="Age"
									type="number"
									value={age}
									onChange={(e) => setAge(parseInt(e.target.value, 10))}
									required
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
				</CardContent>
				<CardFooter className="pt-4 flex w-full">
					{!showDetails && (
						<Button
							variant="link"
							type="button"
							onClick={
								registrationType === "visitor" ? unsetVisitor : setVisitor
							}
							className="px-0"
						>
							{registrationType === "visitor"
								? "I am not a visitor"
								: "I am a visitor"}
						</Button>
					)}
					<div className="grow" />
					<Button type="submit" size="lg" className="text-lg">
						{showDetails ? "Register" : "Continue"}
						{showDetails ? (
							<CheckIcon className="size-5" />
						) : (
							<ArrowRight className="size-5" />
						)}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}

function TokenDisplay({
	token,
	resetTab,
}: {
	token: number;
	resetTab: () => void;
}) {
	const [showHomeButton, setShowHomeButton] = useState(false);

	useEffect(() => {
		const timer1 = setTimeout(() => setShowHomeButton(true), 3000);
		const timer2 = setTimeout(resetTab, TOKEN_DISPLAY_DURATION_MS);

		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
		};
	}, [resetTab]);

	return (
		<div className="flex flex-col items-center pt-32 gap-8">
			<span className="italic">Your token number is</span>
			<h1 className="text-9xl font-medium">{token}</h1>
			{showHomeButton && (
				<Button variant="outline" size="lg" onClick={resetTab}>
					Go home
				</Button>
			)}
		</div>
	);
}

function Register() {
	const [token, setToken] = useState<number | null>(null);

	const handleToken = (token: number) => {
		setToken(token);
	};
	const handleResetTab = () => {
		setToken(null);
	};

	return (
		<div className="flex w-full gap-6 justify-center pt-48">
			{token !== null ? (
				<TokenDisplay token={token} resetTab={handleResetTab} />
			) : (
				<div className="w-1/3 flex flex-col">
					<RegistrationCard setToken={handleToken} />
				</div>
			)}
		</div>
	);
}
