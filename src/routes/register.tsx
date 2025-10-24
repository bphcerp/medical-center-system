import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { identifierTypes } from "@/db/case";
import { client } from "./api/$";

export const Route = createFileRoute("/register")({
	component: Register,
});

const RegistrationCard = (
	identifierType: (typeof identifierTypes)[number],
	key: string,
	title: string,
	labelText: string,
	inputHint: string,
	setSelectedTab: React.Dispatch<
		React.SetStateAction<"student" | "prof" | "visitor">
	>,
) => {
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
		setAge(-1);
		setSex(undefined);
		setSelectedTab("student");
	};

	const handleRegister = async () => {
		if (!showDetails) {
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
		}

		// TODO: Test the flow for:
		// 1. Student existing
		// 2. Professor/Dependent existing
		// 3. Visitor existing

		// 4. New Visitor [Done]
		// 5. Student new (should redirect to new visitor flow) [Done]
		// 6. Professor/Dependent new (should redirect to new visitor flow) [Done]

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
			return;
		}
		const data = await res.json();
		alert(`Registration successful! Your token is: ${data.token}`);
		resetState();
	};

	return (
		<TabsContent value={key}>
			<Card>
				<form action={handleRegister}>
					<CardHeader>
						<CardTitle>{title}</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-6">
						<div className="grid gap-3">
							<Label htmlFor={id}>{labelText}</Label>
							<Input
								id={id}
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								disabled={showDetails}
								name={identifierType}
								placeholder={inputHint}
								required
							/>
							{showDetails && (
								<>
									{key === "prof" && options.length > 0 && (
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
												<SelectTrigger>
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
									{key === "visitor" && (
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
						<Button type="submit">
							{showDetails ? "Register" : "Continue"}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</TabsContent>
	);
};

function Register() {
	const [selectedTab, setSelectedTab] = useState<
		"student" | "prof" | "visitor"
	>("student");
	return (
		<div className="flex w-full gap-6 justify-center pt-48">
			<div className="w-1/3 flex flex-col">
				<Tabs value={selectedTab}>
					<TabsList>
						<TabsTrigger
							value="student"
							onClick={() => setSelectedTab("student")}
						>
							Student
						</TabsTrigger>
						<TabsTrigger value="prof" onClick={() => setSelectedTab("prof")}>
							Professor/Dependent
						</TabsTrigger>
						<TabsTrigger
							value="visitor"
							onClick={() => setSelectedTab("visitor")}
						>
							Visitor
						</TabsTrigger>
					</TabsList>
					{RegistrationCard(
						"student_id",
						"student",
						"Student",
						"Student ID",
						"e.g. 2024A1PS0001H",
						setSelectedTab,
					)}
					{RegistrationCard(
						"psrn",
						"prof",
						"Professor/Dependent",
						"Professor PSRN",
						"e.g. H0001",
						setSelectedTab,
					)}
					{RegistrationCard(
						"phone",
						"visitor",
						"Visitor",
						"Phone No.",
						"e.g. 1234567890",
						setSelectedTab,
					)}
				</Tabs>
			</div>
		</div>
	);
}
