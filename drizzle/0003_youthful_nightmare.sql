CREATE TABLE "db_access_audit_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "db_access_audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"session_id" varchar(255),
	"actor_user_id" integer,
	"actor_email" varchar(255),
	"actor_name" varchar(255),
	"action" varchar(64) NOT NULL,
	"reason" varchar(2048),
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "db_access_audit_logs" ADD CONSTRAINT "db_access_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;