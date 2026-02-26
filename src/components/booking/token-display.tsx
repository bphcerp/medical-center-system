import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function TokenDisplay({
	tokenNumber,
	onReset,
}: { tokenNumber: number; onReset: () => void }) {
	const [showButton, setShowButton] = useState(false);

	useEffect(() => {
		const t1 = setTimeout(() => setShowButton(true), 3000);
		const t2 = setTimeout(onReset, 15_000);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
		};
	}, [onReset]);

	return (
		<div className="flex flex-col items-center pt-32 gap-8">
			<span className="italic text-muted-foreground">
				Appointment confirmed! Your token number is
			</span>
			<h1 className="text-9xl font-medium">{tokenNumber}</h1>
			{showButton && (
				<Button variant="outline" size="lg" onClick={onReset}>
					Book Another
				</Button>
			)}
		</div>
	);
}
