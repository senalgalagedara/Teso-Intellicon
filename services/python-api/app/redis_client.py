import os
import json
import redis
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Redis Configuration (supporting Upstash connection strings)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Setup Redis connection pool
try:
    redis_pool = redis.ConnectionPool.from_url(
        REDIS_URL, 
        decode_responses=True,
        socket_timeout=5,
        retry_on_timeout=True
    )
    r = redis.Redis(connection_pool=redis_pool)
except Exception as e:
    print(f"Failed to initialize Redis connection: {e}")
    r = None

class ExamRedisService:
    @staticmethod
    def is_healthy() -> bool:
        if not r:
            return False
        try:
            return r.ping()
        except Exception:
            return False

    # --- 1. HEARTBEAT & ACTIVE SESSION TRACKING ---
    @staticmethod
    def update_heartbeat(session_id: str, user_id: str, client_ip: str, user_agent: str) -> dict:
        """
        Record a student's heartbeat to track presence and detect session hijacking.
        """
        if not r:
            return {"status": "redis_offline"}
            
        now_ts = datetime.utcnow().timestamp()
        heartbeat_key = f"exam:session:{session_id}:active"
        session_info_key = f"student:active_session:{user_id}"
        
        # Anti-cheat check: check if the student is logged in from another IP
        existing_session = r.get(session_info_key)
        cheat_flag = False
        
        if existing_session:
            sess = json.loads(existing_session)
            # If session is active (last heartbeat < 15 seconds) and IP has changed, flag it!
            if now_ts - sess["timestamp"] < 15.0 and sess["ip"] != client_ip:
                cheat_flag = True
                # Log anti-cheat warning in Redis set
                r.sadd(f"exam:session:{session_id}:cheat_alerts", json.dumps({
                    "user_id": user_id,
                    "ip_1": sess["ip"],
                    "ip_2": client_ip,
                    "timestamp": now_ts,
                    "user_agent_1": sess["user_agent"],
                    "user_agent_2": user_agent
                }))
        
        # Save session tracking info
        session_data = {
            "ip": client_ip,
            "user_agent": user_agent,
            "timestamp": now_ts
        }
        r.set(session_info_key, json.dumps(session_data), ex=30)  # expires in 30 seconds
        
        # Update session active hash map
        r.hset(heartbeat_key, user_id, now_ts)
        # Session hash expires after exam session duration + buffer (e.g. 3 hours)
        r.expire(heartbeat_key, 10800) 
        
        return {"status": "success", "cheat_detected": cheat_flag}

    @staticmethod
    def get_active_students(session_id: str) -> list:
        """
        Returns list of user IDs who sent a heartbeat in the last 15 seconds.
        """
        if not r:
            return []
        heartbeat_key = f"exam:session:{session_id}:active"
        all_students = r.hgetall(heartbeat_key)
        now_ts = datetime.utcnow().timestamp()
        
        active_users = []
        for user_id, timestamp_str in all_students.items():
            if now_ts - float(timestamp_str) < 15.0:
                active_users.append(user_id)
            else:
                # Cleanup expired student heartbeats from the hash map
                r.hdel(heartbeat_key, user_id)
                
        return active_users

    # --- 2. INCREMENTAL AUTOSAVE SUPPORT ---
    @staticmethod
    def autosave_answers(session_id: str, user_id: str, question_number: int, selected_option: int) -> bool:
        """
        Temporarily caches user answer selection in Redis to protect against packet loss.
        """
        if not r:
            return False
        autosave_key = f"exam:session:{session_id}:answers:{user_id}"
        r.hset(autosave_key, str(question_number), str(selected_option))
        r.expire(autosave_key, 86400)  # expires in 24 hours
        return True

    @staticmethod
    def get_autosaved_answers(session_id: str, user_id: str) -> dict:
        """
        Retrieves all cached autosaved answers for a user in the current session.
        """
        if not r:
            return {}
        autosave_key = f"exam:session:{session_id}:answers:{user_id}"
        return r.hgetall(autosave_key)

    @staticmethod
    def clear_autosaved_answers(session_id: str, user_id: str):
        """
        Removes the cached answers from Redis (called upon PostgreSQL final submission).
        """
        if not r:
            return
        autosave_key = f"exam:session:{session_id}:answers:{user_id}"
        r.delete(autosave_key)

    # --- 3. REAL-TIME LEADERBOARDS ---
    @staticmethod
    def update_leaderboard_score(session_id: str, user_id: str, email: str, score: float):
        """
        Updates the exam session's live leaderboard with the student's score.
        """
        if not r:
            return
        leaderboard_key = f"exam:session:{session_id}:leaderboard"
        member_name = f"{user_id}:{email}"
        r.zadd(leaderboard_key, {member_name: score})
        r.expire(leaderboard_key, 86400) # Keep leaderboard for 24 hours

    @staticmethod
    def get_leaderboard(session_id: str, limit: int = 10) -> list:
        """
        Retrieves top scores in descending order.
        """
        if not r:
            return []
        leaderboard_key = f"exam:session:{session_id}:leaderboard"
        raw_leaderboard = r.zrevrange(leaderboard_key, 0, limit - 1, withscores=True)
        
        parsed = []
        for index, (member, score) in enumerate(raw_leaderboard):
            parts = member.split(":")
            uid = parts[0]
            email = parts[1] if len(parts) > 1 else ""
            parsed.append({
                "rank": index + 1,
                "user_id": uid,
                "email": email,
                "score": score
            })
        return parsed

    # --- 4. CHEAT ALERTS ---
    @staticmethod
    def get_cheat_alerts(session_id: str) -> list:
        if not r:
            return []
        alerts_key = f"exam:session:{session_id}:cheat_alerts"
        raw_alerts = r.smembers(alerts_key)
        return [json.loads(a) for a in raw_alerts]
