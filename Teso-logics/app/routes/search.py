import asyncio
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.youtube import (
    search_videos,
    search_playlists,
    get_playlist_items,
    get_multiple_video_details,
    parse_duration,
    get_trending_videos,
)
from app.services.filter_service import filter_videos
from app.services.cache import get_cache, set_cache
from app.models.base_models import Video
import logging

logger = logging.getLogger(__name__)


async def _noop():
    """No-op coroutine used as a placeholder in asyncio.gather."""
    return None


router = APIRouter(prefix="/api/search", tags=["search"])


# ─────────────────────────────────────────────────────────────────────────────
# EDUCATION FILTER ENGINE
# ─────────────────────────────────────────────────────────────────────────────

EDU_KEYWORDS = [
    # English
    "tutorial", "lesson", "course", "lecture", "learn", "learning",
    "education", "educational", "explained", "explanation", "guide",
    "how to", "howto", "study", "studying", "class", "classroom",
    "training", "workshop", "exam", "revision", "notes", "theory",
    "concept", "introduction to", "beginner", "advanced", "intermediate",
    "mathematics", "math", "science", "biology", "chemistry", "physics",
    "history", "geography", "english grammar", "programming", "coding",
    "algorithm", "database", "networking", "python", "java", "react",
    "angular", "sql", "machine learning", "data science", "web dev",
    "full stack", "frontend", "backend", "devops", "cybersecurity",
    "accounting", "economics", "business studies", "ict", "statistics",
    # Sri Lankan education
    "o/l", "a/l", "ol", "al", "edexcel", "cambridge", "grade",
    "sri lanka syllabus", "local syllabus",
    # Sinhala romanized
    "padam", "igena", "igenagannam", "padura", "vibhagaya",
    "panthiya", "sinhala lesson", "sinhala tutorial", "sinhala class",
    # Tamil romanized
    "katral", "tamil lesson", "tamil tutorial", "tamil class",
    # Singlish
    "class eka", "lesson eka", "easy way", "understand karanna",
    "simple explain", "step by step",
]

NON_EDU_KEYWORDS = [
    "vlog", "prank", "funny", "comedy", "meme", "reaction",
    "challenge", "dance", "music video", " mv", "official video",
    "unboxing", "haul", "gossip", "drama", "roast",
    "tiktok", "trending", "viral", "ft.", "feat.",
    "official audio", "official mv", "lyrics", "song",
    "gameplay", "gaming", "playthrough", "let's play", "stream",
    "highlights", "match", " vs ", "battle", "fight", "wrestling",
    "news", "breaking news", "live news", "weather", "politics",
    "celebrity", "trailer", "teaser", "movie clip", "web series",
    "short film", "comedy skit", "stand up", "talk show",
    "cooking", "recipe", "food", "restaurant", "travel vlog",
    "fashion", "makeup", "skincare", "hairstyle",
    "funny moments", "best moments", "compilation",
    "motivational speech", "motivation video",
]

EDU_CATEGORY_IDS     = {"27", "28", "26", "22"}
NON_EDU_CATEGORY_IDS = {"10", "17", "24", "2", "25", "29"}
#                       Music  Sport  Ent  Cars  News  NGO


def _score(item: dict) -> int:
    title   = (item.get("title") or "").lower()
    channel = (item.get("channel_name") or "").lower()
    desc    = (item.get("description") or "").lower()
    text    = f"{title} {channel} {desc}"

    score = 0

    cat = str(item.get("category_id", ""))
    if cat in NON_EDU_CATEGORY_IDS:
        return 0
    if cat in EDU_CATEGORY_IDS:
        score += 30

    for kw in EDU_KEYWORDS:
        if kw in text:
            score += 7

    for kw in NON_EDU_KEYWORDS:
        if kw in text:
            score -= 25

    duration = item.get("duration_seconds", 0)
    title_lower = (item.get("title") or "").lower()
    if item.get("type") == "video":
        if duration <= 60 or "#short" in title_lower or item.get("is_short"):
            return 0          # always block Shorts
        elif duration >= 180:
            score += 8
    elif item.get("type") == "playlist":
        score += 20          # playlists are curated collections

    if int(item.get("viewCount") or 0) > 1000:
        score += 5

    return max(0, min(score, 100))


def _is_educational(item: dict, threshold: int = 25) -> bool:
    return _score(item) >= threshold


def _filter_educational(items: list) -> list:
    kept    = [v for v in items if _is_educational(v)]
    blocked = len(items) - len(kept)
    if blocked:
        logger.info(f"Education filter: blocked {blocked}/{len(items)} items")
    return kept


# ─────────────────────────────────────────────────────────────────────────────
# QUERY ENHANCER  (multilingual → YouTube-friendly)
# ─────────────────────────────────────────────────────────────────────────────

_TRANSLATIONS = {
    "ගණිතය": "mathematics", "විද්යාව": "science", "ඉතිහාසය": "history",
    "රසායනය": "chemistry",  "භෞතික":   "physics",  "ජීව":      "biology",
    "ගිණුම්": "accounting",  "ව්යාපාර": "business studies", "තොරතුරු": "ICT",
    "கணிதம்": "mathematics", "அறிவியல்": "science", "வரலாறு":  "history",
    "வேதியியல்": "chemistry","இயற்பியல்": "physics","உயிரியல்": "biology",
    "padam": "lesson",  "igena": "learn",  "class eka": "class",
    "lesson eka": "lesson",  "easy way": "easy tutorial",
    "o/l": "O/L Sri Lanka",  "a/l": "A/L Sri Lanka",
    "ol ": "O/L Sri Lanka ", "al ": "A/L Sri Lanka ",
    "katral": "learn",       "vakkuppu": "class",
}

_EDU_SIGNALS = {
    "tutorial", "lesson", "learn", "course", "lecture",
    "study", "class", "explain", "how to", "guide",
    "padam", "igena", "katral",
}


def _enhance_query(q: str) -> str:
    if not q:
        return q
    result = q
    for native, english in _TRANSLATIONS.items():
        result = result.replace(native, english)
    if not any(w in result.lower() for w in _EDU_SIGNALS):
        result = f"{result} tutorial"
    return result.strip()


# ─────────────────────────────────────────────────────────────────────────────
# SEARCH ROUTE
# ─────────────────────────────────────────────────────────────────────────────

@router.get("")
async def search(
    q: str = None,
    duration: str = "any",
    type: str = "both",
    language: str = "any",
    page: str = None,
    sort: str = "relevance",
    region: str = "LK",
    db: Session = Depends(get_db)
):
    enhanced_q = _enhance_query(q) if q else None
    cache_key  = f"search:{enhanced_q}:{duration}:{type}:{language}:{page}:{sort}:{region}"

    cached_data = get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        processed_videos    = []
        processed_playlists = []
        next_video_token    = None
        next_playlist_token = None

        # ── 1. Trending (no query) ────────────────────────────────────────────
        if not enhanced_q:
            raw_results = await get_trending_videos(region_code=region)
            items       = raw_results.get("items", [])
            details_map = {item["id"]: item for item in items}

            for item in items:
                vid_id = item.get("id")
                if not vid_id:
                    continue
                detail          = details_map.get(vid_id, {})
                snippet         = item.get("snippet", {})
                content_details = detail.get("contentDetails", {})
                statistics      = detail.get("statistics", {})
                duration_sec    = parse_duration(content_details.get("duration", "PT0S"))
                title           = snippet.get("title") or ""
                thumbs          = snippet.get("thumbnails", {})
                thumb_url       = (
                    thumbs.get("high", {}).get("url")
                    or thumbs.get("medium", {}).get("url")
                    or thumbs.get("default", {}).get("url")
                    or f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"
                )
                is_short        = duration_sec <= 60 or "#short" in title.lower()

                processed_videos.append({
                    "id":               vid_id,
                    "title":            title,
                    "description":      snippet.get("description", ""),
                    "thumbnail":        thumb_url,
                    "duration_seconds": duration_sec,
                    "channel_name":     snippet.get("channelTitle") or "YouTube Creator",
                    "channel_id":       snippet.get("channelId", ""),
                    "language":         detail.get("snippet", {}).get("defaultAudioLanguage"),
                    "category_id":      detail.get("snippet", {}).get("categoryId", ""),
                    "is_short":         is_short,
                    "publishedAt":      snippet.get("publishedAt", ""),
                    "viewCount":        int(statistics.get("viewCount", 0) or 0),
                    "likeCount":        int(statistics.get("likeCount", 0) or 0),
                    "type":             "video",
                })

        # ── 2. Search ─────────────────────────────────────────────────────────
        else:
            # Fire video search and playlist search IN PARALLEL to cut latency
            fetch_videos    = search_videos(enhanced_q, page_token=page, region_code=region, language=language) \
                              if type in ("video", "both") else None
            fetch_playlists = search_playlists(enhanced_q, page_token=page, region_code=region) \
                              if type in ("playlist", "both") else None

            raw_videos, raw_playlists = await asyncio.gather(
                fetch_videos    if fetch_videos    is not None else _noop(),
                fetch_playlists if fetch_playlists is not None else _noop(),
            )

            # 2a. Videos
            if raw_videos:
                items            = raw_videos.get("items", [])
                next_video_token = raw_videos.get("nextPageToken")

                video_ids   = [i["id"]["videoId"] for i in items if i["id"].get("kind") == "youtube#video"]
                details     = await get_multiple_video_details(video_ids)
                details_map = {d["id"]: d for d in details}

                for item in items:
                    vid_id = item["id"].get("videoId")
                    if not vid_id:
                        continue
                    detail          = details_map.get(vid_id, {})
                    snippet         = item.get("snippet", {})
                    content_details = detail.get("contentDetails", {})
                    statistics      = detail.get("statistics", {})
                    duration_sec    = parse_duration(content_details.get("duration", "PT0S"))
                    title           = snippet.get("title") or ""
                    thumbs          = snippet.get("thumbnails", {})
                    thumb_url       = (
                        thumbs.get("high", {}).get("url")
                        or thumbs.get("medium", {}).get("url")
                        or thumbs.get("default", {}).get("url")
                        or f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"
                    )
                    is_short        = duration_sec <= 60 or "#short" in title.lower()

                    processed_videos.append({
                        "id":               vid_id,
                        "title":            title,
                        "description":      snippet.get("description", ""),
                        "thumbnail":        thumb_url,
                        "duration_seconds": duration_sec,
                        "channel_name":     snippet.get("channelTitle") or "YouTube Creator",
                        "channel_id":       snippet.get("channelId", ""),
                        "language":         detail.get("snippet", {}).get("defaultAudioLanguage"),
                        "category_id":      detail.get("snippet", {}).get("categoryId", ""),
                        "is_short":         is_short,
                        "publishedAt":      snippet.get("publishedAt", ""),
                        "viewCount":        int(statistics.get("viewCount", 0) or 0),
                        "likeCount":        int(statistics.get("likeCount", 0) or 0),
                        "type":             "video",
                    })

            # 2b. Playlists
            if raw_playlists:
                next_playlist_token = raw_playlists.get("nextPageToken")

                for item in raw_playlists.get("items", []):
                    if item["id"].get("kind") != "youtube#playlist":
                        continue
                    playlist_id = item["id"].get("playlistId")
                    if not playlist_id:
                        continue
                    snippet = item.get("snippet", {})
                    thumbs  = snippet.get("thumbnails", {})
                    thumb_url = (
                        thumbs.get("high", {}).get("url")
                        or thumbs.get("medium", {}).get("url")
                        or thumbs.get("default", {}).get("url")
                        or ""
                    )
                    processed_playlists.append({
                        "id":               playlist_id,
                        "title":            snippet.get("title") or "",
                        "description":      snippet.get("description", ""),
                        "thumbnail":        thumb_url,
                        "channel_name":     snippet.get("channelTitle") or "YouTube Creator",
                        "channel_id":       snippet.get("channelId", ""),
                        "publishedAt":      snippet.get("publishedAt", ""),
                        "type":             "playlist",
                        "duration_seconds": 9999,
                        "category_id":      "",
                        "viewCount":        0,
                        "likeCount":        0,
                        "is_short":         False,
                    })

        # Commit DB
        for v in processed_videos:
            _save_video_to_db(db, v, v["id"])
        try:
            db.commit()
        except Exception as e:
            logger.warning(f"DB commit failed (non-fatal): {e}")
            db.rollback()

        # ── 3. EDUCATION GATE — blocks everything non-educational ─────────────
        filtered_videos    = _filter_educational(processed_videos)
        filtered_playlists = _filter_educational(processed_playlists)

        # ── 4. Smart filter (duration, language, sort) ────────────────────────
        filters         = {"duration": duration, "language": language, "type": "video", "sort": sort}
        filtered_videos = filter_videos(filtered_videos, filters)

        # ── 5. Attach score (optional, useful for UI badges) ──────────────────
        for v in filtered_videos:
            v["edu_score"] = _score(v)
        for p in filtered_playlists:
            p["edu_score"] = _score(p)

        response_data = {
            "query":              q,
            "enhanced_query":     enhanced_q,
            "results":            filtered_videos,
            "playlists":          filtered_playlists,
            "nextPageToken":      next_video_token,
            "nextPlaylistToken":  next_playlist_token,
        }

        set_cache(cache_key, response_data, ttl=3600)
        return response_data

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise


# ─────────────────────────────────────────────────────────────────────────────
# PLAYLIST ITEMS ROUTE
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/playlist/{playlist_id}/items")
async def get_playlist_video_items(playlist_id: str):
    cache_key = f"playlist_items:{playlist_id}"
    cached    = get_cache(cache_key)
    if cached:
        return cached
    data = await get_playlist_items(playlist_id)
    set_cache(cache_key, data, ttl=3600)
    return data


# ─────────────────────────────────────────────────────────────────────────────
# DB HELPER
# ─────────────────────────────────────────────────────────────────────────────

def _save_video_to_db(db: Session, video_data: dict, vid_id: str):
    try:
        existing = db.query(Video).filter(Video.id == vid_id).first()
        if not existing:
            db.add(Video(
                id=vid_id,
                title=video_data["title"],
                thumbnail=video_data["thumbnail"],
                duration_seconds=video_data["duration_seconds"],
                channel_name=video_data["channel_name"],
                channel_id=video_data["channel_id"],
                language=video_data["language"],
                is_short=video_data["is_short"],
            ))
            db.flush()
    except Exception as db_err:
        logger.warning(f"DB insert skipped for video {vid_id}: {db_err}")
        db.rollback()
