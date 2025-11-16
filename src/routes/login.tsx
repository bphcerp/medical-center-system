import { createFileRoute, redirect } from "@tanstack/react-router";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/contexts/auth";
import { client } from "./api/$";

export const Route = createFileRoute("/login")({
	loader: async () => {
		const res = await client.api.user.$get();
		if (res.status === 200) {
			throw redirect({
				to: "/",
			});
		}
	},
	component: Login,
});

function Login() {
	const auth = useAuth();
	const usernameId = useId();
	const passwordId = useId();

	const handleLogin = async (formData: FormData) => {
		const username = formData.get("username");
		const password = formData.get("password");
		if (username === null || password === null) return;

		await auth.logIn(username as string, password as string);
	};

	return (
		<div className="h-screen w-full flex justify-center">
			<form className="w-1/3 pt-48" action={handleLogin}>
				<FieldSet>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor={usernameId}>Username</FieldLabel>
							<Input
								id={usernameId}
								type="text"
								placeholder="Username"
								name="username"
								required
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={passwordId}>Password</FieldLabel>
							<Input
								id={passwordId}
								type="password"
								placeholder="Password"
								name="password"
								required
							/>
						</Field>
						<Field>
							<Button type="submit">Login</Button>
						</Field>
					</FieldGroup>
				</FieldSet>
			</form>
		</div>
	);
}
