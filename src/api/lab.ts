import { and, count, eq, inArray, ne } from "drizzle-orm";
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
import { seaweedfs, uploadFileService } from "./files";
import { db } from "./index";
import { rbacCheck } from "./rbac";

const lab = createStrictHono()
	.use(rbacCheck({ permissions: ["lab"] }))
	.get("/pending", async (c) => {
		const pendingReports = await db
			.select({
				id: caseLabReportsTable.id,
				caseId: caseLabReportsTable.caseId,
				status: caseLabReportsTable.status,
				token: casesTable.token,
				associatedUsers: casesTable.associatedUsers,
				testName: labTestsMasterTable.name,
				patientName: patientsTable.name,
			})
			.from(caseLabReportsTable)
			.innerJoin(
				labTestsMasterTable,
				eq(caseLabReportsTable.testId, labTestsMasterTable.id),
			)
			.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
			.innerJoin(patientsTable, eq(casesTable.patient, patientsTable.id))
			.where(ne(caseLabReportsTable.status, "Complete"));

		if (pendingReports.length === 0) {
			return c.json({ success: true, data: [] });
		}

		const doctorIds = Array.from(
			new Set(
				pendingReports
					.map((r) => r.associatedUsers.at(0))
					.filter((id) => id !== undefined),
			),
		);

		const doctors =
			doctorIds.length > 0
				? await db
						.select({ id: usersTable.id, name: usersTable.name })
						.from(usersTable)
						.where(inArray(usersTable.id, doctorIds))
				: [];

		const doctorMap = new Map(doctors.map((d) => [d.id, d.name]));

		interface Case {
			caseId: number;
			patientName: string;
			doctorName: string;
			token: number;
			tests: {
				id: number;
				name: string;
				status: (typeof statusEnums)[number];
			}[];
		}
		const cases = pendingReports.reduce((acc: Case[], report) => {
			let caseEntry = acc.find((c) => c.caseId === report.caseId);
			if (!caseEntry) {
				caseEntry = {
					caseId: report.caseId,
					patientName: report.patientName,
					doctorName:
						(report.associatedUsers.at(0) != null
							? doctorMap.get(report.associatedUsers.at(0) ?? 0)
							: null) ?? "Unknown Doctor",
					token: report.token,
					tests: [],
				};
				acc.push(caseEntry);
			}
			caseEntry.tests.push({
				id: report.id,
				name: report.testName,
				status: report.status,
			});
			return acc;
		}, []);
		return c.json({ success: true, data: cases });
	})
	.get(
		"/details/:caseId",
		strictValidator(
			"param",
			z.object({ caseId: z.coerce.number().int().positive() }),
		),
		async (c) => {
			const { caseId } = c.req.valid("param");

			const tests = await db
				.select({
					id: caseLabReportsTable.id,
					testId: caseLabReportsTable.testId,
					testName: labTestsMasterTable.name,
					status: caseLabReportsTable.status,
					metadata: caseLabReportsTable.metadata,
					patient: patientsTable,
					token: casesTable.token,
					associatedUsers: casesTable.associatedUsers,
				})
				.from(caseLabReportsTable)
				.innerJoin(
					labTestsMasterTable,
					eq(caseLabReportsTable.testId, labTestsMasterTable.id),
				)
				.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
				.innerJoin(patientsTable, eq(casesTable.patient, patientsTable.id))
				.where(eq(caseLabReportsTable.caseId, caseId));

			if (tests.length === 0) {
				return c.json(
					{ success: false, error: { message: "No tests found" } },
					404,
				);
			}

			const patient = tests[0].patient;
			const token = tests[0].token;

			const ids = tests.map((t) => t.id);
			const fileLinks =
				ids.length > 0
					? await db
							.select({
								id: labTestFilesTable.caseLabReportId,
								fileId: labTestFilesTable.fileId,
								filename: filesTable.filename,
							})
							.from(labTestFilesTable)
							.where(inArray(labTestFilesTable.caseLabReportId, ids))
							.innerJoin(
								filesTable,
								eq(labTestFilesTable.fileId, filesTable.id),
							)
					: [];

			interface FileLink {
				fileId: number;
				filename: string;
			}

			const fileMap = new Map<number, FileLink[]>();
			for (const link of fileLinks) {
				if (!fileMap.has(link.id)) {
					fileMap.set(link.id, []);
				}
				fileMap.get(link.id)?.push({
					fileId: link.fileId,
					filename: link.filename,
				});
			}

			const primaryDoctorId = tests[0].associatedUsers.at(0);
			const [doctor] =
				primaryDoctorId != null
					? await db
							.select({ name: usersTable.name })
							.from(usersTable)
							.where(eq(usersTable.id, primaryDoctorId))
					: [];

			const testsWithFiles = tests.map((test) => ({
				id: test.id,
				testId: test.testId,
				testName: test.testName,
				status: test.status,
				metadata: test.metadata,
				files: fileMap.get(test.id) ?? [],
			}));

			return c.json({
				success: true,
				data: {
					caseId,
					token,
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
		"/update/:testId",
		strictValidator(
			"param",
			z.object({ testId: z.coerce.number().int().positive() }),
		),
		strictValidator(
			"form",
			z.object({
				status: z.enum(statusEnums),
				keep: z.union([
					z.coerce.number().int().positive(),
					z.array(z.coerce.number().int().positive()).optional().default([]),
				]),
				remove: z.union([
					z.coerce.number().int().positive(),
					z.array(z.coerce.number().int().positive()).optional().default([]),
				]),
				add: z.union([
					z.instanceof(File),
					z.array(z.instanceof(File)).optional().default([]),
				]),
			}),
		),
		async (c) => {
			// TODO: Ensure associated users is being checked and permeated properly
			// TODO: Verify that there are no orphaned files left behind in any scenario
			const addedFiles: string[] = [];
			try {
				const {
					add: addUnion,
					remove: removeUnion,
					keep: keepUnion,
					status,
				} = c.req.valid("form");
				const { testId } = c.req.valid("param");

				// Normalize inputs to arrays
				const add = Array.isArray(addUnion) ? addUnion : [addUnion];
				const remove = Array.isArray(removeUnion) ? removeUnion : [removeUnion];
				const keep = Array.isArray(keepUnion) ? keepUnion : [keepUnion];

				const deletedFiles: string[] = [];
				// Quick check to see if test exists and get associated users
				const [report] = await db
					.select({ associatedUsers: casesTable.associatedUsers })
					.from(caseLabReportsTable)
					.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
					.where(eq(caseLabReportsTable.id, testId));
				if (!report) {
					return c.json(
						{ success: false, error: { message: "Lab test report not found" } },
						404,
					);
				}

				// Check on the files being kept the same
				const existingFiles = await db
					.select({ fileId: labTestFilesTable.fileId })
					.from(labTestFilesTable)
					.where(
						and(
							eq(labTestFilesTable.caseLabReportId, testId),
							inArray(labTestFilesTable.fileId, keep),
						),
					);
				if (existingFiles.length !== keep.length) {
					return c.json(
						{
							success: false,
							error: {
								message:
									"One or more files to keep are not associated with this lab test",
							},
						},
						400,
					);
				}

				await db.transaction(async (tx) => {
					// Process removals
					await tx
						.delete(labTestFilesTable)
						.where(
							and(
								eq(labTestFilesTable.caseLabReportId, testId),
								inArray(labTestFilesTable.fileId, remove),
							),
						);
					const fids = await tx
						.delete(filesTable)
						.returning({ fid: filesTable.fid })
						.where(inArray(filesTable.id, remove));
					for (const { fid } of fids) {
						deletedFiles.push(fid);
					}

					// Process additions
					for (const file of add) {
						const fileRecord = await uploadFileService(
							tx,
							file,
							report.associatedUsers,
						);
						addedFiles.push(fileRecord.fid);
						await tx.insert(labTestFilesTable).values({
							caseLabReportId: testId,
							fileId: fileRecord.id,
						});
					}

					// Check if the test has at least one file after additions/removals
					const fileCount = await tx
						.select({ count: count() })
						.from(labTestFilesTable)
						.where(eq(labTestFilesTable.caseLabReportId, testId));

					// If no files remain, and status is being set to Complete, throw error
					if (fileCount[0].count === 0 && status === "Complete") {
						throw new Error(
							"Cannot mark test as Complete without at least one associated file",
						);
					}
					if (fileCount[0].count > 0 && status !== "Complete") {
						throw new Error("Tests with files can only be marked as Complete");
					}
					// Finally, update the test status
					await tx
						.update(caseLabReportsTable)
						.set({ status, updatedAt: new Date() })
						.where(eq(caseLabReportsTable.id, testId))
						.returning();
				});

				// If we reach here, transaction was successful, delete files from storage now
				for (const fid of deletedFiles) {
					await seaweedfs.deleteFile(fid);
				}

				return c.json({
					success: true,
					data: { message: "Lab test updated successfully" },
				});
			} catch (error) {
				// RIP, rollback happened, clean up any uploaded files
				console.error("Error updating lab test:", error);
				for (const fid of addedFiles) {
					await seaweedfs.deleteFile(fid);
				}
				return c.json(
					{
						success: false,
						error: { message: "Failed to update lab test", details: error },
					},
					500,
				);
			}
		},
	);

export default lab;
