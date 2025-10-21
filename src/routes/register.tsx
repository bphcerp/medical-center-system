import { createFileRoute } from "@tanstack/react-router";
import { useId } from "react";
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
) => {
	const id = useId();
	const handleRegister = async (formData: FormData) => {
		const identifier = formData.get(identifierType);
		if (identifier === null) return;
		const res = await client.api.register.$post({
			json: {
				identifier: identifier as string,
				identifierType: identifierType,
			},
		});
		if (res.status !== 200) {
			alert(res.body);
		}
		const json = await res.json();
		alert(
			`Your token number is ${json.token}. Note it down as you will use this number later.`,
		);
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
								name={identifierType}
								placeholder={inputHint}
								required
							/>
						</div>
					</CardContent>
					<CardFooter className="pt-4 flex w-full justify-end">
						<Button type="submit">Continue</Button>
					</CardFooter>
				</form>
			</Card>
		</TabsContent>
	);
};

function Register() {
	return (
		<div className="flex w-full gap-6 justify-center pt-48">
			<div className="w-1/3 flex flex-col">
				<Tabs defaultValue="student">
					<TabsList>
						<TabsTrigger value="student">Student</TabsTrigger>
						<TabsTrigger value="prof">Professor/Dependent</TabsTrigger>
						<TabsTrigger value="visitor">Visitor</TabsTrigger>
					</TabsList>
					{RegistrationCard(
						"student_id",
						"student",
						"Student",
						"Student ID",
						"e.g. 2024A1PS0001H",
					)}
					{RegistrationCard(
						"psrn",
						"prof",
						"Professor/Dependent",
						"Professor PSRN",
						"e.g. H0001",
					)}
					{RegistrationCard(
						"phone",
						"visitor",
						"Visitor",
						"Phone No.",
						"e.g. 1234567890",
					)}
				</Tabs>
			</div>
		</div>
	);
}
