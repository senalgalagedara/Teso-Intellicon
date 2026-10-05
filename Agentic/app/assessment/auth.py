"""Short-lived, body-bound identity assertions issued only by the Next.js server."""
import base64
import hashlib
import hmac
import json
import time
from fastapi import Request, HTTPException
from app.config import settings
from app.assessment.content import Strict

class Identity(Strict):
    student_id: str
    is_development: bool = False

async def authenticate(request: Request) -> Identity:
    secret = settings.ASSESSMENT_BRIDGE_SECRET
    if len(secret) < 32:
        raise HTTPException(503, 'Assessment identity bridge is not configured')
    try:
        payload, signature = request.headers.get('x-teso-identity', '').split('.')
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature): raise ValueError()
        data = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
        now = time.time()
        if not now - 60 <= data['issued_at'] <= now + 5: raise ValueError()
        if data['method'] != request.method or data['path'] != request.url.path: raise ValueError()
        if data['body_sha256'] != hashlib.sha256(await request.body()).hexdigest(): raise ValueError()
        identity = Identity(student_id=data['student_id'], is_development=data['is_development'])
        if identity.is_development and (settings.ENVIRONMENT != 'development' or not settings.ALLOW_DEVELOPMENT_CONTENT): raise ValueError()
        if not identity.student_id or len(identity.student_id) > 200: raise ValueError()
        return identity
    except (ValueError, KeyError, TypeError):
        raise HTTPException(401, 'Valid authenticated identity required') from None
