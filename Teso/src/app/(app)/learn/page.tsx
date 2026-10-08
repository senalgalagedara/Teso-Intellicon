import { VideoLearning } from "@/components/learn/VideoLearning";

interface LearnPageProps {
  searchParams: Promise<{
    videoId?: string;
    title?: string;
    channel?: string;
    thumbnail?: string;
    // Playlist mode
    playlistId?: string;
    mode?: string;
  }>;
}

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const params = await searchParams;
  return (
    <VideoLearning
      videoId={params.videoId}
      videoTitle={params.title}
      channelName={params.channel}
      thumbnail={params.thumbnail}
      playlistId={params.playlistId}
      mode={params.mode}
    />
  );
}
