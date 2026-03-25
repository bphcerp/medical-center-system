CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."finalized_state" AS ENUM('opd', 'admitted', 'referred');--> statement-breakpoint
CREATE TYPE "public"."identifier_type" AS ENUM('psrn', 'student_id', 'phone');--> statement-breakpoint
CREATE TYPE "public"."medicine_category" AS ENUM('Capsule/Tablet', 'External Application', 'Injection', 'Liquids/Syrups');--> statement-breakpoint
CREATE TYPE "public"."doctor_availability_type" AS ENUM('campus', 'visiting');--> statement-breakpoint
CREATE TYPE "public"."doctor_schedule_override_type" AS ENUM('unavailable', 'custom_hours');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Requested', 'Sample Collected', 'Complete');--> statement-breakpoint
CREATE TYPE "public"."patient_type" AS ENUM('student', 'professor', 'dependent', 'visitor');--> statement-breakpoint
CREATE TYPE "public"."sex_type" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');--> statement-breakpoint
CREATE TABLE "permissions" (
	"permission" text PRIMARY KEY NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"allowed" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" varchar(255) NOT NULL,
	"passwordHash" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(255) NOT NULL,
	"role" integer NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "appointments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"patientId" integer NOT NULL,
	"doctorId" integer NOT NULL,
	"appointment_date" date NOT NULL,
	"slot_start" time NOT NULL,
	"slot_end" time NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"token_number" integer,
	"booked_by_id" integer NOT NULL,
	"rescheduled_from_id" integer,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_prescriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "case_prescriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"caseId" integer NOT NULL,
	"medicineId" integer NOT NULL,
	"dosage" varchar(255) NOT NULL,
	"frequency" varchar(255) NOT NULL,
	"duration" varchar(255) NOT NULL,
	"durationUnit" varchar(255) NOT NULL,
	"categoryData" jsonb,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"token" integer NOT NULL,
	"patient" integer NOT NULL,
	"weight" integer,
	"temperature" real,
	"heartRate" integer,
	"respiratoryRate" integer,
	"bloodPressureSystolic" integer,
	"bloodPressureDiastolic" integer,
	"bloodSugar" integer,
	"spo2" integer,
	"consultationNotes" text,
	"diagnosis" integer[],
	"finalized_state" "finalized_state",
	"associated_users" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cases_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "diseases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "diseases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(1023) NOT NULL,
	"icd" varchar(255) NOT NULL,
	CONSTRAINT "diseases_icd_unique" UNIQUE("icd")
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "medicines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"drug" varchar(1023) NOT NULL,
	"company" varchar(1023) NOT NULL,
	"brand" varchar(1023) NOT NULL,
	"strength" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"category" "medicine_category" NOT NULL,
	"price" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unprocessed" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "unprocessed_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"identifier_type" "identifier_type" NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"patientId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_schedule_overrides" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doctor_schedule_overrides_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doctorId" integer NOT NULL,
	"override_date" date NOT NULL,
	"override_type" "doctor_schedule_override_type" NOT NULL,
	"start_time" time,
	"end_time" time,
	"slot_duration_minutes" integer,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_schedule" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doctor_schedule_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doctorId" integer NOT NULL,
	"day_of_week" "day_of_week" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"slot_duration_minutes" integer DEFAULT 15 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_specialities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doctor_specialities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_specialities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" integer PRIMARY KEY NOT NULL,
	"speciality_id" integer NOT NULL,
	"availability_type" "doctor_availability_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fid" varchar(255) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"url" varchar(255) NOT NULL,
	"allowed" integer[] DEFAULT '{}'::integer[] NOT NULL,
	CONSTRAINT "files_fid_unique" UNIQUE("fid"),
	CONSTRAINT "files_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "batches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"medicineId" integer NOT NULL,
	"batchNum" varchar(255) NOT NULL,
	"expiry" date NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_medicines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_medicines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"medicineId" integer NOT NULL,
	"criticalQty" integer
);
--> statement-breakpoint
CREATE TABLE "case_lab_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "case_lab_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"caseId" integer NOT NULL,
	"testId" integer NOT NULL,
	"status" "status" DEFAULT 'Requested' NOT NULL,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_test_files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lab_test_files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"caseLabReportId" integer NOT NULL,
	"fileId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_tests_master" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lab_tests_master_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"testCode" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(255) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_case_history_otps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doctor_case_history_otps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doctorId" integer NOT NULL,
	"caseId" integer NOT NULL,
	"otp" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_override_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "otp_override_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doctorId" integer NOT NULL,
	"caseId" integer NOT NULL,
	"reason" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dependents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dependents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"psrn" varchar(255) NOT NULL,
	"patientId" integer NOT NULL,
	CONSTRAINT "dependents_patientId_unique" UNIQUE("patientId")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "patients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"type" "patient_type" NOT NULL,
	"birthdate" date NOT NULL,
	"sex" "sex_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "professors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"psrn" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(255) NOT NULL,
	"patientId" integer NOT NULL,
	CONSTRAINT "professors_psrn_unique" UNIQUE("psrn"),
	CONSTRAINT "professors_email_unique" UNIQUE("email"),
	CONSTRAINT "professors_patientId_unique" UNIQUE("patientId")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "students_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"studentId" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(255) NOT NULL,
	"patientId" integer NOT NULL,
	CONSTRAINT "students_studentId_unique" UNIQUE("studentId"),
	CONSTRAINT "students_email_unique" UNIQUE("email"),
	CONSTRAINT "students_patientId_unique" UNIQUE("patientId")
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "visitors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(255) NOT NULL,
	"phone" varchar(255) NOT NULL,
	"patientId" integer NOT NULL,
	CONSTRAINT "visitors_phone_unique" UNIQUE("phone"),
	CONSTRAINT "visitors_patientId_unique" UNIQUE("patientId")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_roles_id_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_patients_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_users_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_booked_by_id_users_id_fk" FOREIGN KEY ("booked_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduled_from_id_appointments_id_fk" FOREIGN KEY ("rescheduled_from_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_prescriptions" ADD CONSTRAINT "case_prescriptions_caseId_cases_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_prescriptions" ADD CONSTRAINT "case_prescriptions_medicineId_medicines_id_fk" FOREIGN KEY ("medicineId") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_patient_patients_id_fk" FOREIGN KEY ("patient") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unprocessed" ADD CONSTRAINT "unprocessed_patientId_patients_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule_overrides" ADD CONSTRAINT "doctor_schedule_overrides_doctorId_doctors_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_doctorId_doctors_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_speciality_id_doctor_specialities_id_fk" FOREIGN KEY ("speciality_id") REFERENCES "public"."doctor_specialities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_medicineId_inventory_medicines_id_fk" FOREIGN KEY ("medicineId") REFERENCES "public"."inventory_medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_medicines" ADD CONSTRAINT "inventory_medicines_medicineId_medicines_id_fk" FOREIGN KEY ("medicineId") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_lab_reports" ADD CONSTRAINT "case_lab_reports_caseId_cases_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_lab_reports" ADD CONSTRAINT "case_lab_reports_testId_lab_tests_master_id_fk" FOREIGN KEY ("testId") REFERENCES "public"."lab_tests_master"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_test_files" ADD CONSTRAINT "lab_test_files_caseLabReportId_case_lab_reports_id_fk" FOREIGN KEY ("caseLabReportId") REFERENCES "public"."case_lab_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_test_files" ADD CONSTRAINT "lab_test_files_fileId_files_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_case_history_otps" ADD CONSTRAINT "doctor_case_history_otps_doctorId_users_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_case_history_otps" ADD CONSTRAINT "doctor_case_history_otps_caseId_cases_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_override_logs" ADD CONSTRAINT "otp_override_logs_doctorId_users_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_override_logs" ADD CONSTRAINT "otp_override_logs_caseId_cases_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_psrn_professors_psrn_fk" FOREIGN KEY ("psrn") REFERENCES "public"."professors"("psrn") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_patientId_patients_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professors" ADD CONSTRAINT "professors_patientId_patients_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_patientId_patients_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_patientId_patients_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_slot_unique_idx" ON "appointments" USING btree ("doctorId","appointment_date","slot_start");--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_token_unique_idx" ON "appointments" USING btree ("doctorId","appointment_date","token_number");--> statement-breakpoint
CREATE INDEX "appointment_patient_idx" ON "appointments" USING btree ("patientId");--> statement-breakpoint
CREATE INDEX "appointment_doctor_date_idx" ON "appointments" USING btree ("doctorId","appointment_date");--> statement-breakpoint
CREATE INDEX "appointment_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appointment_date_idx" ON "appointments" USING btree ("appointment_date");--> statement-breakpoint
CREATE UNIQUE INDEX "icd_idx" ON "diseases" USING btree ("icd");--> statement-breakpoint
CREATE UNIQUE INDEX "dso_doctor_date_idx" ON "doctor_schedule_overrides" USING btree ("doctorId","override_date");--> statement-breakpoint
CREATE INDEX "dso_date_idx" ON "doctor_schedule_overrides" USING btree ("override_date");--> statement-breakpoint
CREATE UNIQUE INDEX "dwt_doctor_day_start_idx" ON "doctor_schedule" USING btree ("doctorId","day_of_week","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "case_test_idx" ON "case_lab_reports" USING btree ("caseId","testId");--> statement-breakpoint
CREATE INDEX "case_idx" ON "case_lab_reports" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "status_idx" ON "case_lab_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "case_lab_report_idx" ON "lab_test_files" USING btree ("caseLabReportId");--> statement-breakpoint
CREATE INDEX "file_idx" ON "lab_test_files" USING btree ("fileId");--> statement-breakpoint
CREATE UNIQUE INDEX "dependent_psrn_idx" ON "dependents" USING btree ("psrn");--> statement-breakpoint
CREATE UNIQUE INDEX "psrn_idx" ON "professors" USING btree ("psrn");--> statement-breakpoint
CREATE UNIQUE INDEX "student_id_idx" ON "students" USING btree ("studentId");--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_phone_idx" ON "visitors" USING btree ("phone");