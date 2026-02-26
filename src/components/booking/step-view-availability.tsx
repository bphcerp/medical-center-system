import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";
import type { Doctor } from "./types";

export default function StepViewAvailability({
	categoryId,
	categoryName,
	onSelect,
}: {
	categoryId: number;
	categoryName: string;
	onSelect: (doctor: Doctor, date: Date) => void;
}) {
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

	useEffect(() => {
		(async () => {
			setLoading(true);
			const res =
				await client.api.booking["doctors-by-category"][":categoryId"].$get({
					param: { categoryId: categoryId.toString() },
				});
			const data = await handleErrors(res);
			setDoctors(data ?? []);
			setLoading(false);
		})();
	}, [categoryId]);

	const handleContinue = () => {
		if (selectedDoctor && selectedDate) {
			onSelect(selectedDoctor, selectedDate);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center gap-2 py-12">
				<Spinner />
				<span className="text-muted-foreground">Loading doctors…</span>
			</div>
		);
	}

	if (doctors.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				No doctors found in {categoryName}.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="text-center">
				<Badge variant="secondary" className="text-sm px-4 py-2">
					Category: {categoryName}
				</Badge>
			</div>

			<div className="grid gap-4">
				{doctors.map((doc) => {
					const isSelected = selectedDoctor?.doctorId === doc.doctorId;
					return (
						<Card
							key={doc.doctorId}
							className={`transition-all cursor-pointer ${
								isSelected
									? "ring-2 ring-primary border-primary"
									: "hover:border-primary/40"
							}`}
							onClick={() => {
								setSelectedDoctor(doc);
								setSelectedDate(undefined);
							}}
						>
							<CardContent className="p-4">
								<div className="flex items-start justify-between gap-4">
									<div>
										<h3 className="font-semibold text-base">
											Dr. {doc.doctorName}
										</h3>
										<Badge variant="outline" className="mt-1 capitalize">
											{doc.doctorType}
										</Badge>
									</div>
									{isSelected && (
										<div className="shrink-0 pt-1">
											<Calendar
												mode="single"
												selected={selectedDate}
												onSelect={(date) => setSelectedDate(date ?? undefined)}
												disabled={{ before: new Date() }}
												className="rounded-md border"
											/>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			<Button
				onClick={handleContinue}
				disabled={!selectedDoctor || !selectedDate}
				className="w-full max-w-md mx-auto"
				size="lg"
			>
				View Time Slots
				<ChevronRight className="size-4 ml-1" />
			</Button>
		</div>
	);
}
