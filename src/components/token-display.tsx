import { useEffect, useState } from "react";
import { Button } from "./ui/button";

const TOKEN_DISPLAY_DURATION_MS = 15_000;

export function TokenDisplay({
	label,
	token,
	buttonText,
	onReset,
}: {
	label?: string;
	token: number;
	buttonText?: string;
	onReset: () => void;
}) {
	const [showHomeButton, setShowHomeButton] = useState(false);

	useEffect(() => {
		const timer1 = setTimeout(() => setShowHomeButton(true), 3000);
		const timer2 = setTimeout(onReset, TOKEN_DISPLAY_DURATION_MS);

		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
		};
	}, [onReset]);

	return (
		<div className="flex flex-col items-center pt-32 gap-8">
			<span className="italic">{label || "Your token number is"}</span>
			<h1 className="text-9xl font-medium">{token}</h1>
			{showHomeButton && (
				<Button variant="outline" size="lg" onClick={onReset} autoFocus>
					{buttonText || "Go home"}
				</Button>
			)}
		</div>
	);
}
