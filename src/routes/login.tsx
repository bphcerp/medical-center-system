import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId } from "react";
import { toast } from "sonner";
import { LoginErrors } from "src/lib/types/api";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import useAuth from "@/lib/hooks/useAuth";
import { handleErrors } from "@/lib/utils";
import Logo from "@/styles/logo.svg";
import { client } from "./api/$";

const loginSchema = z.object({
	error: z.enum(LoginErrors).optional(),
});

export const Route = createFileRoute("/login")({
	component: Login,
	validateSearch: loginSchema,
});

function Login() {
	const usernameId = useId();
	const passwordId = useId();
	const navigate = useNavigate();
	const { allowedRoutes } = useAuth();

	const { error } = Route.useSearch();

	useEffect(() => {
		if (error === "email_not_found") {
			toast.error("No account found with this email.");
		} else if (error) {
			toast.error(`Could not sign in with Google: ${error}`);
		}
	}, [error]);

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

	const handleGoogleLogin = () => {
		window.location.assign("/api/oauth/google/start");
	};

	return (
		<div className="w-full flex flex-col items-center pt-8 lg:pt-24">
			<div className="w-full items-center flex flex-col gap-8 pb-8">
				<img src={Logo} alt="BITS Pilani Logo" className="size-36" />
				<span className="text-2xl font-semibold">Medical Center System</span>
			</div>
			<form className="w-full md:w-1/3 px-6" action={handleLogin}>
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
						<Field>
							<Button
								type="button"
								variant="secondary"
								onClick={handleGoogleLogin}
							>
								Continue with Google
							</Button>
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
