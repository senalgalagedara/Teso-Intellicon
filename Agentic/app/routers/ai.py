from fastapi import APIRouter
from app.schemas import (
    ChatRequest, ChatResponse,
    TextAnalysisRequest, TextAnalysisResponse,
    EmbeddingsRequest, EmbeddingsResponse
)
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Features"])

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
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

@router.post("/analyze", response_model=TextAnalysisResponse)
async def analyze_endpoint(request: TextAnalysisRequest):
    result = await ai_service.analyze_text(text=request.text, task=request.task)
    return TextAnalysisResponse(
        task=result["task"],
        result=result["result"],
        metadata=result.get("metadata", {})
    )

@router.post("/embeddings", response_model=EmbeddingsResponse)
async def embeddings_endpoint(request: EmbeddingsRequest):
    embeddings = await ai_service.generate_embeddings(texts=request.texts)
    dim = len(embeddings[0]) if embeddings else 0
    return EmbeddingsResponse(
        count=len(embeddings),
        dimension=dim,
        embeddings=embeddings
    )