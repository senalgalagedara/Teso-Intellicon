from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.base_models import User, Bookmark, Video, Note, Timestamp, Progress
from app.schemas.schemas import (
    BookmarkCreate, BookmarkResponse, 
    NoteCreate, NoteUpdate, NoteResponse,
    TimestampCreate, TimestampResponse,
    ProgressCreate, ProgressResponse
)
from app.services.youtube import get_video_details, parse_duration

router = APIRouter(prefix="/api/learning", tags=["learning"])

# --- Bookmarks ---
@router.get("/bookmarks", response_model=List[BookmarkResponse])
def get_bookmarks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bookmarks = db.query(Bookmark).filter(Bookmark.user_id == current_user.id).all()
    # Join with Videos is handled by relationship if defined, but here I'll just return it
    # For simplicity, let's manually attach video info if needed or rely on Frontend to fetch
    # But request says "join with Videos table to return full video info"
    # I'll update the model later or just do a manual join here.
    results = []
    for b in bookmarks:
        video = db.query(Video).filter(Video.id == b.video_id).first()
        results.append({
            "id": b.id,
            "user_id": b.user_id,
            "video_id": b.video_id,
            "created_at": b.created_at,
            "video": video
        })
    return results

@router.post("/bookmarks", response_model=BookmarkResponse)
async def create_bookmark(
    bookmark_in: BookmarkCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Check if video exists in DB
    video = db.query(Video).filter(Video.id == bookmark_in.video_id).first()
    if not video:
        # Fetch from YouTube
        detail = await get_video_details(bookmark_in.video_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Video not found on YouTube")
        
        snippet = detail.get("snippet", {})
        content_details = detail.get("contentDetails", {})
        duration_sec = parse_duration(content_details.get("duration", "PT0S"))
        
        video = Video(
            id=bookmark_in.video_id,
            title=snippet.get("title"),
            thumbnail=snippet.get("thumbnails", {}).get("high", {}).get("url"),
            duration_seconds=duration_sec,
            channel_name=snippet.get("channelTitle"),
            channel_id=snippet.get("channelId"),
            language=snippet.get("defaultAudioLanguage"),
            is_short=duration_sec < 60
        )
        db.add(video)
        db.commit()
        db.refresh(video)

    # Check if already bookmarked
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id, 
        Bookmark.video_id == bookmark_in.video_id
    ).first()
    if existing:
        return {**existing.__dict__, "video": video}

    new_bookmark = Bookmark(user_id=current_user.id, video_id=bookmark_in.video_id)
    db.add(new_bookmark)
    db.commit()
    db.refresh(new_bookmark)
    return {**new_bookmark.__dict__, "video": video}

@router.delete("/bookmarks/{video_id}")
def delete_bookmark(
    video_id: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    bookmark = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id, 
        Bookmark.video_id == video_id
    ).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    db.delete(bookmark)
    db.commit()
    return {"message": "Bookmark deleted"}


# --- Notes ---
@router.get("/notes", response_model=List[NoteResponse])
def get_notes(
    video_id: Optional[str] = None, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(Note).filter(Note.user_id == current_user.id)
    if video_id:
        query = query.filter(Note.video_id == video_id)
    return query.all()

@router.post("/notes", response_model=NoteResponse)
def create_note(
    note_in: NoteCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    new_note = Note(
        user_id=current_user.id,
        video_id=note_in.video_id,
        content=note_in.content,
        timestamp_seconds=note_in.timestamp_seconds
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.put("/notes/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: str, 
    note_in: NoteUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    note.content = note_in.content
    db.commit()
    db.refresh(note)
    return note

@router.delete("/notes/{note_id}")
def delete_note(
    note_id: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}


# --- Timestamps ---
@router.get("/timestamps", response_model=List[TimestampResponse])
def get_timestamps(
    video_id: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    return db.query(Timestamp).filter(
        Timestamp.user_id == current_user.id, 
        Timestamp.video_id == video_id
    ).all()

@router.post("/timestamps", response_model=TimestampResponse)
def create_timestamp(
    ts_in: TimestampCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    new_ts = Timestamp(
        user_id=current_user.id,
        video_id=ts_in.video_id,
        seconds=ts_in.seconds,
        label=ts_in.label
    )
    db.add(new_ts)
    db.commit()
    db.refresh(new_ts)
    return new_ts

@router.delete("/timestamps/{timestamp_id}")
def delete_timestamp(
    timestamp_id: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    ts = db.query(Timestamp).filter(Timestamp.id == timestamp_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timestamp not found")
    if ts.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(ts)
    db.commit()
    return {"message": "Timestamp deleted"}


# --- Progress ---
@router.get("/progress", response_model=List[ProgressResponse])
def get_all_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.watched_seconds > 0
    ).order_by(Progress.last_watched_at.desc()).limit(10).all()

@router.get("/progress/{video_id}", response_model=ProgressResponse)
def get_video_progress(
    video_id: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    progress = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.video_id == video_id
    ).first()
    if not progress:
        raise HTTPException(status_code=404, detail="No progress found for this video")
    return progress

@router.post("/progress", response_model=ProgressResponse)
def upsert_progress(
    prog_in: ProgressCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    progress = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.video_id == prog_in.video_id
    ).first()
    
    if progress:
        progress.watched_seconds = prog_in.watched_seconds
        progress.total_seconds = prog_in.total_seconds
    else:
        progress = Progress(
            user_id=current_user.id,
            video_id=prog_in.video_id,
            watched_seconds=prog_in.watched_seconds,
            total_seconds=prog_in.total_seconds
        )
        db.add(progress)
    
    db.commit()
    db.refresh(progress)
    return progress
