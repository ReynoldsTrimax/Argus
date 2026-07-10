"use client";

import * as React from "react";
import Image from "next/image";
import { Play, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/media/format";
import { backdropUrl } from "@/lib/media/image";
import type { MediaVideo } from "@/types/media";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HeroTrailerBackdropProps {
  videos: MediaVideo[];
  backdropPath?: string | null;
  posterPath?: string | null;
  title: string;
  className?: string;
}

/** Minimal YouTube IFrame API surface we use. */
interface YtPlayer {
  destroy: () => void;
  mute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
}

interface YtPlayerEvent {
  data: number;
  target: YtPlayer;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: YtPlayerEvent) => void;
            onStateChange?: (e: YtPlayerEvent) => void;
            onError?: (e: YtPlayerEvent) => void;
          };
        },
      ) => YtPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function pickPreferredTrailer(videos: MediaVideo[]): MediaVideo | undefined {
  const youtube = videos.filter((v) => v.site === "YouTube" && v.key);
  // Prefer official trailers, then any trailer/teaser, then first YouTube clip
  return (
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube.find((v) => v.type === "Teaser") ??
    youtube.find((v) => v.type === "Clip") ??
    youtube[0]
  );
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prior?.();
      resolve();
    };

    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      // Script already loading — poll briefly for YT
      const start = Date.now();
      const tick = () => {
        if (window.YT?.Player) resolve();
        else if (Date.now() - start > 8000) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  });

  return youtubeApiPromise;
}

/**
 * Full-bleed cinematic trailer stage.
 * Uses the YouTube IFrame API (TMDB only exposes YouTube keys, not raw MP4s)
 * so the trailer actually autoplays muted, loops, and cover-fills the hero.
 */
export function HeroTrailerBackdrop({
  videos,
  backdropPath,
  posterPath,
  title,
  className,
}: HeroTrailerBackdropProps) {
  const trailer = React.useMemo(() => pickPreferredTrailer(videos), [videos]);
  const still = backdropUrl(backdropPath ?? posterPath, "w1280");

  const hostRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<YtPlayer | null>(null);

  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (!trailer || !hostRef.current) return;

    let cancelled = false;
    let player: YtPlayer | null = null;

    const mount = async () => {
      try {
        await loadYouTubeApi();
        if (cancelled || !hostRef.current || !window.YT?.Player) {
          if (!cancelled) setFailed(true);
          return;
        }

        // YT replaces this element with an <iframe> — keep a fresh child each time.
        hostRef.current.innerHTML = "";
        const mountEl = document.createElement("div");
        mountEl.style.width = "100%";
        mountEl.style.height = "100%";
        hostRef.current.appendChild(mountEl);

        player = new window.YT.Player(mountEl, {
          videoId: trailer.key,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            // Loop requires playlist = same video id
            loop: 1,
            playlist: trailer.key,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            // Skip the quiet title card on many trailers
            start: 3,
            cc_load_policy: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              try {
                e.target.mute();
                e.target.playVideo();
                // Some browsers need a second nudge after layout
                window.setTimeout(() => {
                  try {
                    e.target.mute();
                    e.target.playVideo();
                  } catch {
                    // ignore
                  }
                }, 400);
              } catch {
                // ignore
              }
            },
            onStateChange: (e) => {
              if (cancelled || !window.YT) return;
              const { PLAYING, ENDED } = window.YT.PlayerState;
              if (e.data === PLAYING) {
                setPlaying(true);
                setFailed(false);
              }
              // Robust loop (some browsers ignore playlist loop)
              if (e.data === ENDED) {
                try {
                  e.target.playVideo();
                } catch {
                  // ignore
                }
              }
            },
            onError: () => {
              if (!cancelled) {
                setFailed(true);
                setPlaying(false);
              }
            },
          },
        });
        playerRef.current = player;
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void mount();

    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [trailer]);

  // Pause ambient trailer while the focused dialog is open (avoid double audio/CPU)
  React.useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (dialogOpen) p.pauseVideo();
      else {
        p.mute();
        p.playVideo();
      }
    } catch {
      // ignore
    }
  }, [dialogOpen]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
      {/* Still poster underneath — fades once the trailer is actually PLAYING */}
      {still ? (
        <Image
          src={still}
          alt=""
          fill
          priority
          sizes="100vw"
          className={cn(
            "object-cover transition-opacity duration-[1.2s] ease-out",
            playing && !failed ? "opacity-0" : "opacity-100",
          )}
        />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}

      {/*
        Cover-fit stage: scales the 16:9 player so it always fills the hero
        the way object-fit: cover works for <video> / MP4.
      */}
      {trailer && !failed ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-[1.2s] ease-out",
            playing ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        >
          <div className="absolute left-1/2 top-1/2 h-[max(100%,56.25vw)] w-[max(100%,177.78vh)] -translate-x-1/2 -translate-y-1/2">
            <div
              ref={hostRef}
              className="pointer-events-none h-full w-full overflow-hidden [&_iframe]:absolute [&_iframe]:left-0 [&_iframe]:top-0 [&_iframe]:!h-full [&_iframe]:!w-full"
            />
          </div>
        </div>
      ) : null}

      {/* Soft cinematic vignette — light enough that motion stays visible */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/25 to-background/40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/35 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/20" />

      {/* Status chip */}
      {trailer ? (
        <div className="pointer-events-none absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/90 backdrop-blur-md",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                playing ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" : "bg-white/50",
              )}
            />
            {playing ? "Trailer playing" : failed ? "Trailer unavailable" : "Loading trailer…"}
          </span>
        </div>
      ) : null}

      {/* Optional focused watch-with-sound (not a page-length panel) */}
      {trailer ? (
        <div className="pointer-events-auto absolute bottom-4 right-4 z-10 sm:bottom-6 sm:right-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="glass"
                className="gap-1.5 rounded-full border-white/15 bg-black/50 text-white shadow-md backdrop-blur-md hover:bg-black/65"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span className="text-xs">Watch with sound</span>
                <Volume2 className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl gap-0 overflow-hidden border-border/60 p-0 sm:rounded-2xl">
              <DialogHeader className="sr-only">
                <DialogTitle>{trailer.name || `${title} trailer`}</DialogTitle>
              </DialogHeader>
              <div className="relative aspect-video w-full bg-black">
                {dialogOpen ? (
                  <iframe
                    title={trailer.name || `${title} trailer`}
                    src={`${youtubeEmbedUrl(trailer.key)}&autoplay=1`}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : null}
              </div>
              <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                {trailer.name}
                {trailer.type ? (
                  <span className="ml-2 text-xs uppercase tracking-wide text-primary">
                    {trailer.type}
                  </span>
                ) : null}
              </p>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </div>
  );
}
