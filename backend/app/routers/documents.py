from fastapi import APIRouter, HTTPException
from app.schemas import DocumentProcessRequest
from app.services.supabase_service import supabase_service
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/documents", tags=["Documents & Storage AI"])

@router.post("/process")
async def process_document_with_ai(request: DocumentProcessRequest):
    if not supabase_service.is_configured:
        # Graceful response if Supabase credentials are still default
        return {
            "status": "simulated",
            "message": "Supabase credentials not configured in backend/.env. Returning simulation result.",
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
