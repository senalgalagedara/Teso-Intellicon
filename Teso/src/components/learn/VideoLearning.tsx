'use client';

import { ArrowLeft, Play, ListVideo, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { getPlaylistItems, type PlaylistVideoItem } from '@/app/actions/video-actions';

interface VideoLearningProps {
  videoId?: string;
  videoTitle?: string;
  channelName?: string;
  thumbnail?: string;
  // Playlist mode
  playlistId?: string;
  mode?: string;
}

export function VideoLearning({
  videoId,
  videoTitle,
  channelName,
  thumbnail,
  playlistId,
  mode,
}: VideoLearningProps) {
  const router = useRouter();
  const isPlaylistMode = mode === 'playlist' && !!playlistId;

  // ── Playlist state ─────────────────────────────────────────────────────────
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideoItem[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | undefined>(videoId);
  const [activeTitle, setActiveTitle] = useState<string | undefined>(videoTitle);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadPlaylist = useCallback(async (pid: string) => {
    setLoadingPlaylist(true);
    setPlaylistError(null);
    try {
      const data = await getPlaylistItems(pid);
      setPlaylistVideos(data.videos);
      // Auto-play first video if none selected
      if (!activeVideoId && data.videos.length > 0) {
        setActiveVideoId(data.videos[0].id);
        setActiveTitle(data.videos[0].title);
      }
    } catch (err: any) {
      setPlaylistError(err?.message ?? 'Failed to load playlist');
    } finally {
      setLoadingPlaylist(false);
    }
  }, [activeVideoId]);

  useEffect(() => {
    if (isPlaylistMode) {
      loadPlaylist(playlistId!);
    }
  }, [isPlaylistMode, playlistId, loadPlaylist]);

  const hasVideo = !!activeVideoId;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Back button */}
      <div className="flex items-center gap-3 px-4 lg:px-8 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Videos
        </button>
        {isPlaylistMode && (
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="ml-auto flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-400 transition-colors"
          >
            <ListVideo size={16} />
            {sidebarOpen ? 'Hide playlist' : 'Show playlist'}
          </button>
        )}
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Player column */}
        <div className={`flex flex-col gap-4 p-4 lg:p-8 overflow-auto transition-all duration-300 ${isPlaylistMode && sidebarOpen ? 'flex-1 min-w-0' : 'w-full max-w-5xl mx-auto'
          }`}>
          {/* Title */}
          {activeTitle && (
            <h1 className="text-xl lg:text-2xl font-bold leading-tight">{activeTitle}</h1>
          )}
          {channelName && !isPlaylistMode && (
            <p className="text-sm text-muted-foreground -mt-2">{channelName}</p>
          )}

          {/* Video Player */}
          <div
            style={{ position: 'relative', paddingTop: '56.25%' }}
            className="w-full bg-black rounded-2xl overflow-hidden shadow-2xl flex-shrink-0"
          >
            {hasVideo ? (
              <iframe
                key={activeVideoId}
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1`}
                title={activeTitle ?? 'Video Lesson'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            ) : (
              <div
                style={{ position: 'absolute', inset: 0 }}
                className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 flex items-center justify-center"
              >
                {loadingPlaylist ? (
                  <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                ) : (
                  <div className="text-center space-y-4 px-6">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-20 h-20 mx-auto rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer border border-white/20"
                    >
                      <Play size={32} className="text-white ml-1" fill="white" />
                    </motion.div>
                    <p className="text-white/60 text-sm font-medium">
                      {isPlaylistMode
                        ? 'Select a video from the playlist →'
                        : 'Go to Explore and click "Start Lesson" on any video'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Playlist Sidebar */}
        <AnimatePresence>
          {isPlaylistMode && sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-shrink-0 border-l border-border bg-card flex flex-col overflow-hidden"
              style={{ width: 360 }}
            >
              {/* Sidebar header */}
              <div className="px-4 py-3 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ListVideo size={18} className="text-purple-500" />
                  <span className="font-semibold text-sm">Playlist Videos</span>
                  {playlistVideos.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {playlistVideos.length} videos
                    </span>
                  )}
                </div>
              </div>

              {/* Sidebar content */}
              <div className="flex-1 overflow-y-auto">
                {loadingPlaylist ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                  </div>
                ) : playlistError ? (
                  <div className="p-4 text-center text-sm text-red-400">{playlistError}</div>
                ) : playlistVideos.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No videos found in this playlist.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {playlistVideos.map((vid, idx) => {
                      const isActive = vid.id === activeVideoId;
                      return (
                        <button
                          key={vid.id}
                          onClick={() => {
                            setActiveVideoId(vid.id);
                            setActiveTitle(vid.title);
                          }}
                          className={`w-full flex gap-3 p-3 text-left hover:bg-accent transition-colors group ${isActive ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
                            }`}
                        >
                          {/* Thumbnail */}
                          <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                            {vid.thumbnail ? (
                              <img
                                src={vid.thumbnail}
                                alt={vid.title ?? ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play size={16} className="text-muted-foreground" />
                              </div>
                            )}
                            {isActive && (
                              <div className="absolute inset-0 bg-purple-500/40 flex items-center justify-center">
                                <Play size={14} fill="white" className="text-white" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium line-clamp-2 leading-snug ${isActive ? 'text-purple-500' : 'group-hover:text-purple-400'
                              }`}>
                              {vid.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">#{(idx + 1)}</p>
                          </div>

                          {isActive && (
                            <ChevronRight size={14} className="text-purple-500 flex-shrink-0 self-center" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
