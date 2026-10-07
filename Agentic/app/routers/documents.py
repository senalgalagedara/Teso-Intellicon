from fastapi import APIRouter, HTTPException
from app.errors import AppError
from app.schemas import DocumentProcessRequest
from app.services.supabase_service import supabase_service
from app.services.ai_service import ai_service
from app.config import settings

router = APIRouter(prefix="/api/documents", tags=["Documents & Storage AI"])

@router.post("/process")
async def process_document_with_ai(request: DocumentProcessRequest):
    bucket = request.bucket_name or settings.SUPABASE_STORAGE_BUCKET
    if bucket != settings.SUPABASE_STORAGE_BUCKET or bucket == settings.ASSESSMENT_STORAGE_BUCKET:
        raise HTTPException(403, 'Private assessment media requires assessment-session authorisation')
    path = request.storage_path
    if path.startswith('/') or any(part in ('', '.', '..') for part in path.split('/')) or any(c in path for c in ('\\', '%', ':', '?', '#')):
        raise HTTPException(422, 'Invalid document storage path')
    if not supabase_service.is_configured:
        # Graceful response if Supabase credentials are still default
        return {
            "status": "simulated",
            "message": "Supabase credentials not configured in Agentic/.env. Returning simulation result.",
            "storage_path": request.storage_path,
            "action": request.action,
            "ai_result": f"Document at '{request.storage_path}' was analyzed for '{request.action}'. Key topics: Supabase Storage Integration, Full-stack Architecture, Python AI Pipeline."
        }

    try:
        # 1. Download document from Supabase storage
        file_bytes = await supabase_service.download_file(
            file_path=request.storage_path,
            bucket_name=request.bucket_name
        )
    except Exception as exc:
        # Logged server-side by the global handler; clients only see a generic 502.
        raise AppError(502, 'The document storage service is currently unavailable') from exc
    # 2. Decode text if possible
    try:
        content_text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_text = f"[Binary file of size {len(file_bytes)} bytes]"

    # 3. Analyze with AI service
    analysis = await ai_service.analyze_text(text=content_text[:3000], task=request.action)
    return {
        "status": "success",
        "storage_path": request.storage_path,
        "action": request.action,
        "ai_result": analysis["result"],
        "metadata": analysis.get("metadata", {})
    }
