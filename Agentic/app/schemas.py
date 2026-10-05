from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    supabase_configured: bool
    ai_configured: bool
    assessment_ai_provider: str = 'mock'
    assessment_ai_model: str = ''
    assessment_ai_configured: bool = False

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the speaker: user, assistant, system")
    content: str = Field(..., description="Message content")

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    system_prompt: Optional[str] = "You are an intelligent, helpful AI assistant."

class ChatResponse(BaseModel):
    reply: str
    model: str
    usage: Optional[Dict[str, Any]] = None

class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Input text to analyze")
    task: str = Field(default="summary", description="Task: summary, sentiment, key_points, action_items")

class TextAnalysisResponse(BaseModel):
    task: str
    result: str
    metadata: Dict[str, Any] = {}

class EmbeddingsRequest(BaseModel):
    texts: List[str]
    model: Optional[str] = None

class EmbeddingsResponse(BaseModel):
    count: int
    dimension: int
    embeddings: List[List[float]]

class DocumentProcessRequest(BaseModel):
    storage_path: str = Field(..., description="File path in Supabase storage")
    bucket_name: Optional[str] = None
    action: str = Field(default="summarize", description="Action to perform: summarize, extract_qa, analyze")
