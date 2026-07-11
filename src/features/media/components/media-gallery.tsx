"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { mediaImageUrl } from "@/lib/media/image";
import type { MediaImage } from "@/types/media";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MediaGalleryProps {
  images: MediaImage[];
  className?: string;
}

/**
 * Image gallery with type tabs and fullscreen keyboard-navigable viewer.
 */
export function MediaGallery({ images, className }: MediaGalleryProps) {
  const posters = images.filter((i) => i.type === "poster");
  const backdrops = images.filter((i) => i.type === "backdrop");
  const logos = images.filter((i) => i.type === "logo");
  const stills = images.filter((i) => i.type === "still" || i.type === "profile");

  const [open, setOpen] = React.useState(false);
  const [activeList, setActiveList] = React.useState<MediaImage[]>([]);
  const [index, setIndex] = React.useState(0);

  const openAt = (list: MediaImage[], i: number) => {
    setActiveList(list);
    setIndex(i);
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        setIndex((i) => (i + 1) % activeList.length);
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => (i - 1 + activeList.length) % activeList.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, activeList.length]);

  if (!images.length) {
    return (
      <p className="text-sm text-muted-foreground">No images available.</p>
    );
  }

  const defaultTab = backdrops.length
    ? "backdrops"
    : posters.length
      ? "posters"
      : logos.length
        ? "logos"
        : "stills";

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="font-display text-lg font-semibold tracking-tight">Gallery</h2>
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {backdrops.length ? (
            <TabsTrigger value="backdrops">Backdrops ({backdrops.length})</TabsTrigger>
          ) : null}
          {posters.length ? (
            <TabsTrigger value="posters">Posters ({posters.length})</TabsTrigger>
          ) : null}
          {logos.length ? (
            <TabsTrigger value="logos">Logos ({logos.length})</TabsTrigger>
          ) : null}
          {stills.length ? (
            <TabsTrigger value="stills">More ({stills.length})</TabsTrigger>
          ) : null}
        </TabsList>

        {(
          [
            ["backdrops", backdrops, "w780"],
            ["posters", posters, "w342"],
            ["logos", logos, "w300"],
            ["stills", stills, "w500"],
          ] as const
        ).map(([key, list, size]) =>
          list.length ? (
            <TabsContent key={key} value={key}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {list.map((img, i) => {
                  const src = mediaImageUrl(img.path, size);
                  if (!src) return null;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => openAt(list, i)}
                      className={cn(
                        "relative overflow-hidden rounded-lg border-0 bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        key === "posters" || key === "logos"
                          ? "aspect-[2/3]"
                          : "aspect-video",
                      )}
                      aria-label={`Open image ${i + 1}`}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className={cn(
                          "object-cover transition-transform hover:scale-105",
                          key === "logos" && "object-contain p-4",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          ) : null,
        )}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl border-none bg-black/95 p-0 sm:rounded-2xl">
          <DialogTitle className="sr-only">Image viewer</DialogTitle>
          <div className="relative flex min-h-[50vh] items-center justify-center p-4">
            {activeList[index] ? (
              <div className="relative h-[min(70vh,720px)] w-full">
                <Image
                  src={mediaImageUrl(activeList[index]!.path, "original") ?? ""}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
              onClick={() =>
                setIndex((i) => (i - 1 + activeList.length) % activeList.length)
              }
              aria-label="Previous image"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
              onClick={() => setIndex((i) => (i + 1) % activeList.length)}
              aria-label="Next image"
            >
              <ChevronRight />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-2 top-2 text-white hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X />
            </Button>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70">
              {index + 1} / {activeList.length}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
