import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RegistrationForm } from "@/components/registration-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/register")({
	component: Register,
});

const TOKEN_DISPLAY_DURATION_MS = 30_000;

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
				<Card className="m-4 w-full sm:w-1/2 lg:w-1/3 px-6">
					<RegistrationForm setToken={handleToken} />
				</Card>
			)}
		</div>
	);
}
