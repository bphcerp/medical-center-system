import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DiagnosisItem } from "src/components/consultation/diagnosis-section";
import type { TestItem } from "src/components/consultation/tests-section";
import type { CaseDetail } from "src/components/vitals-list";
import type { PrescriptionItem } from "@/components/consultation/prescription/types";
import { client } from "@/routes/api/$";
import { handleErrors } from "../utils";
import { useDebounce } from "./useDebounce";

type AutosaveState = {
	consultationNotes: string;
	chiefComplaints: string;
	clinicalRemarks: string;
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
	const [chiefComplaints, setChiefComplaints] = useState<string>(
		caseDetail?.cases.chiefComplaints || "",
	);
	const [clinicalRemarks, setClinicalRemarks] = useState<string>(
		caseDetail?.cases.clinicalRemarks || "",
	);
	const [prescriptionItems, setPrescriptionItems] = useState(
		prescriptions || [],
	);
	const [testItems, setTestItems] = useState(tests || []);

	const [autosaved, setAutoSaved] = useState<boolean>(false);
	const [autosaveError, setAutosaveError] = useState<string | null>(null);
	const debouncedConsultationNotes = useDebounce(consultationNotes, 500);
	const debouncedChiefComplaints = useDebounce(chiefComplaints, 500);
	const debouncedClinicalRemarks = useDebounce(clinicalRemarks, 500);
	const debouncedPrescriptionItems = useDebounce(prescriptionItems, 500);
	const latestAutosaveRef = useRef({
		consultationNotes,
		chiefComplaints,
		clinicalRemarks,
		prescriptionItems,
	});
	const prevAutosaveRef = useRef<AutosaveState | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	useEffect(() => {
		latestAutosaveRef.current = {
			consultationNotes,
			chiefComplaints,
			clinicalRemarks,
			prescriptionItems,
		};
	}, [consultationNotes, chiefComplaints, clinicalRemarks, prescriptionItems]);

	const autosave = useCallback(
		async (immediate = false) => {
			const next = immediate
				? latestAutosaveRef.current
				: {
						consultationNotes: debouncedConsultationNotes,
						chiefComplaints: debouncedChiefComplaints,
						clinicalRemarks: debouncedClinicalRemarks,
						prescriptionItems: debouncedPrescriptionItems,
					};

			// Don't spam the API if a save is already in progress
			if (isSaving && !immediate) {
				return;
			}
			setIsSaving(true);

			if (
				prevAutosaveRef.current &&
				prevAutosaveRef.current.consultationNotes === next.consultationNotes &&
				prevAutosaveRef.current.chiefComplaints === next.chiefComplaints &&
				prevAutosaveRef.current.clinicalRemarks === next.clinicalRemarks &&
				prevAutosaveRef.current.diagnosis.length === diagnosisItems.length &&
				prevAutosaveRef.current.diagnosis.every(
					(d, i) => d.id === diagnosisItems[i]?.id,
				) &&
				prevAutosaveRef.current.tests.length === testItems.length &&
				prevAutosaveRef.current.tests.every(
					(d, i) => d.id === testItems[i]?.id,
				) &&
				JSON.stringify(prevAutosaveRef.current.prescriptions) ===
					JSON.stringify(next.prescriptionItems)
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
					consultationNotes: next.consultationNotes,
					chiefComplaints: next.chiefComplaints,
					clinicalRemarks: next.clinicalRemarks,
					diagnosis: diagnosisItems.map((d) => d.id),
					prescriptions: next.prescriptionItems.map((item) => ({
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
				consultationNotes: next.consultationNotes,
				chiefComplaints: next.chiefComplaints,
				clinicalRemarks: next.clinicalRemarks,
				diagnosis: diagnosisItems,
				prescriptions: next.prescriptionItems,
				tests: testItems,
			};
		},
		[
			id,
			diagnosisItems,
			debouncedChiefComplaints,
			debouncedClinicalRemarks,
			debouncedConsultationNotes,
			debouncedPrescriptionItems,
			testItems,
			isSaving,
		],
	);

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
		chiefComplaints,
		clinicalRemarks,
		diagnosisItems,
		prescriptionItems,
		testItems,
		setConsultationNotes,
		setChiefComplaints,
		setClinicalRemarks,
		setDiagnosisItems,
		setPrescriptionItems,
		setTestItems,
		autosaved,
		autosaveError,
		isSaving,
		autosave,
	};
};
