import httpx
import re
from fastapi import HTTPException
from app.core.config import settings

BASE = "https://www.googleapis.com/youtube/v3"
KEY = settings.YOUTUBE_API_KEY

# Shared HTTP client — reuses TCP connections across all API calls (no per-call handshake)
_http_client = httpx.AsyncClient(timeout=10, http2=False)


def parse_duration(iso_duration: str) -> int:
    """
    Parses ISO 8601 duration string (e.g., PT14M53S, PT1H2M10S) into total seconds.
    """
    if not iso_duration:
        return 0
    pattern = re.compile(r'P(?:T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?)?')
    match = pattern.match(iso_duration)
    if not match:
        return 0

    hours = int(match.group('hours') or 0)
    minutes = int(match.group('minutes') or 0)
    seconds = int(match.group('seconds') or 0)

    return hours * 3600 + minutes * 60 + seconds


async def fetch_from_youtube(url: str, params: dict):
    params["key"] = KEY
    response = await _http_client.get(url, params=params)
    if response.status_code != 200:
        return {"error": response.json(), "status_code": response.status_code}
    return response.json()


async def search_videos(query: str, page_token: str = None, type_filter: str = "video",
                        region_code: str = "LK", language: str = "any") -> dict:
    """Search YouTube for videos only."""
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 20,
        "regionCode": region_code,
    }
    # Language filtering at API level
    if language and language != "any":
        params["relevanceLanguage"] = language
    else:
        params["relevanceLanguage"] = "en"

    if page_token:
        params["pageToken"] = page_token

    data = await fetch_from_youtube(f"{BASE}/search", params)
    if "error" in data:
        raise HTTPException(status_code=data["status_code"], detail=f"YouTube API error: {data['error']}")
    return data


async def search_playlists(query: str, page_token: str = None, region_code: str = "LK") -> dict:
    """Search YouTube playlists separately."""
    params = {
        "part": "snippet",
        "q": query,
        "type": "playlist",
        "maxResults": 10,
        "regionCode": region_code,
        "relevanceLanguage": "en",
    }
    if page_token:
        params["pageToken"] = page_token

    data = await fetch_from_youtube(f"{BASE}/search", params)
    if "error" in data:
        raise HTTPException(status_code=data["status_code"], detail=f"YouTube playlist search failed: {data['error']}")
    return data


async def get_playlist_items(playlist_id: str) -> dict:
    """Get all video items inside a playlist (up to 50)."""
    params = {
        "part": "snippet,contentDetails",
        "playlistId": playlist_id,
        "maxResults": 50,
    }
    data = await fetch_from_youtube(f"{BASE}/playlistItems", params)
    if "error" in data:
        raise HTTPException(status_code=data["status_code"], detail=f"YouTube playlist items failed: {data['error']}")

    # Extract video IDs and return clean list
    items = []
    for item in data.get("items", []):
        snippet = item.get("snippet", {})
        vid_id = snippet.get("resourceId", {}).get("videoId")
        if vid_id:
            items.append({
                "id": vid_id,
                "title": snippet.get("title"),
                "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url"),
                "position": snippet.get("position"),
                "publishedAt": snippet.get("publishedAt"),
            })

    return {
        "playlist_id": playlist_id,
        "total": len(items),
        "videos": items,
    }


async def get_video_details(video_id: str):
    params = {
        "part": "snippet,contentDetails,statistics",
        "id": video_id,
    }
    data = await fetch_from_youtube(f"{BASE}/videos", params)
    if "error" in data:
        raise HTTPException(status_code=data["status_code"], detail=f"YouTube API error: {data['error']}")
    if not data.get("items"):
        return None
    return data["items"][0]


async def get_multiple_video_details(video_ids: list) -> list:
    """Batch fetch video details (duration, stats, category). Max 50 per call."""
    if not video_ids:
        return []

    params = {
        "part": "snippet,contentDetails,statistics",
        "id": ",".join(video_ids[:50]),
    }
    data = await fetch_from_youtube(f"{BASE}/videos", params)
    if "error" in data:
        raise HTTPException(status_code=data["status_code"], detail=f"YouTube video details failed: {data['error']}")
    return data.get("items", [])


async def get_trending_videos(category_id: str = "27", max_results: int = 20, region_code: str = "LK"):
    """
    Fetch popular educational videos. Category 27 is Education.
    Defaults to Sri Lanka (LK) region.
    Falls back to broader search if category not found for this region.
    """
    params = {
        "part": "snippet,contentDetails,statistics",
        "chart": "mostPopular",
        "videoCategoryId": category_id,
        "maxResults": max_results,
        "regionCode": region_code,
    }
    data = await fetch_from_youtube(f"{BASE}/videos", params)

    # If 404 (category not found for this region), try without category
    if "error" in data and data["status_code"] == 404:
        params.pop("videoCategoryId", None)
        data = await fetch_from_youtube(f"{BASE}/videos", params)

    # If still error with LK, fall back to US
    if "error" in data:
        params["regionCode"] = "US"
        data = await fetch_from_youtube(f"{BASE}/videos", params)

    if "error" in data:
        raise HTTPException(status_code=data["status_code"], detail=f"YouTube API error: {data['error']}")

    return data
