ALTER TABLE "cases" ADD COLUMN "chiefComplaints" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "clinicalRemarks" text;

CREATE OR REPLACE FUNCTION notify_unprocessed_changed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('unprocessed_changed', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER unprocessed_changed_trigger
AFTER INSERT OR DELETE ON unprocessed
FOR EACH STATEMENT
EXECUTE FUNCTION notify_unprocessed_changed();

CREATE OR REPLACE FUNCTION notify_cases_changed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('cases_changed', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER cases_changed_trigger
AFTER INSERT OR UPDATE OR DELETE ON cases
FOR EACH STATEMENT
EXECUTE FUNCTION notify_cases_changed();

CREATE OR REPLACE FUNCTION notify_lab_changed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('lab_changed', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER lab_changed_trigger
AFTER INSERT OR UPDATE OR DELETE ON case_lab_reports
FOR EACH STATEMENT
EXECUTE FUNCTION notify_lab_changed();

