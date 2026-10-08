import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, Play, Loader2, VideoOff, ListVideo, Mic, LayoutGrid, List, History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchVideos, type VideoResult, type PlaylistResult } from '@/app/actions/video-actions';

// ── localStorage keys ─────────────────────────────────────────────────────────
const LS_SESSION   = 'teso_explore_session';   // { query, results, nextPageToken, activeTab }
const LS_HISTORY   = 'teso_watch_history';     // VideoCard[] (most recent first, max 20)

// ── Watch-history helpers (exported so VideoLearning can call them) ────────────
export interface WatchedItem {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  watchedAt: number; // Date.now()
}

export function saveToWatchHistory(item: Omit<WatchedItem, 'watchedAt'>) {
  try {
    const raw   = localStorage.getItem(LS_HISTORY);
    const list: WatchedItem[] = raw ? JSON.parse(raw) : [];
    // remove duplicate then prepend
    const filtered = list.filter(v => v.id !== item.id);
    const updated  = [{ ...item, watchedAt: Date.now() }, ...filtered].slice(0, 20);
    localStorage.setItem(LS_HISTORY, JSON.stringify(updated));
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(views: string | number): string {
  if (views === null || views === undefined || views === '') return '0';
  const num = typeof views === 'string' ? parseInt(views.replace(/[^0-9]/g, ''), 10) : views;
  if (isNaN(num) || num <= 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'YT';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'YT';
}

function hashColor(str?: string): string {
  const colors = [
    '#FF4E50', '#FC913A', '#F9D423', '#EDE574', '#E1F5C4',
    '#43C6AC', '#191654', '#3A1C71', '#D76D77', '#FFAF7B',
    '#6A3093', '#A044FF', '#1FA2FF', '#12D8FA', '#A6FFCB',
  ];
  if (!str) return colors[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Local UI types ─────────────────────────────────────────────────────────────

interface VideoCard {
  id: string;
  title: string;
  channel: string;
  views: string;
  thumbnail: string;
  duration: string;
  type: 'video';
}

interface PlaylistCard {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  description: string;
  type: 'playlist';
}

type ResultCard = VideoCard | PlaylistCard;
type ViewMode = 'grid' | 'list';

// ── Constants ──────────────────────────────────────────────────────────────────

const SRI_LANKA_TOPICS = [
  { label: '🇱🇰 A/L Physics', query: 'A/L Physics Sri Lanka' },
  { label: '🇱🇰 A/L Chemistry', query: 'A/L Chemistry Sri Lanka' },
  { label: '🇱🇰 A/L Biology', query: 'A/L Biology Sri Lanka' },
  { label: '🇱🇰 A/L Maths', query: 'A/L Mathematics Sri Lanka' },
  { label: '🇱🇰 O/L Science', query: 'O/L Science Sri Lanka' },
  { label: '🇱🇰 O/L Maths', query: 'O/L Mathematics Sri Lanka' },
  { label: '🇱🇰 ICT', query: 'ICT Sri Lanka students' },
  { label: '🇱🇰 Economics', query: 'Economics Sri Lanka A Level' },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export function Explore() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery]   = useState('');
  const [results, setResults]           = useState<ResultCard[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [hasSearched, setHasSearched]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<'all' | 'videos' | 'playlists'>('all');
  const [viewMode, setViewMode]         = useState<ViewMode>('grid');
  const [watchHistory, setWatchHistory] = useState<WatchedItem[]>([]);

  const fetchContent = useCallback(async (query?: string, token?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await searchVideos(query, token, 'any', 'LK', 'both');

      // Filter out null/invalid entries and YouTube shorts
      const mappedVideos: VideoCard[] = (response.results ?? [])
        .filter((v: VideoResult) => {
          if (!v || !v.id || !v.title) return false;
          const t = String(v.title).trim();
          if (!t || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return false;
          // Filter out shorts (< 60s or title contains #short)
          const lower = t.toLowerCase();
          if (lower.includes('#shorts') || lower.includes('#short')) return false;
          if (v.duration_seconds && v.duration_seconds <= 60) return false;
          return true;
        })
        .map((v: VideoResult) => ({
          id: String(v.id),
          title: String(v.title),
          channel: (v.channel_name && v.channel_name !== 'null' && v.channel_name.trim())
            ? v.channel_name
            : 'YouTube Creator',
          views: formatViews(v.viewCount),
          thumbnail: (v.thumbnail && v.thumbnail !== 'null' && v.thumbnail.trim())
            ? v.thumbnail
            : `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
          duration: formatDuration(v.duration_seconds || 0),
          type: 'video' as const,
        }));

      // Filter out null/invalid playlists
      const mappedPlaylists: PlaylistCard[] = (response.playlists ?? [])
        .filter((p: PlaylistResult) => {
          if (!p || !p.id || !p.title) return false;
          const t = String(p.title).trim();
          if (!t || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return false;
          return true;
        })
        .map((p: PlaylistResult) => ({
          id: String(p.id),
          title: String(p.title),
          channel: (p.channel_name && p.channel_name !== 'null' && p.channel_name.trim())
            ? p.channel_name
            : 'YouTube Creator',
          thumbnail: (p.thumbnail && p.thumbnail !== 'null' && p.thumbnail.trim())
            ? p.thumbnail
            : `https://i.ytimg.com/vi/${p.id}/hqdefault.jpg`,
          description: (p.description && p.description !== 'null') ? p.description : '',
          type: 'playlist' as const,
        }));

      const combined: ResultCard[] = [...mappedPlaylists, ...mappedVideos];

      if (token) {
        setResults(prev => [...prev, ...combined]);
      } else {
        setResults(combined);
      }
      setNextPageToken(response.nextPageToken ?? null);

      // Persist session so coming back from a video restores results
      if (query) {
        try {
          localStorage.setItem(LS_SESSION, JSON.stringify({
            query,
            results: token ? undefined : combined,
            nextPageToken: response.nextPageToken,
            activeTab: 'all',
          }));
        } catch {}
      }
    } catch (err: any) {
      console.error('Failed to fetch content:', err);
      setError(err?.message ?? 'Failed to load videos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Restore last session on mount or load initial results ───────────────────
  useEffect(() => {
    // Always load watch history
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      if (raw) setWatchHistory(JSON.parse(raw));
    } catch {}

    // Check URL search parameters (?q=... or ?search=...)
    const urlQuery = searchParams.get('q') || searchParams.get('query') || searchParams.get('search');
    if (urlQuery && urlQuery.trim()) {
      setSearchQuery(urlQuery.trim());
      setHasSearched(true);
      fetchContent(urlQuery.trim());
      return;
    }

    // Restore last search session if exists
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (raw) {
        const session = JSON.parse(raw);
        if (session.query && session.results?.length > 0) {
          setSearchQuery(session.query);
          setResults(session.results);
          setNextPageToken(session.nextPageToken ?? null);
          setActiveTab(session.activeTab ?? 'all');
          setHasSearched(true);
          return;
        }
      }
    } catch {}

    // Initial default: load educational videos immediately so page isn't blank
    const defaultSearch = 'organic chemistry';
    setSearchQuery(defaultSearch);
    setHasSearched(true);
    fetchContent(defaultSearch);
  }, [fetchContent, searchParams]);

  const handleSearch = (overrideQuery?: string) => {
    const q = overrideQuery ?? searchQuery;
    if (!q.trim()) return;
    if (overrideQuery) setSearchQuery(overrideQuery);
    setHasSearched(true);
    setNextPageToken(null);
    setActiveTab('all');
    fetchContent(q.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleWatchVideo = (id: string, title: string, channel: string, thumbnail: string, duration: string) => {
    saveToWatchHistory({ id, title, channel, thumbnail, duration });
    const params = new URLSearchParams({ videoId: id, title, channel, thumbnail });
    router.push(`/learn?${params.toString()}`);
  };

  const handleOpenPlaylist = (id: string, title: string, channel: string, thumbnail: string) => {
    const params = new URLSearchParams({ playlistId: id, title, channel, thumbnail, mode: 'playlist' });
    router.push(`/learn?${params.toString()}`);
  };

  const videoCount = results.filter(r => r.type === 'video').length;
  const playlistCount = results.filter(r => r.type === 'playlist').length;

  // Build tabs dynamically — hide tabs with 0 results so no null/empty tab appears!
  const availableTabs = [
    { key: 'all' as const, label: `All (${results.length})` },
    ...(videoCount > 0 ? [{ key: 'videos' as const, label: `Videos (${videoCount})` }] : []),
    ...(playlistCount > 0 ? [{ key: 'playlists' as const, label: `Playlists (${playlistCount})` }] : []),
  ];

  const currentTab = (activeTab === 'playlists' && playlistCount === 0) ? 'all' : activeTab;

  const displayResults = results.filter(r => {
    if (currentTab === 'videos') return r.type === 'video';
    if (currentTab === 'playlists') return r.type === 'playlist';
    return true;
  });

  return (
    <div className="flex-1 px-4 py-4 overflow-auto">
      <div className="space-y-5">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-semibold">Videos</h1>
          <p className="text-muted-foreground text-sm">Search educational YouTube content &amp; more</p>
        </div>

        {/* YouTube-style Search Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center border border-border rounded-full overflow-hidden focus-within:border-blue-500 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.5)] transition-all bg-background">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search"
              className="flex-1 pl-5 pr-3 py-3 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={() => handleSearch()}
              disabled={isLoading || !searchQuery.trim()}
              className="h-full px-5 py-3 bg-accent hover:bg-accent/80 border-l border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Search"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              ) : (
                <Search size={20} className="text-muted-foreground" />
              )}
            </button>
          </div>
          {/* Mic button */}
          <button
            className="w-11 h-11 rounded-full bg-accent hover:bg-accent/80 border border-border flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Voice search"
          >
            <Mic size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* States */}
        {isLoading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            <p className="text-muted-foreground text-sm">Fetching educational content...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
              <VideoOff className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Something went wrong</h3>
              <p className="text-muted-foreground text-sm max-w-md">{error}</p>
              <p className="text-muted-foreground text-xs mt-2">Make sure the backend server is running on port 8000.</p>
            </div>
            <button
              onClick={() => handleSearch()}
              className="mt-2 px-6 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        ) : !hasSearched ? (
          /* Home screen — watch history + topic chips */
          <div className="space-y-8">

            {/* Previously Watched */}
            {watchHistory.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <History size={15} className="text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Previously Watched
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {watchHistory.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group cursor-pointer"
                      onClick={() => handleWatchVideo(item.id, item.title, item.channel, item.thumbnail, item.duration)}
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-xs font-medium leading-none">
                          {item.duration}
                        </div>
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <Play size={16} className="text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 min-w-0">
                        <h3 className="text-xs font-semibold line-clamp-2 group-hover:text-blue-500 transition-colors leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.channel}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-4xl">🇱🇰</div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Search for Videos &amp; Playlists</h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Type a topic or pick a popular Sri Lankan subject below to get started.
                  </p>
                </div>
              </div>
            )}

            {/* Popular topic chips */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                🇱🇰 Popular Topics
              </p>
              <div className="flex flex-wrap gap-2">
                {SRI_LANKA_TOPICS.map((topic) => (
                  <button
                    key={topic.query}
                    onClick={() => handleSearch(topic.query)}
                    className="px-4 py-1.5 rounded-full border border-border hover:border-blue-500 hover:bg-blue-500/10 transition-all text-sm font-medium"
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : results.length === 0 ? (
          /* No Results */
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <VideoOff className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">No results found</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                We couldn&apos;t find any results for <strong>&quot;{searchQuery}&quot;</strong>. Try a different keyword.
              </p>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="space-y-4">

            {/* Toolbar: tabs + view toggle */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {availableTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      currentTab === tab.key
                        ? 'bg-foreground text-background'
                        : 'bg-accent text-muted-foreground hover:text-foreground hover:bg-accent/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                {isLoading && <Loader2 size={16} className="animate-spin text-muted-foreground ml-1" />}
              </div>

              {/* Grid / List toggle */}
              <div className="flex items-center gap-1 p-1 bg-accent rounded-lg border border-border">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'list'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Results */}
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }>
              <AnimatePresence>
                {displayResults.map((item) =>
                  item.type === 'playlist' ? (
                    <PlaylistCardComponent
                      key={`pl-${item.id}`}
                      playlist={item}
                      viewMode={viewMode}
                      onOpen={() => handleOpenPlaylist(item.id, item.title, item.channel, item.thumbnail)}
                    />
                  ) : (
                    <VideoCardComponent
                      key={`v-${item.id}`}
                      video={item}
                      viewMode={viewMode}
                      onWatch={() => handleWatchVideo(item.id, item.title, item.channel, item.thumbnail, item.duration)}
                    />
                  )
                )}
              </AnimatePresence>
            </div>

            {/* Load More */}
            {nextPageToken && !isLoading && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => fetchContent(searchQuery || undefined, nextPageToken)}
                  disabled={isLoading}
                  className="px-6 py-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-500/10 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  Show more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Video Card ─────────────────────────────────────────────────────────────────

function VideoCardComponent({
  video,
  viewMode,
  onWatch,
}: {
  video: VideoCard;
  viewMode: ViewMode;
  onWatch: () => void;
}) {
  const avatarColor = hashColor(video.channel);
  const initials = getInitials(video.channel);
  const [thumbSrc, setThumbSrc] = useState(video.thumbnail);

  useEffect(() => {
    setThumbSrc(video.thumbnail);
  }, [video.thumbnail]);

  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="group cursor-pointer rounded-xl overflow-hidden"
        onClick={onWatch}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
          <img
            src={thumbSrc}
            alt={video.title}
            onError={() => {
              if (thumbSrc !== `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`) {
                setThumbSrc(`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`);
              }
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Duration */}
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-xs font-medium leading-none">
            {video.duration}
          </div>
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Play size={18} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
        </div>
        {/* Meta */}
        <div className="pt-2 pb-1 flex gap-3">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-blue-500 transition-colors">
              {video.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{video.channel}</p>
            <p className="text-xs text-muted-foreground">{video.views} views</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // List mode
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="group flex gap-4 cursor-pointer"
      onClick={onWatch}
    >
      <div className="relative flex-shrink-0 w-40 sm:w-48 md:w-56 aspect-video rounded-xl overflow-hidden bg-muted">
        <img
          src={thumbSrc}
          alt={video.title}
          onError={() => {
            if (thumbSrc !== `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`) {
              setThumbSrc(`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`);
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-xs font-medium leading-none">
          {video.duration}
        </div>
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Play size={16} className="text-white ml-0.5" fill="white" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0 py-1 space-y-1">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-blue-500 transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <p className="text-xs text-muted-foreground truncate">{video.channel}</p>
        </div>
        <p className="text-xs text-muted-foreground">{video.views} views</p>
      </div>
    </motion.div>
  );
}

// ── Playlist Card ──────────────────────────────────────────────────────────────

function PlaylistCardComponent({
  playlist,
  viewMode,
  onOpen,
}: {
  playlist: PlaylistCard;
  viewMode: ViewMode;
  onOpen: () => void;
}) {
  const avatarColor = hashColor(playlist.channel);
  const initials = getInitials(playlist.channel);
  const [thumbSrc, setThumbSrc] = useState(playlist.thumbnail);

  useEffect(() => {
    setThumbSrc(playlist.thumbnail);
  }, [playlist.thumbnail]);

  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="group cursor-pointer rounded-xl overflow-hidden"
        onClick={onOpen}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
          <img
            src={thumbSrc}
            alt={playlist.title}
            onError={() => {
              if (thumbSrc !== `https://i.ytimg.com/vi/${playlist.id}/hqdefault.jpg`) {
                setThumbSrc(`https://i.ytimg.com/vi/${playlist.id}/hqdefault.jpg`);
              }
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Playlist strip */}
          <div className="absolute inset-y-0 right-0 w-10 bg-black/75 flex flex-col items-center justify-center gap-1">
            <ListVideo size={12} className="text-white" />
            <span className="text-white text-[9px] font-medium [writing-mode:vertical-rl] rotate-180 tracking-wide">
              Playlist
            </span>
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <ListVideo size={18} className="text-white" />
            </div>
          </div>
          {/* Playlist badge */}
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-purple-600/90 backdrop-blur-sm rounded text-white text-[10px] font-semibold">
            Playlist
          </div>
        </div>
        {/* Meta */}
        <div className="pt-2 pb-1 flex gap-3">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-blue-500 transition-colors">
              {playlist.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{playlist.channel}</p>
            {playlist.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{playlist.description}</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // List mode
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="group flex gap-4 cursor-pointer"
      onClick={onOpen}
    >
      <div className="relative flex-shrink-0 w-40 sm:w-48 md:w-56 aspect-video rounded-xl overflow-hidden bg-muted">
        <img
          src={thumbSrc}
          alt={playlist.title}
          onError={() => {
            if (thumbSrc !== `https://i.ytimg.com/vi/${playlist.id}/hqdefault.jpg`) {
              setThumbSrc(`https://i.ytimg.com/vi/${playlist.id}/hqdefault.jpg`);
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-y-0 right-0 w-10 bg-black/75 flex flex-col items-center justify-center gap-1">
          <ListVideo size={12} className="text-white" />
          <span className="text-white text-[9px] font-medium [writing-mode:vertical-rl] rotate-180">
            Playlist
          </span>
        </div>
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <ListVideo size={16} className="text-white" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0 py-1 space-y-1">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-blue-500 transition-colors">
          {playlist.title}
        </h3>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <p className="text-xs text-muted-foreground truncate">{playlist.channel}</p>
        </div>
        <span className="inline-block px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 text-[10px] font-medium border border-purple-500/20">
          Playlist
        </span>
        {playlist.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{playlist.description}</p>
        )}
      </div>
    </motion.div>
  );
}
