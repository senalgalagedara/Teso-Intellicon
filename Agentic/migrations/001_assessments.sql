-- Initial additive assessment schema. Run through CLI migrate, once per database.
CREATE TABLE teso_students (
	id VARCHAR NOT NULL, 
	is_development BOOLEAN NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE teso_subjects (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE teso_media (
	id VARCHAR NOT NULL, 
	content JSON NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE teso_papers (
	id VARCHAR NOT NULL, 
	content JSON NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE teso_schema_versions (
	version SERIAL NOT NULL, 
	PRIMARY KEY (version)
);

CREATE TABLE teso_units (
	id VARCHAR NOT NULL, 
	subject_id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(subject_id) REFERENCES teso_subjects (id)
);

CREATE TABLE teso_sessions (
	id VARCHAR NOT NULL, 
	student_id VARCHAR NOT NULL, 
	paper_id VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	language VARCHAR NOT NULL, 
	activity_type VARCHAR NOT NULL, 
	is_development BOOLEAN NOT NULL, 
	started_at FLOAT NOT NULL, 
	submitted_at FLOAT, 
	score JSON, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES teso_students (id), 
	FOREIGN KEY(paper_id) REFERENCES teso_papers (id)
);

CREATE INDEX teso_first_response ON teso_sessions (student_id, submitted_at);

CREATE INDEX ix_teso_sessions_student_id ON teso_sessions (student_id);

CREATE TABLE teso_concepts (
	id VARCHAR NOT NULL, 
	unit_id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(unit_id) REFERENCES teso_units (id)
);

CREATE TABLE teso_jobs (
	id VARCHAR NOT NULL, 
	session_id VARCHAR NOT NULL, 
	state VARCHAR NOT NULL, 
	attempts INTEGER NOT NULL, 
	available_at FLOAT NOT NULL, 
	lease_until FLOAT, 
	claim_token VARCHAR, 
	error_code VARCHAR, 
	PRIMARY KEY (id), 
	UNIQUE (session_id), 
	FOREIGN KEY(session_id) REFERENCES teso_sessions (id)
);

CREATE INDEX ix_teso_jobs_state ON teso_jobs (state);

CREATE TABLE teso_resources (
	id VARCHAR NOT NULL, 
	concept_id VARCHAR NOT NULL, 
	content JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(concept_id) REFERENCES teso_concepts (id)
);

CREATE TABLE teso_questions (
	id VARCHAR NOT NULL, 
	concept_id VARCHAR NOT NULL, 
	content JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(concept_id) REFERENCES teso_concepts (id)
);

CREATE TABLE teso_options (
	question_id VARCHAR NOT NULL, 
	id VARCHAR NOT NULL, 
	content JSON NOT NULL, 
	PRIMARY KEY (question_id, id), 
	FOREIGN KEY(question_id) REFERENCES teso_questions (id)
);

CREATE TABLE teso_paper_questions (
	paper_id VARCHAR NOT NULL, 
	question_id VARCHAR NOT NULL, 
	position INTEGER NOT NULL, 
	PRIMARY KEY (paper_id, question_id), 
	UNIQUE (paper_id, position), 
	FOREIGN KEY(paper_id) REFERENCES teso_papers (id), 
	FOREIGN KEY(question_id) REFERENCES teso_questions (id)
);

CREATE TABLE teso_presented (
	session_id VARCHAR NOT NULL, 
	question_id VARCHAR NOT NULL, 
	position INTEGER NOT NULL, 
	PRIMARY KEY (session_id, question_id), 
	FOREIGN KEY(session_id) REFERENCES teso_sessions (id), 
	FOREIGN KEY(question_id) REFERENCES teso_questions (id)
);

CREATE TABLE teso_answer_keys (
	question_id VARCHAR NOT NULL, 
	option_id VARCHAR NOT NULL, 
	PRIMARY KEY (question_id), 
	FOREIGN KEY(question_id, option_id) REFERENCES teso_options (question_id, id), 
	FOREIGN KEY(question_id) REFERENCES teso_questions (id)
);

CREATE TABLE teso_answers (
	session_id VARCHAR NOT NULL, 
	question_id VARCHAR NOT NULL, 
	selected_option VARCHAR, 
	answered_at FLOAT, 
	submitted_at FLOAT, 
	duration_ms INTEGER, 
	hint_exposed BOOLEAN, 
	solution_exposed BOOLEAN, 
	correct BOOLEAN, 
	marks FLOAT, 
	is_final BOOLEAN NOT NULL, 
	PRIMARY KEY (session_id, question_id), 
	FOREIGN KEY(session_id, question_id) REFERENCES teso_presented (session_id, question_id), 
	FOREIGN KEY(question_id, selected_option) REFERENCES teso_options (question_id, id), 
	CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

CREATE INDEX teso_answer_question ON teso_answers (question_id, is_final);

CREATE TABLE teso_analyses (
	session_id VARCHAR NOT NULL, 
	question_id VARCHAR NOT NULL, 
	analysis_version INTEGER NOT NULL, 
	content JSON NOT NULL, 
	PRIMARY KEY (session_id, question_id, analysis_version), 
	FOREIGN KEY(session_id, question_id) REFERENCES teso_presented (session_id, question_id)
);

ALTER TABLE "teso_media" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_media" FROM PUBLIC;

ALTER TABLE "teso_papers" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_papers" FROM PUBLIC;

ALTER TABLE "teso_schema_versions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_schema_versions" FROM PUBLIC;

ALTER TABLE "teso_students" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_students" FROM PUBLIC;

ALTER TABLE "teso_subjects" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_subjects" FROM PUBLIC;

ALTER TABLE "teso_sessions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_sessions" FROM PUBLIC;

ALTER TABLE "teso_units" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_units" FROM PUBLIC;

ALTER TABLE "teso_concepts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_concepts" FROM PUBLIC;

ALTER TABLE "teso_jobs" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_jobs" FROM PUBLIC;

ALTER TABLE "teso_questions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_questions" FROM PUBLIC;

ALTER TABLE "teso_resources" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_resources" FROM PUBLIC;

ALTER TABLE "teso_options" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_options" FROM PUBLIC;

ALTER TABLE "teso_paper_questions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_paper_questions" FROM PUBLIC;

ALTER TABLE "teso_presented" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_presented" FROM PUBLIC;

ALTER TABLE "teso_analyses" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_analyses" FROM PUBLIC;

ALTER TABLE "teso_answer_keys" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_answer_keys" FROM PUBLIC;

ALTER TABLE "teso_answers" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_answers" FROM PUBLIC;

INSERT INTO teso_schema_versions (version) VALUES (1) ON CONFLICT DO NOTHING;
