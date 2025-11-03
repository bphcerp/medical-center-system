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
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { client } from "./api/$";

export const Route = createFileRoute("/register")({
	component: Register,
});

const TOKEN_DISPLAY_DURATION_MS = 30_000;

type RegistrationType = "student" | "prof" | "visitor";

type RegistrationCardProps = {
	identifierType: (typeof identifierTypes)[number];
	registrationType: RegistrationType;
	title: string;
	labelText: string;
	inputHint: string;
	setSelectedTab: React.Dispatch<React.SetStateAction<RegistrationType | null>>;
	setToken: (token: number) => void;
};

function RegistrationCard({
	identifierType,
	registrationType,
	title,
	labelText,
	inputHint,
	setSelectedTab,
	setToken,
}: RegistrationCardProps) {
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

	const resetState = () => {
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

	const resetTab = () => setSelectedTab(null);

	const handleRegister = async () => {
		const res = disableForm
			? await client.api.register.$post({
					json: {
						identifier: identifier as string,
						identifierType: identifierType,
						patientId: patientId,
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
			resetTab();
			return;
		}
		const data = await res.json();
		setToken(data.token);
		resetState();
		resetTab();
	};

	const handleCheckExisting = async () => {
		if (identifier === "") return;
		const res = await client.api.existing.$get({
			query: {
				identifier,
				identifierType: identifierType,
			},
		});
		if (res.status === 400) {
			alert(
				"No existing record found. Please register as a visitor temporarily.",
			);
			setSelectedTab("visitor");
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
		<div className="flex flex-col gap-2">
			<Button className="self-start" variant="ghost" onClick={resetTab}>
				<ArrowLeft />
				Back
			</Button>
			<Card>
				<form action={showDetails ? handleRegister : handleCheckExisting}>
					<CardHeader>
						<CardTitle className="text-xl">{title}</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-6 mt-2">
						<div className="grid gap-3">
							<Label htmlFor={id}>{labelText}</Label>
							<div className="flex gap-2">
								<Input
									id={id}
									value={identifier}
									onChange={(e) => setIdentifier(e.target.value)}
									disabled={showDetails}
									name={identifierType}
									placeholder={inputHint}
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
									{registrationType === "prof" && options.length > 0 && (
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
					<CardFooter className="pt-4 flex w-full justify-end">
						<Button type="submit" size="lg">
							{showDetails ? "Register" : "Continue"}
							{showDetails ? <CheckIcon /> : <ArrowRight />}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
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

function RegistrationTypeButton({
	// icon,
	title,
	...props
}: {
	// icon: React.ReactNode;
	title: string;
} & React.ComponentProps<"button">) {
	return (
		<Button
			variant="card"
			className="w-1/3 h-90 px-10 text-3xl whitespace-break-spaces rounded-lg"
			{...props}
		>
			{title}
		</Button>
	);
}

function RegistrationTypeSelector({
	setSelected,
}: {
	setSelected: React.Dispatch<React.SetStateAction<RegistrationType | null>>;
}) {
	return (
		<div className="gap-10 flex md:w-3/5 justify-center">
			<RegistrationTypeButton
				title="Student"
				onClick={() => setSelected("student")}
			/>
			<RegistrationTypeButton
				title={"Professor / Dependant"}
				onClick={() => setSelected("prof")}
			/>
			<RegistrationTypeButton
				title="Visitor"
				onClick={() => setSelected("visitor")}
			/>
		</div>
	);
}

function Register() {
	const [selectedTab, setSelectedTab] = useState<RegistrationType | null>(null);

	const [token, setToken] = useState<number | null>(null);

	const handleToken = (token: number) => {
		setToken(token);
	};
	const handleResetTab = () => {
		setToken(null);
		setSelectedTab(null);
	};

	return (
		<div className="flex w-full gap-6 justify-center pt-48">
			{token !== null ? (
				<TokenDisplay token={token} resetTab={handleResetTab} />
			) : selectedTab === null ? (
				<RegistrationTypeSelector setSelected={setSelectedTab} />
			) : (
				<div className="w-1/3 flex flex-col">
					{selectedTab === "student" && (
						<RegistrationCard
							identifierType="student_id"
							registrationType="student"
							title="Student"
							labelText="Student ID"
							inputHint="e.g. 2024A1PS0001H"
							setSelectedTab={setSelectedTab}
							setToken={handleToken}
						/>
					)}
					{selectedTab === "prof" && (
						<RegistrationCard
							identifierType="psrn"
							registrationType="prof"
							title="Professor/Dependent"
							labelText="PSRN"
							inputHint="e.g. H0001"
							setSelectedTab={setSelectedTab}
							setToken={handleToken}
						/>
					)}
					{selectedTab === "visitor" && (
						<RegistrationCard
							identifierType="phone"
							registrationType="visitor"
							title="Visitor"
							labelText="Phone No."
							inputHint="e.g. 1234567890"
							setSelectedTab={setSelectedTab}
							setToken={handleToken}
						/>
					)}
				</div>
			)}
		</div>
	);
}
