import { SHORTCUTS } from "@/constants/shortcuts";
import { Kbd } from "@/components/ui/kbd";

/**
 * Keyboard shortcuts reference for Settings.
 */
export function ShortcutsReference() {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Keyboard shortcuts</h2>
        <p className="text-sm text-muted-foreground">
          Navigate Argus without leaving the keyboard. Sequences like G then D work
          outside text fields.
        </p>
      </div>
      <ul className="divide-y divide-border/40 rounded-xl border-0 bg-muted/30 dark:bg-white/[0.04]">
        {SHORTCUTS.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
          >
            <span className="text-muted-foreground">{s.description}</span>
            <span className="flex shrink-0 items-center gap-1">
              {s.keys.map((k, i) => (
                <span key={`${s.id}-${k}-${i}`} className="flex items-center gap-1">
                  {i > 0 && s.sequence ? (
                    <span className="text-xs text-muted-foreground">then</span>
                  ) : null}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
