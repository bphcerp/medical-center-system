import { useCallback, useEffect, useRef, useState } from "react";
import type { DiagnosisItem } from "@/components/diagnosis-card";
import type { PrescriptionItem } from "@/components/prescription/types";
import type { CaseDetail } from "@/components/vitals-card";
import { client } from "@/routes/api/$";
import { useDebounce } from "./useDebounce";

type AutosaveState = {
	consultationNotes: string;
	diagnosis: DiagnosisItem[];
	prescriptions: PrescriptionItem[];
};

export const useAutosave = ({
	id,
	diagnosesFromCase,
	caseDetail,
	prescriptions,
}: {
	id: string;
	diagnosesFromCase: DiagnosisItem[];
	caseDetail: CaseDetail["caseDetail"] | null;
	prescriptions: PrescriptionItem[];
}) => {
	const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>(
		diagnosesFromCase || [],
	);
	const [consultationNotes, setConsultationNotes] = useState<string>(
		caseDetail?.cases.consultationNotes || "",
	);
	const [prescriptionItems, setPrescriptionItems] = useState(
		prescriptions || [],
	);

	const [autosaved, setAutoSaved] = useState<boolean>(false);
	const [autosaveError, setAutosaveError] = useState<string | null>(null);
	const debouncedConsultationNotes = useDebounce(consultationNotes, 500);
	const debouncedPrescriptionItems = useDebounce(prescriptionItems, 500);
	const prevAutosaveRef = useRef<AutosaveState | null>(null);

	const autosave = useCallback(async () => {
		if (
			prevAutosaveRef.current &&
			prevAutosaveRef.current.consultationNotes ===
				debouncedConsultationNotes &&
			prevAutosaveRef.current.diagnosis.length === diagnosisItems.length &&
			prevAutosaveRef.current.diagnosis.every(
				(d, i) => d.id === diagnosisItems[i]?.id,
			) &&
			JSON.stringify(prevAutosaveRef.current.prescriptions) ===
				JSON.stringify(debouncedPrescriptionItems)
		) {
			// No changes since last autosave
			return;
		}
		setAutoSaved(false);
		setAutosaveError(null);
		try {
			await client.api.doctor.autosave.$post({
				json: {
					caseId: Number(id),
					consultationNotes: debouncedConsultationNotes,
					diagnosis: diagnosisItems.map((d) => d.id),
					prescriptions: debouncedPrescriptionItems.map((item) => ({
						...item.case_prescriptions,
						caseId: Number(id),
						medicineId: item.medicines.id,
					})),
				},
			});
		} catch (error) {
			setAutosaveError("Failed to save");
			setAutoSaved(false);
			console.error("Autosave failed:", error);
			throw error;
		}
		setAutoSaved(true);
		prevAutosaveRef.current = {
			consultationNotes: debouncedConsultationNotes,
			diagnosis: diagnosisItems,
			prescriptions: debouncedPrescriptionItems,
		};
	}, [
		id,
		diagnosisItems,
		debouncedConsultationNotes,
		debouncedPrescriptionItems,
	]);

	useEffect(() => {
		autosave().catch(() => {
			console.error("Autosave failed");
		});
		const interval = setInterval(() => {
			autosave().catch(() => {
				console.error("Autosave failed");
			});
		}, 3000);
		return () => clearInterval(interval);
	}, [autosave]);

	return {
		consultationNotes,
		diagnosisItems,
		prescriptionItems,
		setConsultationNotes,
		setDiagnosisItems,
		setPrescriptionItems,
		autosaved,
		autosaveError,
		autosave,
	};
};
