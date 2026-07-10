/**
 * Presentation formatters for media metadata.
 */

export function formatRuntime(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatYear(date: string | null | undefined): string | null {
  if (!date) return null;
  return date.slice(0, 4);
}

export function formatDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatMoney(amount: number | null | undefined): string | null {
  if (amount == null || amount <= 0) return null;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    notation: amount >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatVote(vote: number | null | undefined, scale = 10): string {
  if (vote == null) return "—";
  return scale === 10 ? vote.toFixed(1) : `${Math.round(vote)}%`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

export function youtubeEmbedUrl(key: string): string {
  return `https://www.youtube.com/embed/${key}?rel=0&modestbranding=1`;
}

/**
 * Muted, looping, chrome-free embed for cinematic hero backgrounds.
 * Prefer the YouTube IFrame API (HeroTrailerBackdrop) for reliable autoplay;
 * this URL is kept for simple iframe fallbacks / dialogs.
 * `playlist` is required for YouTube loop to work.
 */
export function youtubeBackgroundEmbedUrl(key: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    iv_load_policy: "3",
    loop: "1",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
    playlist: key,
    // Skip quiet openers; land closer to the action
    start: "3",
  });
  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`;
}

export function youtubeWatchUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${key}`;
}
