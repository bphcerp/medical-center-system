import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import LandingButtons from "@/components/booking/landing-buttons";
import StepBookAppointment from "@/components/booking/step-book-appointment";
import StepSelectCategory from "@/components/booking/step-select-category";
import StepViewAvailability from "@/components/booking/step-view-availability";
import StepperHeader from "@/components/booking/stepper-header";
import TokenDisplay from "@/components/booking/token-display";
import type { BookingState, Category, Doctor } from "@/components/booking/types";
import { INITIAL_STATE } from "@/components/booking/types";
import TopBar from "@/components/topbar";
import useAuth from "@/lib/hooks/useAuth";
import { handleErrors } from "@/lib/utils";
import { client } from "./api/$";

export const Route = createFileRoute("/booking")({
	component: BookingPage,
	staticData: {
		requiredPermissions: ["admin"],
		icon: CalendarDays,
		name: "Appointment Booking",
	},
});

function BookingPage() {
	useAuth(["admin"]);
	const { navigate } = useRouter();

	const [mode, setMode] = useState<"landing" | "scheduling" | "done">(
		"landing",
	);
	const [state, setState] = useState<BookingState>(INITIAL_STATE);
	const [categories, setCategories] = useState<Category[]>([]);
	const [tokenNumber, setTokenNumber] = useState<number | null>(null);

	// get categories once when entering scheduling mode
	useEffect(() => {
		if (mode !== "scheduling") return;
		(async () => {
			const res = await client.api.booking.categories.$get();
			const data = await handleErrors(res);
			setCategories(data ?? []);
		})();
	}, [mode]);

	const handleReset = () => {
		setState(INITIAL_STATE);
		setTokenNumber(null);
		setMode("landing");
	};

	const handleCategorySelect = (cat: Category) => {
		setState((s) => ({
			...s,
			step: 2,
			categoryId: cat.id,
			categoryName: cat.name,
		}));
	};

	const handleDoctorDateSelect = (doctor: Doctor, date: Date) => {
		setState((s) => ({ ...s, step: 3, doctor, date }));
	};

	const handleBooked = (token: number) => {
		setTokenNumber(token);
		setMode("done");
	};

	const goToStep = (step: number) => {
		setState((s) => ({ ...s, step }));
	};

	return (
		<>
			<TopBar title="Appointment Booking" />
			<div className="container mx-auto p-6 max-w-3xl">
				{mode === "landing" && (
					<LandingButtons
						onWalkIn={() => navigate({ to: "/register" })}
						onSchedule={() => setMode("scheduling")}
					/>
				)}

				{mode === "scheduling" && (
					<>
						<StepperHeader
							currentStep={state.step}
							onGoToStep={goToStep}
						/>

						{state.step === 1 && (
							<StepSelectCategory
								categories={categories}
								onSelect={handleCategorySelect}
							/>
						)}

						{state.step === 2 && state.categoryId && (
							<StepViewAvailability
								categoryId={state.categoryId}
								categoryName={state.categoryName}
								onSelect={handleDoctorDateSelect}
							/>
						)}

						{state.step === 3 &&
							state.doctor &&
							state.date &&
							state.categoryId && (
								<StepBookAppointment
									categoryId={state.categoryId}
									categoryName={state.categoryName}
									doctor={state.doctor}
									date={state.date}
									onEditCategory={() => goToStep(1)}
									onEditDoctor={() => goToStep(2)}
									onEditDate={() => goToStep(2)}
									onBooked={handleBooked}
								/>
							)}
					</>
				)}

				{mode === "done" && tokenNumber !== null && (
					<TokenDisplay tokenNumber={tokenNumber} onReset={handleReset} />
				)}
			</div>
		</>
	);
}
