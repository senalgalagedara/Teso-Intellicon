from redis import Redis
from rq import Queue
from app.core.config import settings

# Setup connection for background queue workers
redis_conn = Redis.from_url(settings.REDIS_URL)
task_queue = Queue("teso_tasks", connection=redis_conn)

def enqueue_task(func, *args, **kwargs):
    """
    Pushes a task to the background queue.
    """
    return task_queue.enqueue(func, *args, **kwargs)
