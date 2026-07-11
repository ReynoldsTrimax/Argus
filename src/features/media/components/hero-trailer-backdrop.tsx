"use client";

import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { backdropUrl } from "@/lib/media/image";
import type { MediaVideo } from "@/types/media";

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
 * Full-bleed cinematic trailer stage — muted autoplay, no visible controls.
 * YouTube chrome is cropped out via scale + cover; overlays sit above the player.
 */
export function HeroTrailerBackdrop({
  videos,
  backdropPath,
  posterPath,
  className,
}: HeroTrailerBackdropProps) {
  const trailer = React.useMemo(() => pickPreferredTrailer(videos), [videos]);
  const still = backdropUrl(backdropPath ?? posterPath, "w1280");

  const hostRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<YtPlayer | null>(null);

  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

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
            loop: 1,
            playlist: trailer.key,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            start: 2,
            cc_load_policy: 0,
            // Hide related UI as much as the API allows
            showinfo: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              try {
                e.target.mute();
                e.target.playVideo();
                window.setTimeout(() => {
                  try {
                    e.target.mute();
                    e.target.playVideo();
                  } catch {
                    // ignore
                  }
                }, 350);
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

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
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

      {trailer && !failed ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-[1.2s] ease-out",
            playing ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        >
          {/*
            Oversized cover crop: YouTube’s flash of media chrome (play/pause,
            next/prev) sits at the edges and is clipped outside the hero.
          */}
          <div className="absolute left-1/2 top-1/2 h-[max(120%,67.5vw)] w-[max(120%,213vh)] -translate-x-1/2 -translate-y-1/2 scale-[1.18]">
            <div
              ref={hostRef}
              className="pointer-events-none h-full w-full overflow-hidden [&_iframe]:pointer-events-none [&_iframe]:absolute [&_iframe]:left-0 [&_iframe]:top-0 [&_iframe]:!h-full [&_iframe]:!w-full"
            />
          </div>
          {/* Full cover so any residual chrome cannot be clicked or seen cleanly */}
          <div className="pointer-events-none absolute inset-0 bg-transparent" />
        </div>
      ) : null}

      {/* Readability scrims over the trailer — also mask edge chrome */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-background/45" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/45 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}
