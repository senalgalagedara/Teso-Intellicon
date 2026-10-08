import json
import redis
from typing import Dict, List, Optional
from app.core.config import settings

# Initialize Redis client using settings
# (Supports Redis or Upstash Redis URL)
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

class RedisExamService:
    @staticmethod
    def get_exam_cache_key(exam_id: str) -> str:
        return f"exam:metadata:{exam_id}"

    @staticmethod
    def get_active_users_set_key(exam_id: str) -> str:
        return f"exam:active_users:{exam_id}"

    @staticmethod
    def get_user_session_hash_key(exam_id: str, user_id: str) -> str:
        return f"exam:session:{exam_id}:{user_id}"

    @staticmethod
    def get_autosave_key(exam_id: str, user_id: str) -> str:
        return f"exam:autosave:{exam_id}:{user_id}"

    @staticmethod
    def get_leaderboard_key(exam_id: str) -> str:
        return f"exam:leaderboard:{exam_id}"

    @staticmethod
    def get_anti_cheat_key(exam_id: str, user_id: str) -> str:
        return f"exam:anticheat:{exam_id}:{user_id}"

    # 1. Exam Caching
    @classmethod
    def get_exam_metadata(cls, exam_id: str) -> Optional[Dict]:
        """
        Gets cached exam configuration.
        """
        data = redis_client.get(cls.get_exam_cache_key(exam_id))
        return json.loads(data) if data else None

    @classmethod
    def set_exam_metadata(cls, exam_id: str, exam_data: Dict, ttl: int = 3600):
        """
        Caches exam configuration metadata to avoid DB hits.
        """
        redis_client.setex(cls.get_exam_cache_key(exam_id), ttl, json.dumps(exam_data))

    # 2. Active Session Tracking (Non-blocking using Redis Sets)
    @classmethod
    def track_active_connection(cls, exam_id: str, user_id: str, client_ip: str):
        """
        Registers an active session for a student in an exam.
        Uses a Set of user_ids and a Hash to store status metadata.
        """
        set_key = cls.get_active_users_set_key(exam_id)
        hash_key = cls.get_user_session_hash_key(exam_id, user_id)
        
        # Add student id to active set
        redis_client.sadd(set_key, user_id)
        
        # Store detailed connection info in hash
        redis_client.hset(hash_key, mapping={
            "status": "connected",
            "ip": client_ip,
            "last_active": str(redis_client.time()[0])
        })
        # Set 5-minute expire on detailed status
        redis_client.expire(hash_key, 300)

    @classmethod
    def remove_active_connection(cls, exam_id: str, user_id: str):
        """
        Deregisters a student session when they leave.
        """
        redis_client.srem(cls.get_active_users_set_key(exam_id), user_id)
        redis_client.delete(cls.get_user_session_hash_key(exam_id, user_id))

    @classmethod
    def get_active_sessions(cls, exam_id: str) -> List[str]:
        """
        Scans active sessions using SSCAN to avoid blocking the single-threaded Redis engine.
        """
        set_key = cls.get_active_users_set_key(exam_id)
        active_users = []
        cursor = 0
        while True:
            cursor, keys = redis_client.sscan(set_key, cursor)
            active_users.extend(keys)
            if cursor == 0:
                break
        return active_users

    # 3. High-Performance Autosave (Debounced Writes)
    @classmethod
    def save_progress_draft(cls, exam_id: str, user_id: str, question_id: str, answer: str):
        """
        Saves student drafts directly to Redis hashes.
        Avoids database transaction pressure.
        """
        key = cls.get_autosave_key(exam_id, user_id)
        redis_client.hset(key, question_id, answer)
        redis_client.expire(key, 7200) # Keep draft for 2 hours

    @classmethod
    def get_progress_drafts(cls, exam_id: str, user_id: str) -> Dict[str, str]:
        """
        Retrieves all current unsaved answer drafts for a student.
        """
        return redis_client.hgetall(cls.get_autosave_key(exam_id, user_id)) or {}

    @classmethod
    def clear_autosave_drafts(cls, exam_id: str, user_id: str):
        """
        Clears drafts after successfully syncing to the SQL database.
        """
        redis_client.delete(cls.get_autosave_key(exam_id, user_id))

    # 4. Anti-Cheat Tracking (Tab Blurring, Suspicious IPs)
    @classmethod
    def log_anti_cheat_violation(cls, exam_id: str, user_id: str, event_type: str):
        """
        Logs integrity violations like 'tab_blur' or 'dev_tools_opened'.
        """
        key = cls.get_anti_cheat_key(exam_id, user_id)
        redis_client.hincrby(key, event_type, 1)
        redis_client.expire(key, 7200)

    @classmethod
    def get_violations(cls, exam_id: str, user_id: str) -> Dict[str, str]:
        """
        Gets anti-cheat violations log.
        """
        return redis_client.hgetall(cls.get_anti_cheat_key(exam_id, user_id)) or {}

    # 5. Live Sorted Leaderboard
    @classmethod
    def update_leaderboard_score(cls, exam_id: str, user_id: str, score: float):
        """
        Inserts/updates student scores on a live leaderboard.
        """
        redis_client.zadd(cls.get_leaderboard_key(exam_id), {user_id: score})

    @classmethod
    def get_top_students(cls, exam_id: str, limit: int = 50) -> List[Dict]:
        """
        Gets top student rankings in real-time.
        """
        results = redis_client.zrevrange(cls.get_leaderboard_key(exam_id), 0, limit - 1, withscores=True)
        return [{"user_id": user, "score": score} for user, score in results]
