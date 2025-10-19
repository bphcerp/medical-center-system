import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	return (
		<div className="h-screen flex flex-col items-center justify-center">
			<Button>Help Yourself</Button>
		</div>
	);
}
