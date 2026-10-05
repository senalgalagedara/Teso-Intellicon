from fastapi import APIRouter, HTTPException
from app.schemas import (
    ChatRequest, ChatResponse,
    TextAnalysisRequest, TextAnalysisResponse,
    EmbeddingsRequest, EmbeddingsResponse
)
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Features"])

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        messages_dict = [{"role": m.role, "content": m.content} for m in request.messages]
        result = await ai_service.chat_completion(
            messages=messages_dict,
            model=request.model,
            temperature=request.temperature or 0.7,
            max_tokens=request.max_tokens or 1000,
            system_prompt=request.system_prompt
        )
        return ChatResponse(
            reply=result["reply"],
            model=result["model"],
            usage=result.get("usage")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze", response_model=TextAnalysisResponse)
async def analyze_endpoint(request: TextAnalysisRequest):
    try:
        result = await ai_service.analyze_text(text=request.text, task=request.task)
        return TextAnalysisResponse(
            task=result["task"],
            result=result["result"],
            metadata=result.get("metadata", {})
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/embeddings", response_model=EmbeddingsResponse)
async def embeddings_endpoint(request: EmbeddingsRequest):
    try:
        embeddings = await ai_service.generate_embeddings(texts=request.texts)
        dim = len(embeddings[0]) if embeddings else 0
        return EmbeddingsResponse(
            count=len(embeddings),
            dimension=dim,
            embeddings=embeddings
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
