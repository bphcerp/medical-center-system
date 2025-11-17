import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
	const usernameId = useId();
	const passwordId = useId();
	const navigate = useNavigate();

	const handleLogin = async (formData: FormData) => {
		const username = formData.get("username");
		const password = formData.get("password");
		if (username === null || password === null) return;
		const res = await (
			await client.api.login.$post({
				json: {
					username: username as string,
					password: password as string,
				},
			})
		).json();

		if ("error" in res) {
			alert(res.error);
		}
		navigate({
			to: "/",
		});
	};

	return (
		<div className="h-screen w-full flex justify-center">
			<form className="w-full md:w-1/3 pt-48 mx-6" action={handleLogin}>
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
