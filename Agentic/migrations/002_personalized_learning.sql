-- Migration 002: durable personalized plans and learning evidence.
-- Apply via python -m app.assessment.cli migrate; the CLI also backfills
-- submitted assessments and records schema version 2 transactionally.

CREATE TABLE teso_session_plans (
	session_id VARCHAR NOT NULL,
	source_session_id VARCHAR NOT NULL,
	content JSON NOT NULL,
	PRIMARY KEY (session_id),
	FOREIGN KEY(session_id) REFERENCES teso_sessions (id),
	UNIQUE (source_session_id),
	FOREIGN KEY(source_session_id) REFERENCES teso_sessions (id)
);
ALTER TABLE "teso_session_plans" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "teso_session_plans" FROM PUBLIC;

CREATE TABLE teso_learning_records (
	session_id VARCHAR NOT NULL,
	content JSON NOT NULL,
	PRIMARY KEY (session_id),
	FOREIGN KEY(session_id) REFERENCES teso_sessions (id)
);
ALTER TABLE "teso_learning_records" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "teso_learning_records" FROM PUBLIC;
