from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class VideoBase(BaseModel):
    id: str
    title: str
    thumbnail: Optional[str] = None
    duration_seconds: Optional[int] = None
    channel_name: Optional[str] = None
    channel_id: Optional[str] = None
    language: Optional[str] = None
    is_short: bool = False

class BookmarkCreate(BaseModel):
    video_id: str

class BookmarkResponse(BaseModel):
    id: UUID
    user_id: UUID
    video_id: str
    created_at: datetime
    video: Optional[VideoBase] = None
    class Config:
        from_attributes = True

class NoteBase(BaseModel):
    video_id: str
    content: str
    timestamp_seconds: Optional[int] = None

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    content: str

class NoteResponse(NoteBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TimestampBase(BaseModel):
    video_id: str
    seconds: int
    label: str

class TimestampCreate(TimestampBase):
    pass

class TimestampResponse(TimestampBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class ProgressBase(BaseModel):
    video_id: str
    watched_seconds: int
    total_seconds: int

class ProgressCreate(ProgressBase):
    pass

class ProgressResponse(ProgressBase):
    id: UUID
    user_id: UUID
    last_watched_at: datetime
    class Config:
        from_attributes = True
