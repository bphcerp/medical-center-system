import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { Doctor } from "src/api/admin";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "../ui/field";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import type { Speciality } from "./types";

const ALL_SPECIALITIES = "__all__";

export default function StepSelectDoctor({
	specialities,
	allDoctors,
	onSelect,
}: {
	specialities: Speciality[];
	allDoctors: Doctor[];
	onSelect: (doctor: Doctor) => void;
}) {
	const [selectedSpecialityId, setSelectedSpecialityId] =
		useState<string>(ALL_SPECIALITIES);
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

	const visibleDoctors = useMemo(() => {
		if (selectedSpecialityId !== ALL_SPECIALITIES) {
			return allDoctors.filter(
				(d) => d.specialityId === parseInt(selectedSpecialityId, 10),
			);
		}
		return allDoctors;
	}, [selectedSpecialityId, allDoctors]);

	const handleSubmit = (formData: FormData) => {
		const doctorId = Number(formData.get("doctorId"));
		const doctor = allDoctors.find((d) => d.id === doctorId);
		if (doctor) onSelect(doctor);
	};

	return (
		<form action={handleSubmit} className="flex flex-col gap-6 p-2">
			<Select
				value={selectedSpecialityId}
				onValueChange={(v) => {
					setSelectedSpecialityId(v);
					setSelectedDoctorId("");
				}}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="All Specializations" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_SPECIALITIES}>All Specializations</SelectItem>
					{specialities.map((s) => (
						<SelectItem key={s.id} value={s.id.toString()}>
							{s.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{visibleDoctors.length === 0 ? (
				<p className="text-center text-muted-foreground py-8">
					No doctors found for this specialization.
				</p>
			) : (
				<RadioGroup
					name="doctorId"
					className="grid gap-2"
					value={selectedDoctorId}
					onValueChange={setSelectedDoctorId}
				>
					{visibleDoctors.map((doc) => (
						<FieldLabel key={doc.id} className="cursor-pointer">
							<Field orientation="horizontal" className="py-4!">
								<FieldContent>
									<FieldTitle className="text-base/tight">
										{doc.name}
									</FieldTitle>
									<FieldDescription className="text-sm/tight">
										{doc.specialityName}{" "}
										<span className="capitalize">({doc.availabilityType})</span>
									</FieldDescription>
								</FieldContent>
								<RadioGroupItem value={doc.id.toString()} />
							</Field>
						</FieldLabel>
					))}
				</RadioGroup>
			)}

			<Button
				type="submit"
				disabled={!selectedDoctorId}
				className="w-fit self-end"
			>
				Continue <ArrowRight />
			</Button>
		</form>
	);
}
