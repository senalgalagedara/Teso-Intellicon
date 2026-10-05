import os
import logging
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from app.config import settings

logger = logging.getLogger("revision_engine.db")

_pool: Optional[AsyncConnectionPool] = None

def get_connection_string() -> str:
    db_url = settings.DATABASE_URL or os.environ.get("DATABASE_URL", "")
    if not db_url:
        logger.warning("DATABASE_URL is not configured.")
    return db_url

async def init_db_pool():
    global _pool
    conn_str = get_connection_string()
    if not conn_str:
        return
    if _pool is None:
        try:
            # prepare_threshold=None prevents prepared statement errors on transaction poolers like Neon PgBouncer
            _pool = AsyncConnectionPool(
                conninfo=conn_str,
                min_size=1,
                max_size=10,
                kwargs={"row_factory": dict_row, "prepare_threshold": None}
            )
            await _pool.open()
            logger.info("Initialized AsyncConnectionPool for Neon Postgres")
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")

async def close_db_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Closed AsyncConnectionPool")

@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[psycopg.AsyncConnection, None]:
    global _pool
    if _pool is None:
        await init_db_pool()
    if _pool is None:
        raise RuntimeError("Database connection pool is not available. Please verify DATABASE_URL.")
    async with _pool.connection() as conn:
        yield conn
