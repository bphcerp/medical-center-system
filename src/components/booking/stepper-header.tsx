import { Check } from "lucide-react";

const STEPS = [
	"Select Specialist Category",
	"View Doctor Availability",
	"Book Appointment",
] as const;

export default function StepperHeader({
	currentStep,
	onGoToStep,
}: { currentStep: number; onGoToStep: (step: number) => void }) {
	return (
		<div className="flex items-center justify-center gap-2 mb-8">
			{STEPS.map((label, i) => {
				const step = i + 1;
				const isCompleted = currentStep > step;
				const isCurrent = currentStep === step;
				return (
					<div key={label} className="flex items-center gap-2">
						{i > 0 && (
							<div
								className={`h-0.5 w-12 transition-colors ${
									isCompleted ? "bg-primary" : "bg-border"
								}`}
							/>
						)}
						<button
							type="button"
							disabled={!isCompleted}
							onClick={() => isCompleted && onGoToStep(step)}
							className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
								isCurrent
									? "bg-primary text-primary-foreground shadow-sm"
									: isCompleted
										? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
										: "bg-muted text-muted-foreground"
							}`}
						>
							{isCompleted ? (
								<Check className="size-3.5" />
							) : (
								<span className="size-5 flex items-center justify-center rounded-full bg-current/10 text-xs">
									{step}
								</span>
							)}
							<span className="hidden sm:inline">{label}</span>
						</button>
					</div>
				);
			})}
		</div>
	);
}
