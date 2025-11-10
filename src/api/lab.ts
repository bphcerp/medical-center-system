import { zValidator } from "@hono/zod-validator";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { usersTable } from "@/db/auth";
import { casesTable } from "@/db/case";
import { filesTable } from "@/db/files";
import { caseLabReportsTable, reportFilesTable } from "@/db/lab";
import { patientsTable } from "@/db/patient";
import { uploadFileService } from "./fileupload.service";
import { db } from "./index";
import { rbacCheck } from "./rbac";

const pendingStatuses = ["Requested", "In Progress"] as const;

const resultSubmissionSchema = z.object({
	fileId: z.number().int().optional(),
	resultsData: z.record(z.string(), z.unknown()),
});

const lab = new Hono()
	.basePath("/lab")
	.use(rbacCheck({ permissions: ["lab-entry"] }))

	.get("/pending", async (c) => {
		const pendingReports = await db
			.select({
				reportId: caseLabReportsTable.id,
				caseId: caseLabReportsTable.caseId,
				testsRequested: caseLabReportsTable.type,
				patientId: casesTable.patient,
				associatedUsers: casesTable.associatedUsers,
			})
			.from(caseLabReportsTable)
			.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
			.where(inArray(caseLabReportsTable.status, pendingStatuses));

		if (pendingReports.length === 0) {
			return c.json({ success: true, reports: [] });
		}

		const patientIds = Array.from(
			new Set(pendingReports.map((report) => report.patientId)),
		);
		const doctorIds = Array.from(
			new Set(
				pendingReports
					.map((report) => report.associatedUsers.at(0))
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
		const patientMap = new Map(
			patients.map((patient) => [patient.id, patient.name]),
		);

		const doctors =
			doctorIds.length > 0
				? await db
						.select({ id: usersTable.id, name: usersTable.name })
						.from(usersTable)
						.where(inArray(usersTable.id, doctorIds))
				: [];
		const doctorMap = new Map(
			doctors.map((doctor) => [doctor.id, doctor.name]),
		);

		const reports = pendingReports.map((report) => {
			const doctorId = report.associatedUsers.at(0);
			return {
				reportId: report.reportId,
				caseId: report.caseId,
				patientName: patientMap.get(report.patientId) ?? "Unknown Patient",
				doctorName:
					doctorId != null
						? (doctorMap.get(doctorId) ?? "Unknown Doctor")
						: "Unknown Doctor",
				testsRequested: report.testsRequested,
			};
		});

		return c.json({ success: true, reports });
	})

	.get(
		"/details/:reportId",
		zValidator("param", z.object({ reportId: z.coerce.number().int() })),
		async (c) => {
			const { reportId } = c.req.valid("param");

			const [reportDetail] = await db
				.select({
					reportId: caseLabReportsTable.id,
					caseId: caseLabReportsTable.caseId,
					type: caseLabReportsTable.type,
					currentData: caseLabReportsTable.data,
					patientId: casesTable.patient,
					associatedUsers: casesTable.associatedUsers,
				})
				.from(caseLabReportsTable)
				.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
				.where(eq(caseLabReportsTable.id, reportId));

			if (!reportDetail) {
				return c.json({ success: false, error: "Lab report not found" }, 404);
			}

			const [patient] = await db
				.select({ name: patientsTable.name })
				.from(patientsTable)
				.where(eq(patientsTable.id, reportDetail.patientId))
				.limit(1);
			const primaryDoctorId = reportDetail.associatedUsers.at(0);
			const [doctor] =
				primaryDoctorId != null
					? await db
							.select({ name: usersTable.name })
							.from(usersTable)
							.where(eq(usersTable.id, primaryDoctorId))
							.limit(1)
					: [];

			return c.json({
				success: true,
				report: {
					reportId: reportDetail.reportId,
					caseId: reportDetail.caseId,
					type: reportDetail.type,
					results: reportDetail.currentData,
					patientName: patient?.name ?? "Unknown Patient",
					doctorName: doctor?.name ?? "Unknown Doctor",
				},
			});
		},
	)

	.post(
		"/upload-report-file",
		zValidator(
			"form",
			z.object({
				file: z.instanceof(File),
				reportId: z.coerce.number().int(),
			}),
		),
		async (c) => {
			const { file, reportId } = c.req.valid("form");

			try {
				const [report] = await db
					.select({ associatedUsers: casesTable.associatedUsers })
					.from(caseLabReportsTable)
					.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
					.where(eq(caseLabReportsTable.id, reportId));

				if (!report) {
					return c.json({ success: false, error: "Report not found" }, 404);
				}

				const fileRecord = await uploadFileService(
					file,
					report.associatedUsers,
				);

				return c.json({
					success: true,
					file: fileRecord,
				});
			} catch (error) {
				console.error("File upload error in lab module:", error);
				return c.json({ success: false, error: "File upload failed" }, 500);
			}
		},
	)

	.post(
		"/submit/:reportId",
		zValidator("param", z.object({ reportId: z.coerce.number().int() })),
		zValidator("json", resultSubmissionSchema),
		async (c) => {
			const { reportId } = c.req.valid("param");
			const { fileId, resultsData } = c.req.valid("json");

			const updatedReport = await db.transaction(async (tx) => {
				const [report] = await tx
					.select({
						associatedUsers: casesTable.associatedUsers,
					})
					.from(caseLabReportsTable)
					.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
					.where(eq(caseLabReportsTable.id, reportId));

				if (!report) {
					throw new Error("Report not found or case missing.");
				}

				const [updated] = await tx
					.update(caseLabReportsTable)
					.set({
						data: resultsData,
						status: "Done",
					})
					.where(eq(caseLabReportsTable.id, reportId))
					.returning();

				if (!updated) {
					throw new Error("Failed to update lab report.");
				}

				if (fileId) {
					await tx.insert(reportFilesTable).values({
						reportId,
						fileId,
					});

					await tx
						.update(filesTable)
						.set({
							allowed: report.associatedUsers,
						})
						.where(eq(filesTable.id, fileId));
				}

				return updated;
			});

			return c.json(
				{
					success: true,
					message: "Lab results submitted and report finalized.",
					report: updatedReport,
				},
				200,
			);
		},
	);

export default lab;
