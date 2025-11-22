import { and, eq, inArray } from "drizzle-orm";
import z from "zod";
import { usersTable } from "@/db/auth";
import { casesTable } from "@/db/case";
import { filesTable } from "@/db/files";
import {
	caseLabReportsTable,
	labTestFilesTable,
	labTestsMasterTable,
	statusEnums,
} from "@/db/lab";
import { patientsTable } from "@/db/patient";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { getAge } from "@/lib/utils";
import { uploadFileService } from "./files";
import { db } from "./index";
import { rbacCheck } from "./rbac";

const testUpdateSchema = z.object({
	labTestReportId: z.number().int(),
	status: z.enum(statusEnums),
	fileId: z.number().int().optional(),
});

const batchUpdateSchema = z.object({
	tests: z.array(testUpdateSchema),
});

const lab = createStrictHono()
	.use(rbacCheck({ permissions: ["lab"] }))
	.get("/pending", async (c) => {
		const pendingReports = await db
			.select({
				caseId: caseLabReportsTable.caseId,
				testId: caseLabReportsTable.testId,
				status: caseLabReportsTable.status,
				updatedAt: caseLabReportsTable.updatedAt,
				labTestReportId: caseLabReportsTable.id,
				token: casesTable.token,
				patientId: casesTable.patient,
				associatedUsers: casesTable.associatedUsers,
				testName: labTestsMasterTable.name,
			})
			.from(caseLabReportsTable)
			.innerJoin(
				labTestsMasterTable,
				eq(caseLabReportsTable.testId, labTestsMasterTable.id),
			)
			.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
			.where(inArray(caseLabReportsTable.status, statusEnums.slice(0, 2)));

		if (pendingReports.length === 0) {
			return c.json({ success: true, data: [] });
		}

		const patientIds = Array.from(
			new Set(pendingReports.map((r) => r.patientId)),
		);
		const doctorIds = Array.from(
			new Set(
				pendingReports
					.map((r) => r.associatedUsers.at(0))
					.filter((id): id is number => typeof id === "number"),
			),
		);

		const patients =
			patientIds.length > 0
				? await db
						.select({ id: patientsTable.id, name: patientsTable.name })
						.from(patientsTable)
						.where(inArray(patientsTable.id, patientIds))
				: [];

		const doctors =
			doctorIds.length > 0
				? await db
						.select({ id: usersTable.id, name: usersTable.name })
						.from(usersTable)
						.where(inArray(usersTable.id, doctorIds))
				: [];

		const patientMap = new Map(patients.map((p) => [p.id, p.name]));
		const doctorMap = new Map(doctors.map((d) => [d.id, d.name]));

		const reports = pendingReports.map((report) => ({
			labTestReportId: report.labTestReportId,
			caseId: report.caseId,
			token: report.token,
			testName: report.testName,
			status: report.status,
			patientName: patientMap.get(report.patientId) ?? "Unknown Patient",
			doctorName:
				(report.associatedUsers.at(0) != null
					? doctorMap.get(report.associatedUsers.at(0) ?? 0)
					: null) ?? "Unknown Doctor",
		}));
		return c.json({ success: true, data: reports });
	})
	.get(
		"/details/:caseId",
		strictValidator("param", z.object({ caseId: z.coerce.number().int() })),
		async (c) => {
			const { caseId } = c.req.valid("param");

			const [caseDetail] = await db
				.select({
					caseId: casesTable.id,
					patientId: casesTable.patient,
					associatedUsers: casesTable.associatedUsers,
					token: casesTable.token,
				})
				.from(casesTable)
				.where(eq(casesTable.id, caseId));

			if (!caseDetail) {
				return c.json(
					{ success: false, error: { message: "Case not found" } },
					404,
				);
			}

			const tests = await db
				.select({
					labTestReportId: caseLabReportsTable.id,
					testId: caseLabReportsTable.testId,
					testName: labTestsMasterTable.name,
					status: caseLabReportsTable.status,
					metadata: caseLabReportsTable.metadata,
				})
				.from(caseLabReportsTable)
				.innerJoin(
					labTestsMasterTable,
					eq(caseLabReportsTable.testId, labTestsMasterTable.id),
				)
				.where(eq(caseLabReportsTable.caseId, caseId));

			const labTestReportIds = tests.map((t) => t.labTestReportId);
			const fileLinks =
				labTestReportIds.length > 0
					? await db
							.select({
								labTestReportId: labTestFilesTable.caseLabReportId,
								fileId: labTestFilesTable.fileId,
							})
							.from(labTestFilesTable)
							.where(
								inArray(labTestFilesTable.caseLabReportId, labTestReportIds),
							)
					: [];

			const fileMap = new Map(
				fileLinks.map((f) => [f.labTestReportId, f.fileId]),
			);

			const [patient] = await db
				.select({
					name: patientsTable.name,
					birthdate: patientsTable.birthdate,
					sex: patientsTable.sex,
					type: patientsTable.type,
				})
				.from(patientsTable)
				.where(eq(patientsTable.id, caseDetail.patientId));

			const primaryDoctorId = caseDetail.associatedUsers.at(0);
			const [doctor] =
				primaryDoctorId != null
					? await db
							.select({ name: usersTable.name })
							.from(usersTable)
							.where(eq(usersTable.id, primaryDoctorId))
					: [];

			const testsWithFiles = tests.map((test) => ({
				labTestReportId: test.labTestReportId,
				testId: test.testId,
				testName: test.testName,
				status: test.status,
				metadata: test.metadata,
				fileId: fileMap.get(test.labTestReportId) ?? null,
			}));

			return c.json({
				success: true,
				data: {
					caseId,
					token: caseDetail.token,
					patient: {
						...patient,
						age: getAge(patient.birthdate),
					},
					doctorName: doctor?.name ?? "Unknown Doctor",
					tests: testsWithFiles,
				},
			});
		},
	)
	.post(
		"/update-tests/:caseId",
		strictValidator("param", z.object({ caseId: z.coerce.number().int() })),
		strictValidator("json", batchUpdateSchema),
		async (c) => {
			const { caseId } = c.req.valid("param");
			const { tests } = c.req.valid("json");

			try {
				await db.transaction(async (tx) => {
					const caseTests = await tx
						.select({ id: caseLabReportsTable.id })
						.from(caseLabReportsTable)
						.where(eq(caseLabReportsTable.caseId, caseId));

					const validIds = new Set(caseTests.map((t) => t.id));
					const allValid = tests.every((t) => validIds.has(t.labTestReportId));

					if (!allValid) {
						throw new Error("Some test IDs do not belong to this case");
					}

					const [caseData] = await tx
						.select({ associatedUsers: casesTable.associatedUsers })
						.from(casesTable)
						.where(eq(casesTable.id, caseId));

					if (!caseData) {
						throw new Error("Case not found");
					}

					for (const test of tests) {
						await tx
							.update(caseLabReportsTable)
							.set({
								status: test.status,
								updatedAt: new Date(),
							})
							.where(eq(caseLabReportsTable.id, test.labTestReportId));

						if (test.fileId) {
							const [file] = await tx
								.select({ id: filesTable.id })
								.from(filesTable)
								.where(eq(filesTable.id, test.fileId));

							if (!file) {
								throw new Error(`File ${test.fileId} not found`);
							}

							const [existing] = await tx
								.select()
								.from(labTestFilesTable)
								.where(
									and(
										eq(labTestFilesTable.caseLabReportId, test.labTestReportId),
										eq(labTestFilesTable.fileId, test.fileId),
									),
								);

							if (!existing) {
								await tx.insert(labTestFilesTable).values({
									caseLabReportId: test.labTestReportId,
									fileId: test.fileId,
								});

								await tx
									.update(filesTable)
									.set({ allowed: caseData.associatedUsers })
									.where(eq(filesTable.id, test.fileId));
							}
						}
					}
				});

				return c.json({
					success: true,
					data: {
						message: "Tests updated successfully",
					},
				});
			} catch (error) {
				console.error("Batch update error:", error);
				return c.json(
					{
						success: false,
						error: {
							message: error instanceof Error ? error.message : "Update failed",
							details: {
								caseId,
								tests,
								error: error,
							},
						},
					},
					400,
				);
			}
		},
	)

	.post(
		"/upload-file",
		strictValidator(
			"form",
			z.object({
				file: z.instanceof(File),
				labTestReportId: z.coerce.number().int(),
			}),
		),
		async (c) => {
			const { file, labTestReportId } = c.req.valid("form");

			try {
				const [report] = await db
					.select({ associatedUsers: casesTable.associatedUsers })
					.from(caseLabReportsTable)
					.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
					.where(eq(caseLabReportsTable.id, labTestReportId));

				if (!report) {
					return c.json(
						{ success: false, error: { message: "Lab test report not found" } },
						404,
					);
				}

				const fileRecord = await uploadFileService(
					file,
					report.associatedUsers,
				);

				return c.json({
					success: true,
					data: fileRecord,
				});
			} catch (error) {
				console.error("File upload error in lab module:", error);
				return c.json(
					{
						success: false,
						error: { message: "File upload failed", details: error },
					},
					500,
				);
			}
		},
	);

export default lab;
