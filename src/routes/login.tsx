import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import useAuth from "@/lib/hooks/useAuth";
import { handleErrors } from "@/lib/utils";
import Logo from "@/styles/logo.svg";
import { client } from "./api/$";

export const Route = createFileRoute("/login")({
	component: Login,
});

function Login() {
	const usernameId = useId();
	const passwordId = useId();
	const navigate = useNavigate();
	const { allowedRoutes } = useAuth();
	if (allowedRoutes.length > 0) {
		navigate({ to: "/" });
		return null;
	}

	const handleLogin = async (formData: FormData) => {
		const username = formData.get("username");
		const password = formData.get("password");
		if (username === null || password === null) return;
		const res = await client.api.login.$post({
			json: {
				username: username as string,
				password: password as string,
			},
		});
		const data = await handleErrors(res);
		if (!data) return;
		navigate({
			to: "/",
		});
	};

	return (
		<div className="w-full flex flex-col items-center pt-24">
			<div className="w-full items-center flex flex-col gap-8 pb-8">
				<img src={Logo} alt="BITS Pilani Logo" className="size-36" />
				<span className="text-2xl font-semibold">Medical Center System</span>
			</div>
			<form className="w-full md:w-1/3 mx-6" action={handleLogin}>
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
			<Link
				to="/about"
				className="mt-4 text-sm underline text-muted-foreground"
			>
				About
			</Link>
		</div>
	);
}
