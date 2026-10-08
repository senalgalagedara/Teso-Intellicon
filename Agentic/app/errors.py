"""Centralized HTTP error handling for the Teso FastAPI backend.

All HTTP errors leave the service as RFC 9457 "problem details" responses so
clients receive one stable, documented error shape instead of a mix of
{"detail": ...}, {"error": ...} and plain text. Unhandled exceptions are logged
server-side and returned as a generic 500 so no internal details leak to
clients. The access-log middleware attaches a request id to every response and
records method/path/status/duration so production errors are traceable.
"""
import logging
import time
import uuid
from contextvars import ContextVar
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger('teso.api')
request_id_var: ContextVar[str] = ContextVar('request_id', default='-')

_HANDLED = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    413: 'Payload Too Large',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
}


class AppError(Exception):
    """Application error mapped to a problem response.

    Prefer raising this over raw HTTPException when the detail phrase should be
    an error code the frontend can branch on; the HTTPException handler below
    still serves every existing ``raise HTTPException(...)`` call site.
    """

    def __init__(self, status_code: int, message: str, *, code: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.code = code or f'http_{status_code}'


def problem_response(
    status: int,
    detail: str,
    *,
    title: Optional[str] = None,
    type_: str = 'about:blank',
    instance: Optional[str] = None,
    errors: Optional[list[dict[str, Any]]] = None,
) -> JSONResponse:
    payload: dict[str, Any] = {
        'type': type_,
        'title': title or _HANDLED.get(status, 'Error'),
        'status': status,
        'detail': detail,
    }
    if instance:
        payload['instance'] = instance
    if errors is not None:
        payload['errors'] = errors
    return JSONResponse(
        status_code=status,
        content=payload,
        headers={'Content-Type': 'application/problem+json'},
    )


def install_exception_handlers(app: FastAPI) -> None:
    """Register uniform problem+json handlers on an application."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) and exc.detail.strip() else None
        response = problem_response(exc.status_code, detail or _HANDLED.get(exc.status_code, 'Error'))
        if exc.headers:
            for key, value in exc.headers.items():
                response.headers[key] = value
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return problem_response(exc.status_code, exc.message, type_=exc.code or 'about:blank')

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {
                'field': '.'.join(str(loc) for loc in err.get('loc', ())[1:]) or 'body',
                'message': err.get('msg', 'Invalid value'),
            }
            for err in exc.errors()
        ]
        logger.warning('Validation failed on %s %s: %s', request.method, request.url.path, errors)
        return problem_response(422, 'Request validation failed', errors=errors)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            'Unhandled exception on %s %s [request_id=%s]',
            request.method, request.url.path, request_id_var.get(),
        )
        return problem_response(
            500,
            'An unexpected server error occurred. Please try again later.',
            instance=request_id_var.get() if request_id_var.get() != '-' else None,
        )


class AccessLogMiddleware:
    """Assign a request id and record a terse access log line per request.

    The request id is exposed to clients as ``X-Request-ID`` so an end user can
    quote it to support, and it is included in the unhandled-exception log line
    above for correlation.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return
        request = Request(scope, receive)
        request_id = request.headers.get('x-request-id') or uuid.uuid4().hex[:16]
        token = request_id_var.set(request_id)
        start = time.perf_counter()
        status = 500

        async def send_wrapper(message):
            nonlocal status
            if message['type'] == 'http.response.start':
                status = message['status']
                headers = message.get('headers', [])
                if not any(k.lower() == b'x-request-id' for k, _v in headers):
                    headers = [*headers, (b'x-request-id', request_id.encode())]
                    message = {**message, 'headers': headers}
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            logger.exception('Request failed on %s %s [request_id=%s]', request.method, request.url.path, request_id)
            raise
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.info(
                '%s %s -> %d [request_id=%s] %.0fms',
                request.method, request.url.path, status, request_id, duration_ms,
            )
            request_id_var.reset(token)


def _install_logging() -> None:
    root = logging.getLogger('teso')
    if root.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s [%(name)s] %(message)s'))
    root.setLevel(logging.INFO)
    root.addHandler(handler)


_install_logging()