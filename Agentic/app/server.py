import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn
from app.config import settings

def main():
    if settings.ENVIRONMENT == 'production':
        if not settings.DATABASE_URL.startswith(('postgresql://', 'postgres://', 'postgresql+psycopg://')):
            raise SystemExit('Production requires a PostgreSQL DATABASE_URL shared by API and worker.')
        if len(settings.ASSESSMENT_BRIDGE_SECRET) < 32:
            raise SystemExit('Set the shared ASSESSMENT_BRIDGE_SECRET before starting the hosted API.')
        if settings.ALLOW_DEVELOPMENT_CONTENT:
            raise SystemExit('Disable ALLOW_DEVELOPMENT_CONTENT on the hosted production API.')
    uvicorn.run('app.main:app', host=settings.HOST, port=settings.PORT, loop='asyncio', reload=(settings.ENVIRONMENT == 'development'))


if __name__ == '__main__':
    main()
