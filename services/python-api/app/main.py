import os
import json
from fastapi import FastAPI, Depends, Request, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Set
from app.auth import verify_supabase_jwt, UserClaims
from app.redis_client import ExamRedisService

app = FastAPI(
    title="TESO Scalable Exam Platform API",
    description="Python FastAPI backend handling heavy exam business logic, scaling, real-time sync, and Redis caching.",
    version="1.0.0"
)

# Enable CORS for both frontend domains
ALLOWED_ORIGINS = [
    "https://teso.lk",
    "https://exam.teso.lk",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://study.teso.localhost:3000",
    "http://exam.teso.localhost:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Models ---
class HeartbeatPayload(BaseModel):
    session_id: str = Field(..., description="Active exam session UUID")

class AutosavePayload(BaseModel):
    session_id: str
    question_number: int
    selected_option: int

class LeaderboardScorePayload(BaseModel):
    session_id: str
    score: float

class SubmitPayload(BaseModel):
    session_id: str

# --- REST Endpoints ---

@app.get("/health")
def health_check():
    redis_healthy = ExamRedisService.is_healthy()
    return {
        "status": "healthy" if redis_healthy else "degraded",
        "services": {
            "api": "online",
            "redis": "connected" if redis_healthy else "offline"
        }
    }

@app.post("/api/exams/heartbeat")
async def student_heartbeat(
    payload: HeartbeatPayload, 
    request: Request,
    user: UserClaims = Depends(verify_supabase_jwt)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown")
    
    res = ExamRedisService.update_heartbeat(
        session_id=payload.session_id,
        user_id=user.id,
        client_ip=client_ip,
        user_agent=user_agent
    )
    
    if res.get("cheat_detected"):
        return {
            "status": "warning",
            "message": "Multiple active devices detected for this user ID. Host notified.",
            "code": "CONCURRENT_SESSION_DETECTED"
        }
        
    return {"status": "ok", "message": "Heartbeat updated successfully"}

@app.post("/api/exams/autosave")
def autosave_answers(
    payload: AutosavePayload,
    user: UserClaims = Depends(verify_supabase_jwt)
):
    success = ExamRedisService.autosave_answers(
        session_id=payload.session_id,
        user_id=user.id,
        question_number=payload.question_number,
        selected_option=payload.selected_option
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Autosave cache temporarily unavailable"
        )
    return {"status": "saved"}

@app.get("/api/exams/autosave/{session_id}")
def get_autosaved_answers(
    session_id: str,
    user: UserClaims = Depends(verify_supabase_jwt)
):
    answers = ExamRedisService.get_autosaved_answers(session_id, user.id)
    return {"session_id": session_id, "user_id": user.id, "answers": answers}

@app.post("/api/exams/leaderboard/submit")
def submit_leaderboard_score(
    payload: LeaderboardScorePayload,
    user: UserClaims = Depends(verify_supabase_jwt)
):
    ExamRedisService.update_leaderboard_score(
        session_id=payload.session_id,
        user_id=user.id,
        email=user.email,
        score=payload.score
    )
    return {"status": "score_cached"}

@app.get("/api/exams/leaderboard/{session_id}")
def get_exam_leaderboard(session_id: str, limit: int = 10):
    board = ExamRedisService.get_leaderboard(session_id, limit)
    return {"session_id": session_id, "leaderboard": board}

@app.get("/api/exams/alerts/{session_id}")
def get_session_alerts(
    session_id: str,
    user: UserClaims = Depends(verify_supabase_jwt)
):
    # Verify authority: Only host and admin can view security alert flags
    if user.role not in ["host", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only exam hosts and admins can retrieve security alert flags."
        )
    alerts = ExamRedisService.get_cheat_alerts(session_id)
    return {"session_id": session_id, "alerts": alerts}

# --- WebSocket Realtime Coordination Server ---

class ExamWebSocketManager:
    def __init__(self):
        # Maps session_id -> set of connected websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        self.active_connections[session_id].add(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            # Gather connections to iterate safely in case socket closes during iteration
            for connection in list(self.active_connections[session_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(connection, session_id)

ws_manager = ExamWebSocketManager()

@app.websocket("/ws/exams/{session_id}")
async def exam_websocket_endpoint(websocket: WebSocket, session_id: str):
    await ws_manager.connect(websocket, session_id)
    try:
        # Send initial status
        active_count = len(ExamRedisService.get_active_students(session_id))
        await websocket.send_json({
            "type": "presence_update",
            "active_participants": active_count
        })

        while True:
            # Listen for incoming client messages (e.g. host commands, admin alerts)
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # Broadcast received events (like Host starts exam or ends exam)
            await ws_manager.broadcast_to_session(session_id, payload)
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, session_id)
        # Notify remaining listeners of presence count update
        active_count = len(ExamRedisService.get_active_students(session_id))
        await ws_manager.broadcast_to_session(session_id, {
            "type": "presence_update",
            "active_participants": active_count
        })
    except Exception as e:
        print(f"WS error: {e}")
        ws_manager.disconnect(websocket, session_id)
