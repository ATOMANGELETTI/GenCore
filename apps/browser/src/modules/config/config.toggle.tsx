import { cn } from "@gencore/ui-kit";

interface ConfigToggleProps {
  readonly checked: boolean;
  readonly label: string;
  readonly description?: string;
  onCheckedChange: (value: boolean) => void;
}

/**
 * Minimal accessible switch, local to the browser's Config tab. `ui-kit` has
 * no Switch primitive yet, so this stays local rather than prematurely
 * generalized (mirrors Explorer's `config.toggle.tsx`).
 */
export function ConfigToggle({ checked, label, description, onCheckedChange }: ConfigToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-sm px-1 py-1.5 hover:bg-accent/50">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium">{label}</span>
        {description ? (
          <span className="truncate text-[11px] text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-4.5 w-8 shrink-0 rounded-full border border-border transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}
