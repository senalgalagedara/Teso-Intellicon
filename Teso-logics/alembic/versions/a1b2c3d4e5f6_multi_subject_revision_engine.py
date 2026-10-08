"""Multi-subject adaptive revision engine and question bank tables

Revision ID: a1b2c3d4e5f6
Revises: fd8f509232ed
Create Date: 2026-10-12 10:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'fd8f509232ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. subjects table
    op.create_table(
        'subjects',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('exam_level', sa.String(length=10), nullable=False, server_default='AL'),
        sa.Column('stream', sa.String(length=100), nullable=True),
        sa.Column('icon_name', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index('ix_subjects_code', 'subjects', ['code'], unique=True)

    # 2. subject_topics table
    op.create_table(
        'subject_topics',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('subject_id', sa.UUID(), nullable=False),
        sa.Column('topic_number', sa.Float(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('syllabus_weight', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_subject_topics_subject_order', 'subject_topics', ['subject_id', 'order_index'])

    # 3. subject_subtopics table
    op.create_table(
        'subject_subtopics',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('topic_id', sa.UUID(), nullable=False),
        sa.Column('subtopic_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('estimated_hours', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['topic_id'], ['subject_topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_subtopics_topic_order', 'subject_subtopics', ['topic_id', 'order_index'])

    # 4. student_subject_enrollments table
    op.create_table(
        'student_subject_enrollments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('subject_id', sa.UUID(), nullable=False),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'subject_id', name='uq_user_subject_enrollment')
    )
    op.create_index('ix_enrollments_user', 'student_subject_enrollments', ['user_id'])

    # 5. question_bank table
    op.create_table(
        'question_bank',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('subject_id', sa.UUID(), nullable=False),
        sa.Column('topic_id', sa.UUID(), nullable=False),
        sa.Column('subtopic_id', sa.UUID(), nullable=False),
        sa.Column('exam_level', sa.String(length=10), nullable=False, server_default='AL'),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_image_url', sa.String(length=1024), nullable=True),
        sa.Column('answer_1_text', sa.Text(), nullable=True),
        sa.Column('answer_1_image_url', sa.String(length=1024), nullable=True),
        sa.Column('answer_2_text', sa.Text(), nullable=True),
        sa.Column('answer_2_image_url', sa.String(length=1024), nullable=True),
        sa.Column('answer_3_text', sa.Text(), nullable=True),
        sa.Column('answer_3_image_url', sa.String(length=1024), nullable=True),
        sa.Column('answer_4_text', sa.Text(), nullable=True),
        sa.Column('answer_4_image_url', sa.String(length=1024), nullable=True),
        sa.Column('answer_5_text', sa.Text(), nullable=True),
        sa.Column('answer_5_image_url', sa.String(length=1024), nullable=True),
        sa.Column('correct_answer_number', sa.Integer(), nullable=False),
        sa.Column('additional_correct_answer_number', sa.Integer(), nullable=True),
        sa.Column('explanation_text', sa.Text(), nullable=True),
        sa.Column('explanation_image_url', sa.String(length=1024), nullable=True),
        sa.Column('difficulty_score', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('elo_rating', sa.Float(), nullable=False, server_default='1500.0'),
        sa.Column('irt_difficulty_b', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('irt_discrimination_a', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('total_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_correct', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('historical_accuracy', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('time_limit_seconds', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('correct_answer_number BETWEEN 1 AND 5', name='chk_correct_answer_range'),
        sa.CheckConstraint('difficulty_score BETWEEN 0.0 AND 1.0', name='chk_difficulty_score_range'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['subtopic_id'], ['subject_subtopics.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['topic_id'], ['subject_topics.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_qb_subject_level', 'question_bank', ['subject_id', 'exam_level'])
    op.create_index('ix_qb_subtopic_diff', 'question_bank', ['subtopic_id', 'difficulty_score'])
    op.create_index('ix_qb_active_diff', 'question_bank', ['is_active', 'difficulty_score'])

    # 6. user_subtopic_states table
    op.create_table(
        'user_subtopic_states',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('subject_id', sa.UUID(), nullable=False),
        sa.Column('subtopic_id', sa.UUID(), nullable=False),
        sa.Column('mastery_probability', sa.Float(), nullable=False, server_default='0.1'),
        sa.Column('memory_strength', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('stability_factor', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('forgetting_risk', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('student_ability_theta', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('current_interval_days', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('next_revision_due', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_revised_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('review_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('correct_streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('wrong_streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_correct', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('avg_response_time_ms', sa.Float(), nullable=True),
        sa.Column('is_mastered', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subtopic_id'], ['subject_subtopics.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'subtopic_id', name='uq_user_subtopic_state')
    )
    op.create_index('ix_user_subtopic_due', 'user_subtopic_states', ['user_id', 'next_revision_due'])
    op.create_index('ix_user_subject_risk', 'user_subtopic_states', ['user_id', 'subject_id', 'forgetting_risk'])


def downgrade() -> None:
    op.drop_table('user_subtopic_states')
    op.drop_table('question_bank')
    op.drop_table('student_subject_enrollments')
    op.drop_table('subject_subtopics')
    op.drop_table('subject_topics')
    op.drop_table('subjects')
