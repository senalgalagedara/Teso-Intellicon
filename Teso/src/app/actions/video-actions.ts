"use server";

const TESO_API_BASE = process.env.TESO_API_URL ?? "http://localhost:8000";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? "AIzaSyABIgRf2RRYkTSta3UhrFyysIM_05QBxCg";

export interface VideoResult {
  id: string;
  title: string;
  thumbnail: string;
  duration_seconds: number;
  channel_name: string;
  channel_id: string;
  language: string | null;
  is_short: boolean;
  publishedAt: string;
  viewCount: string | number;
  likeCount: string | number;
  type: "video";
}

export interface PlaylistResult {
  id: string;
  title: string;
  thumbnail: string;
  channel_name: string;
  channel_id: string;
  publishedAt: string;
  description: string;
  type: "playlist";
}

export interface PlaylistVideoItem {
  id: string;
  title: string;
  thumbnail: string;
  position: number;
  publishedAt: string;
}

export interface PlaylistItemsResponse {
  playlist_id: string;
  total: number;
  videos: PlaylistVideoItem[];
}

export interface SearchResponse {
  results: VideoResult[];
  playlists: PlaylistResult[];
  nextPageToken: string | null;
  nextPlaylistToken: string | null;
}

function parseIsoDuration(isoDuration?: string): number {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function searchYouTubeDirect(
  query: string,
  pageToken?: string,
  region: string = "LK"
): Promise<SearchResponse> {
  const q = query.trim() || "educational tutorial";
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("maxResults", "20");
  searchUrl.searchParams.set("regionCode", region);
  searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
  if (pageToken) searchUrl.searchParams.set("pageToken", pageToken);

  const searchRes = await fetch(searchUrl.toString(), { cache: "no-store" });
  if (!searchRes.ok) {
    throw new Error(`YouTube API direct error: ${searchRes.statusText}`);
  }
  const searchData = await searchRes.json();
  const items: any[] = searchData.items ?? [];

  const videoItems = items.filter(i => i.id?.kind === "youtube#video" && i.id?.videoId);
  const playlistItems = items.filter(i => i.id?.kind === "youtube#playlist" && i.id?.playlistId);

  const videoIds = videoItems.map(i => i.id.videoId);
  const detailsMap: Record<string, any> = {};

  if (videoIds.length > 0) {
    try {
      const vidUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      vidUrl.searchParams.set("part", "snippet,contentDetails,statistics");
      vidUrl.searchParams.set("id", videoIds.join(","));
      vidUrl.searchParams.set("key", YOUTUBE_API_KEY);
      const vidRes = await fetch(vidUrl.toString(), { cache: "no-store" });
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        for (const item of vidData.items ?? []) {
          detailsMap[item.id] = item;
        }
      }
    } catch {}
  }

  const results: VideoResult[] = [];
  for (const item of videoItems) {
    const vidId = item.id.videoId;
    const detail = detailsMap[vidId];
    const snippet = detail?.snippet ?? item.snippet ?? {};
    const contentDetails = detail?.contentDetails ?? {};
    const stats = detail?.statistics ?? {};

    const durationSec = parseIsoDuration(contentDetails.duration);
    const title = snippet.title ?? "";
    const isShort = durationSec <= 60 || title.toLowerCase().includes("#short");

    if (isShort) continue; // Exclude shorts

    const thumb =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

    results.push({
      id: vidId,
      title,
      thumbnail: thumb,
      duration_seconds: durationSec,
      channel_name: snippet.channelTitle ?? "YouTube Creator",
      channel_id: snippet.channelId ?? "",
      language: detail?.snippet?.defaultAudioLanguage ?? null,
      is_short: false,
      publishedAt: snippet.publishedAt ?? "",
      viewCount: stats.viewCount ?? "0",
      likeCount: stats.likeCount ?? "0",
      type: "video",
    });
  }

  const playlists: PlaylistResult[] = playlistItems.map(item => {
    const pId = item.id.playlistId;
    const snippet = item.snippet ?? {};
    const thumb =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      "";
    return {
      id: pId,
      title: snippet.title ?? "",
      thumbnail: thumb,
      channel_name: snippet.channelTitle ?? "YouTube Creator",
      channel_id: snippet.channelId ?? "",
      publishedAt: snippet.publishedAt ?? "",
      description: snippet.description ?? "",
      type: "playlist",
    };
  });

  return {
    results,
    playlists,
    nextPageToken: searchData.nextPageToken ?? null,
    nextPlaylistToken: null,
  };
}

export async function searchVideos(
  query?: string,
  pageToken?: string,
  language: string = "any",
  region: string = "LK",
  type: string = "both"
): Promise<SearchResponse> {
  const url = new URL(`${TESO_API_BASE}/api/search`);
  if (query) url.searchParams.append("q", query);
  if (pageToken) url.searchParams.append("page", pageToken);
  url.searchParams.append("language", language || "any");
  url.searchParams.append("region", region);
  url.searchParams.append("type", type);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        results: Array.isArray(data.results) ? data.results : [],
        playlists: Array.isArray(data.playlists) ? data.playlists : [],
        nextPageToken: data.nextPageToken ?? null,
        nextPlaylistToken: data.nextPlaylistToken ?? null,
      };
    }
  } catch {
    // If backend fails or is offline, fall back directly to YouTube Data API
  }

  return searchYouTubeDirect(query ?? "", pageToken, region);
}

export async function getPlaylistItems(
  playlistId: string
): Promise<PlaylistItemsResponse> {
  try {
    const url = `${TESO_API_BASE}/api/search/playlist/${playlistId}/items`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      return res.json();
    }
  } catch {}

  // Direct YouTube fallback for playlist items
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("key", YOUTUBE_API_KEY);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch playlist items: ${res.statusText}`);
  }
  const data = await res.json();
  const items = (data.items ?? []).map((item: any, idx: number) => {
    const snippet = item.snippet ?? {};
    const vidId = snippet.resourceId?.videoId || item.contentDetails?.videoId || "";
    return {
      id: vidId,
      title: snippet.title ?? "",
      thumbnail:
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
      position: snippet.position ?? idx,
      publishedAt: snippet.publishedAt ?? "",
    };
  }).filter((v: PlaylistVideoItem) => !!v.id);

  return {
    playlist_id: playlistId,
    total: items.length,
    videos: items,
  };
}

export async function getVideoById(videoId: string): Promise<VideoResult | null> {
  try {
    const url = `${TESO_API_BASE}/api/videos/${videoId}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails,statistics");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", YOUTUBE_API_KEY);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    const snippet = item.snippet ?? {};
    const contentDetails = item.contentDetails ?? {};
    const stats = item.statistics ?? {};
    const durationSec = parseIsoDuration(contentDetails.duration);

    return {
      id: videoId,
      title: snippet.title ?? "",
      thumbnail:
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration_seconds: durationSec,
      channel_name: snippet.channelTitle ?? "YouTube Creator",
      channel_id: snippet.channelId ?? "",
      language: snippet.defaultAudioLanguage ?? null,
      is_short: durationSec <= 60,
      publishedAt: snippet.publishedAt ?? "",
      viewCount: stats.viewCount ?? "0",
      likeCount: stats.likeCount ?? "0",
      type: "video",
    };
  } catch {
    return null;
  }
}

