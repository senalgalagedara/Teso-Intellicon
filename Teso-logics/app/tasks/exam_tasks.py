from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.redis_service import RedisExamService
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

def sync_autosave_to_postgres(exam_id: str, user_id: str):
    """
    Worker task to flush student progress from Redis cache to Postgres.
    """
    drafts = RedisExamService.get_progress_drafts(exam_id, user_id)
    if not drafts:
        logger.info(f"No drafts found to sync for user {user_id} on exam {exam_id}.")
        return
        
    db: Session = SessionLocal()
    try:
        # Check if the exam attempt exists
        # Execute parameterized SQL to create or update student answers in bulk
        for question_id, answer_text in drafts.items():
            # Example using raw SQL / text execution to work regardless of existing ORM details
            db.execute(
                text("""
                    INSERT INTO public.student_answers (user_id, exam_id, question_id, answer_text, updated_at)
                    VALUES (:user_id, :exam_id, :question_id, :answer_text, NOW())
                    ON CONFLICT (user_id, exam_id, question_id) 
                    DO UPDATE SET answer_text = EXCLUDED.answer_text, updated_at = NOW();
                """),
                {
                    "user_id": user_id,
                    "exam_id": exam_id,
                    "question_id": question_id,
                    "answer_text": answer_text
                }
            )
        db.commit()
        logger.info(f"Successfully synced autosave for user {user_id} on exam {exam_id}.")
        
        # Clear the temporary Redis drafts now that they are persisted in Postgres
        RedisExamService.clear_autosave_drafts(exam_id, user_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to sync autosave for user {user_id}: {str(e)}")
        raise e
    finally:
        db.close()
