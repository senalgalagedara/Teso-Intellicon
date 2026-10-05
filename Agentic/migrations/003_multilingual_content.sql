-- Migration 003: normalized multilingual content and private image references.
-- Apply with CLI migrate to backfill existing immutable content and record version 3.

CREATE TABLE teso_languages (
	id VARCHAR NOT NULL,
	name VARCHAR NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (name)
);

CREATE TABLE teso_topics (
	id VARCHAR NOT NULL,
	subject_id VARCHAR NOT NULL,
	name VARCHAR NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(id) REFERENCES teso_concepts (id),
	UNIQUE (id, subject_id),
	FOREIGN KEY(subject_id) REFERENCES teso_subjects (id)
);

CREATE TABLE teso_storage_buckets (
	id VARCHAR NOT NULL,
	provider VARCHAR NOT NULL,
	bucket_name VARCHAR NOT NULL,
	is_private BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (provider, bucket_name),
	CHECK (provider = 'supabase'),
	CHECK (is_private)
);

CREATE TABLE teso_answer_choices (
	id VARCHAR NOT NULL,
	question_id VARCHAR NOT NULL,
	option_id VARCHAR NOT NULL,
	answer_text VARCHAR NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(question_id, option_id) REFERENCES teso_options (question_id, id),
	UNIQUE (question_id, option_id),
	UNIQUE (id, question_id),
	FOREIGN KEY(question_id) REFERENCES teso_questions (id)
);

CREATE TABLE teso_subject_versions (
	id VARCHAR NOT NULL,
	subject_id VARCHAR NOT NULL,
	language_id VARCHAR NOT NULL,
	version INTEGER NOT NULL,
	display_name VARCHAR NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (subject_id, language_id, version),
	UNIQUE (id, subject_id, language_id),
	CHECK (version > 0),
	FOREIGN KEY(subject_id) REFERENCES teso_subjects (id),
	FOREIGN KEY(language_id) REFERENCES teso_languages (id)
);

CREATE TABLE teso_question_families (
	id VARCHAR NOT NULL,
	subject_id VARCHAR NOT NULL,
	topic_id VARCHAR NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(topic_id, subject_id) REFERENCES teso_topics (id, subject_id),
	UNIQUE (id, subject_id, topic_id),
	FOREIGN KEY(subject_id) REFERENCES teso_subjects (id)
);

CREATE TABLE teso_images (
	id VARCHAR NOT NULL,
	bucket_id VARCHAR NOT NULL,
	object_key VARCHAR NOT NULL,
	mime_type VARCHAR NOT NULL,
	role VARCHAR NOT NULL,
	transcription VARCHAR,
	sha256 VARCHAR(64),
	byte_size INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY(id) REFERENCES teso_media (id),
	UNIQUE (bucket_id, object_key),
	UNIQUE (id, role),
	CHECK (role IN ('question', 'option', 'solution', 'theory')),
	CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
	CHECK (byte_size IS NULL OR byte_size > 0),
	FOREIGN KEY(bucket_id) REFERENCES teso_storage_buckets (id)
);

CREATE TABLE teso_theories (
	id VARCHAR NOT NULL,
	topic_id VARCHAR NOT NULL,
	language_id VARCHAR NOT NULL,
	version INTEGER NOT NULL,
	title VARCHAR NOT NULL,
	theory_text VARCHAR NOT NULL,
	url VARCHAR,
	PRIMARY KEY (id),
	FOREIGN KEY(id) REFERENCES teso_resources (id),
	UNIQUE (id, topic_id, language_id),
	CHECK (version > 0),
	FOREIGN KEY(topic_id) REFERENCES teso_topics (id),
	FOREIGN KEY(language_id) REFERENCES teso_languages (id)
);

CREATE INDEX teso_theory_topic_language ON teso_theories (topic_id, language_id);

CREATE TABLE teso_question_details (
	id VARCHAR NOT NULL,
	family_id VARCHAR NOT NULL,
	subject_version_id VARCHAR NOT NULL,
	subject_id VARCHAR NOT NULL,
	topic_id VARCHAR NOT NULL,
	language_id VARCHAR NOT NULL,
	version INTEGER NOT NULL,
	question_text VARCHAR NOT NULL,
	marks FLOAT NOT NULL,
	primary_theory_id VARCHAR NOT NULL,
	correct_answer_id VARCHAR NOT NULL,
	is_development BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(id) REFERENCES teso_questions (id),
	FOREIGN KEY(family_id, subject_id, topic_id) REFERENCES teso_question_families (id, subject_id, topic_id),
	FOREIGN KEY(subject_version_id, subject_id, language_id) REFERENCES teso_subject_versions (id, subject_id, language_id),
	FOREIGN KEY(primary_theory_id, topic_id, language_id) REFERENCES teso_theories (id, topic_id, language_id),
	FOREIGN KEY(correct_answer_id, id) REFERENCES teso_answer_choices (id, question_id),
	UNIQUE (family_id, language_id, version),
	UNIQUE (id, topic_id, language_id),
	CHECK (version > 0),
	CHECK (marks > 0),
	FOREIGN KEY(subject_id) REFERENCES teso_subjects (id),
	FOREIGN KEY(language_id) REFERENCES teso_languages (id)
);

CREATE INDEX teso_catalog_family ON teso_question_details (family_id);

CREATE INDEX teso_catalog_subject_topic_language ON teso_question_details (subject_id, topic_id, language_id, is_development);

CREATE TABLE teso_answer_choice_images (
	answer_id VARCHAR NOT NULL,
	image_id VARCHAR NOT NULL,
	role VARCHAR NOT NULL,
	position INTEGER NOT NULL,
	PRIMARY KEY (answer_id, image_id),
	FOREIGN KEY(image_id, role) REFERENCES teso_images (id, role),
	UNIQUE (answer_id, position),
	CHECK (role = 'option'),
	CHECK (position >= 0),
	FOREIGN KEY(answer_id) REFERENCES teso_answer_choices (id)
);

CREATE TABLE teso_theory_images (
	theory_id VARCHAR NOT NULL,
	image_id VARCHAR NOT NULL,
	role VARCHAR NOT NULL,
	position INTEGER NOT NULL,
	PRIMARY KEY (theory_id, image_id),
	FOREIGN KEY(image_id, role) REFERENCES teso_images (id, role),
	UNIQUE (theory_id, position),
	CHECK (role = 'theory'),
	CHECK (position >= 0),
	FOREIGN KEY(theory_id) REFERENCES teso_theories (id)
);

CREATE TABLE teso_question_theories (
	question_id VARCHAR NOT NULL,
	theory_id VARCHAR NOT NULL,
	topic_id VARCHAR NOT NULL,
	language_id VARCHAR NOT NULL,
	position INTEGER NOT NULL,
	PRIMARY KEY (question_id, theory_id),
	FOREIGN KEY(question_id, topic_id, language_id) REFERENCES teso_question_details (id, topic_id, language_id),
	FOREIGN KEY(theory_id, topic_id, language_id) REFERENCES teso_theories (id, topic_id, language_id),
	UNIQUE (question_id, position),
	CHECK (position >= 0)
);

CREATE TABLE teso_question_images (
	question_id VARCHAR NOT NULL,
	image_id VARCHAR NOT NULL,
	role VARCHAR NOT NULL,
	position INTEGER NOT NULL,
	PRIMARY KEY (question_id, image_id),
	FOREIGN KEY(image_id, role) REFERENCES teso_images (id, role),
	UNIQUE (question_id, role, position),
	CHECK (role IN ('question', 'solution')),
	CHECK (position >= 0),
	FOREIGN KEY(question_id) REFERENCES teso_question_details (id)
);

CREATE INDEX teso_student_history_order ON teso_sessions (student_id, started_at, id);

ALTER TABLE "teso_languages" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_languages" FROM PUBLIC;

ALTER TABLE "teso_subject_versions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_subject_versions" FROM PUBLIC;

ALTER TABLE "teso_topics" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_topics" FROM PUBLIC;

ALTER TABLE "teso_question_families" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_question_families" FROM PUBLIC;

ALTER TABLE "teso_storage_buckets" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_storage_buckets" FROM PUBLIC;

ALTER TABLE "teso_images" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_images" FROM PUBLIC;

ALTER TABLE "teso_theories" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_theories" FROM PUBLIC;

ALTER TABLE "teso_answer_choices" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_answer_choices" FROM PUBLIC;

ALTER TABLE "teso_question_details" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_question_details" FROM PUBLIC;

ALTER TABLE "teso_question_theories" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_question_theories" FROM PUBLIC;

ALTER TABLE "teso_question_images" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_question_images" FROM PUBLIC;

ALTER TABLE "teso_answer_choice_images" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_answer_choice_images" FROM PUBLIC;

ALTER TABLE "teso_theory_images" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "teso_theory_images" FROM PUBLIC;
