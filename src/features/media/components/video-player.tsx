"use client";

import * as React from "react";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/media/format";
import type { MediaVideo } from "@/types/media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VideoPlayerProps {
  videos: MediaVideo[];
  className?: string;
}

function pickPreferred(videos: MediaVideo[]): MediaVideo | undefined {
  const youtube = videos.filter((v) => v.site === "YouTube");
  return (
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube.find((v) => v.type === "Teaser") ??
    youtube[0]
  );
}

/**
 * Trailer / video browser with embedded YouTube playback.
 */
export function VideoPlayer({ videos, className }: VideoPlayerProps) {
  const youtube = React.useMemo(
    () => videos.filter((v) => v.site === "YouTube"),
    [videos],
  );

  const preferred = React.useMemo(() => pickPreferred(videos), [videos]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [playing, setPlaying] = React.useState(false);

  const active =
    youtube.find((v) => v.id === selectedId) ?? preferred ?? undefined;

  if (!active) {
    return (
      <div
        className={cn(
          "flex aspect-video items-center justify-center rounded-xl border-0 bg-muted/30 text-sm text-muted-foreground",
          className,
        )}
      >
        No trailers available
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-video overflow-hidden rounded-xl border-0 bg-black shadow-md">
        {playing ? (
          <iframe
            title={active.name}
            src={`${youtubeEmbedUrl(active.key)}&autoplay=1`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Play ${active.name}`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform group-hover:scale-105">
              <Play className="h-6 w-6 fill-current pl-0.5" />
            </span>
            <span className="max-w-xs px-4 text-center text-sm font-medium">
              {active.name}
            </span>
          </button>
        )}
      </div>

      {youtube.length > 1 ? (
        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
          {youtube.slice(0, 12).map((video) => (
            <Button
              key={video.id}
              type="button"
              size="sm"
              variant={active.id === video.id ? "default" : "outline"}
              className="shrink-0"
              onClick={() => {
                setSelectedId(video.id);
                setPlaying(false);
              }}
            >
              <Badge variant="muted" className="mr-1.5 text-[10px]">
                {video.type}
              </Badge>
              <span className="max-w-[10rem] truncate">{video.name}</span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
