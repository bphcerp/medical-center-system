DROP INDEX "username_idx";--> statement-breakpoint
DROP INDEX "icd_idx";--> statement-breakpoint
DROP INDEX "psrn_idx";--> statement-breakpoint
DROP INDEX "student_id_idx";--> statement-breakpoint
DROP INDEX "visitor_phone_idx";--> statement-breakpoint
DROP INDEX "dependent_psrn_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "dependent_psrn_idx" ON "dependents" USING btree ("psrn","patientId");