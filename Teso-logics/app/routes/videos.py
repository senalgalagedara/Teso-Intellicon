from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.base_models import Video
from app.services.youtube import get_video_details, parse_duration
from app.schemas.schemas import VideoBase

router = APIRouter(prefix="/api/videos", tags=["videos"])

@router.get("/{video_id}", response_model=VideoBase)
async def get_video(video_id: str, db: Session = Depends(get_db)):
    # 1. Check DB
    video = db.query(Video).filter(Video.id == video_id).first()
    if video:
        return video
        
    # 2. Fetch from YouTube
    detail = await get_video_details(video_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Video not found")
        
    snippet = detail.get("snippet", {})
    content_details = detail.get("contentDetails", {})
    duration_sec = parse_duration(content_details.get("duration", "PT0S"))
    
    new_video = Video(
        id=video_id,
        title=snippet.get("title"),
        thumbnail=snippet.get("thumbnails", {}).get("high", {}).get("url"),
        duration_seconds=duration_sec,
        channel_name=snippet.get("channelTitle"),
        channel_id=snippet.get("channelId"),
        language=snippet.get("defaultAudioLanguage"),
        is_short=duration_sec < 60
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    return new_video

@router.get("/{video_id}/transcript")
async def get_transcript(video_id: str):
    return {"message": "coming soon"}
