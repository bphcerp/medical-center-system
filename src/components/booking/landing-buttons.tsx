import { CalendarDays, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingButtons({
	onWalkIn,
	onSchedule,
}: { onWalkIn: () => void; onSchedule: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-6 pt-32 max-w-md mx-auto px-4">
			<Button
				size="lg"
				variant="outline"
				className="w-full h-20 text-lg"
				onClick={onWalkIn}
			>
				<UserPlus className="size-6 mr-3" />
				Walk-In Patient
			</Button>
			<Button
				size="lg"
				className="w-full h-20 text-lg"
				onClick={onSchedule}
			>
				<CalendarDays className="size-6 mr-3" />
				Schedule Appointment
			</Button>
		</div>
	);
}
