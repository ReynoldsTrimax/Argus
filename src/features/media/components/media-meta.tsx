import { cn } from "@/lib/utils";

interface MetaItem {
  label: string;
  value: React.ReactNode;
}

interface MediaMetaProps {
  items: MetaItem[];
  className?: string;
}

/**
 * Definition-list style metadata grid for detail pages.
 */
export function MediaMeta({ items, className }: MediaMetaProps) {
  const filtered = items.filter((i) => i.value != null && i.value !== "" && i.value !== "—");
  if (!filtered.length) return null;

  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {filtered.map((item) => (
        <div key={item.label} className="space-y-0.5">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {item.label}
          </dt>
          <dd className="text-sm font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
