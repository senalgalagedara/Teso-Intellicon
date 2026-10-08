import redis
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
except Exception as e:
    logger.warning(f"Failed to connect to Redis: {e}")
    redis_client = None

def get_cache(key: str):
    if not redis_client:
        return None
    try:
        data = redis_client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        logger.warning(f"Redis get error: {e}")
        return None

def set_cache(key: str, value, ttl: int = 3600):
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl, json.dumps(value))
    except Exception as e:
        logger.warning(f"Redis set error: {e}")

def delete_cache(key: str):
    if not redis_client:
        return
    try:
        redis_client.delete(key)
    except Exception as e:
        logger.warning(f"Redis delete error: {e}")
