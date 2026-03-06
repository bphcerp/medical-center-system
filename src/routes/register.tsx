import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RegistrationForm } from "@/components/registration-card";
import { TokenDisplay } from "@/components/token-display";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/register")({
	component: Register,
});

function Register() {
	const [token, setToken] = useState<number | null>(null);

	const handleToken = (token: number) => {
		setToken(token);
	};
	const handleResetPage = () => {
		setToken(null);
	};

	return (
		<div className="flex w-full gap-6 justify-center pt-48">
			{token !== null ? (
				<TokenDisplay token={token} onReset={handleResetPage} />
			) : (
				<Card className="m-4 w-full sm:w-1/2 lg:w-1/3 px-6">
					<RegistrationForm setToken={handleToken} />
				</Card>
			)}
		</div>
	);
}
