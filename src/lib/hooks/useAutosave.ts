import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DiagnosisItem } from "@/components/diagnosis-card";
import type { PrescriptionItem } from "@/components/prescription/types";
import type { TestItem } from "@/components/tests-card";
import type { CaseDetail } from "@/components/vitals-card";
import { client } from "@/routes/api/$";
import { handleErrors } from "../utils";
import { useDebounce } from "./useDebounce";

type AutosaveState = {
	consultationNotes: string;
	diagnosis: DiagnosisItem[];
	prescriptions: PrescriptionItem[];
	tests: TestItem[];
};

export const useAutosave = ({
	id,
	diagnosesFromCase,
	caseDetail,
	prescriptions,
	tests,
}: {
	id: string;
	diagnosesFromCase: DiagnosisItem[];
	caseDetail: CaseDetail["data"]["caseDetail"] | null;
	prescriptions: PrescriptionItem[];
	tests: TestItem[];
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
	const [testItems, setTestItems] = useState(tests || []);

	const [autosaved, setAutoSaved] = useState<boolean>(false);
	const [autosaveError, setAutosaveError] = useState<string | null>(null);
	const debouncedConsultationNotes = useDebounce(consultationNotes, 500);
	const debouncedPrescriptionItems = useDebounce(prescriptionItems, 500);
	const prevAutosaveRef = useRef<AutosaveState | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const autosave = useCallback(async () => {
		// Don't spam the API if a save is already in progress
		if (isSaving) {
			return;
		}
		setIsSaving(true);

		if (
			prevAutosaveRef.current &&
			prevAutosaveRef.current.consultationNotes ===
				debouncedConsultationNotes &&
			prevAutosaveRef.current.diagnosis.length === diagnosisItems.length &&
			prevAutosaveRef.current.diagnosis.every(
				(d, i) => d.id === diagnosisItems[i]?.id,
			) &&
			prevAutosaveRef.current.tests.length === testItems.length &&
			prevAutosaveRef.current.tests.every(
				(d, i) => d.id === testItems[i]?.id,
			) &&
			JSON.stringify(prevAutosaveRef.current.prescriptions) ===
				JSON.stringify(debouncedPrescriptionItems)
		) {
			// No changes since last autosave
			setIsSaving(false);
			return;
		}

		setAutoSaved(false);
		setAutosaveError(null);

		const res = await client.api.doctor.autosave.$post({
			json: {
				caseId: Number(id),
				consultationNotes: debouncedConsultationNotes,
				diagnosis: diagnosisItems.map((d) => d.id),
				prescriptions: debouncedPrescriptionItems.map((item) => ({
					...item.case_prescriptions,
					caseId: Number(id),
					medicineId: item.medicines.id,
				})),
				tests: testItems.map((d) => d.id),
			},
		});
		setIsSaving(false);
		const data = await handleErrors(res);
		if (!data) {
			setAutosaveError("Failed to save");
			setAutoSaved(false);
			return;
		}

		setAutoSaved(true);
		prevAutosaveRef.current = {
			consultationNotes: debouncedConsultationNotes,
			diagnosis: diagnosisItems,
			prescriptions: debouncedPrescriptionItems,
			tests: testItems,
		};
	}, [
		id,
		diagnosisItems,
		debouncedConsultationNotes,
		debouncedPrescriptionItems,
		testItems,
		isSaving,
	]);

	useEffect(() => {
		autosave().catch((e) => {
			toast.warning("Autosave failed");
			console.error("Autosave failed", e);
		});
		const interval = setInterval(() => {
			autosave().catch((e) => {
				toast.warning("Autosave failed");
				console.error("Autosave failed", e);
			});
		}, 3000);
		return () => clearInterval(interval);
	}, [autosave]);

	return {
		consultationNotes,
		diagnosisItems,
		prescriptionItems,
		testItems,
		setConsultationNotes,
		setDiagnosisItems,
		setPrescriptionItems,
		setTestItems,
		autosaved,
		autosaveError,
		autosave,
	};
};
