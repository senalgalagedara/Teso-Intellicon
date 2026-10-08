def filter_videos(videos: list, filters: dict) -> list:
    """
    videos: list of dicts with processed YouTube metadata
    filters: {
        "duration": "any" | "short" | "medium" | "long",
        "language": "any" | "en",
        "type": "video" | "playlist" | "both",
        "sort": "views" | "recent" | "rating"
    }
    """
    filtered = []
    
    for v in videos:
        # 1. No Shorts (exclude if <= 60s, or title contains #short, or flagged as short)
        duration = v.get("duration_seconds", 0)
        title_lower = (v.get("title") or "").lower()
        if duration <= 60 or "#short" in title_lower or v.get("is_short"):
            continue
            
        # 2. Duration filter
        dur_filter = filters.get("duration", "any")
        if dur_filter == "short" and duration > 600:
            continue
        if dur_filter == "medium" and (duration <= 600 or duration > 1200):
            continue
        if dur_filter == "long" and duration <= 1200:
            continue
            
        # 3. Language filter
        lang_filter = filters.get("language", "any")
        video_lang = (v.get("language") or "").strip().lower()
        if lang_filter == "en":
            # If language is explicitly provided, it must start with en; if not provided, keep it
            if video_lang and not video_lang.startswith("en"):
                continue
                
        # 4. Type filter (handled mostly in API call but double check here if needed)
        # Assuming v["type"] exists
        type_filter = filters.get("type", "video")
        video_type = v.get("type", "video")
        if type_filter != "both" and video_type != type_filter:
            continue
            
        filtered.append(v)

    # 5. Sort
    sort_by = filters.get("sort", "relevance")
    if sort_by == "views":
        filtered.sort(key=lambda x: int(x.get("viewCount", 0)), reverse=True)
    elif sort_by == "recent":
        filtered.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)
    elif sort_by == "rating":
        # (likeCount / viewCount) ratio
        def get_rating(x):
            views = int(x.get("viewCount", 0))
            likes = int(x.get("likeCount", 0))
            if views == 0:
                return 0
            return likes / views
        filtered.sort(key=get_rating, reverse=True)
        
    return filtered
