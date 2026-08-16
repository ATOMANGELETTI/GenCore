import { cn } from "../../lib/cn";
import { Badge } from "../../primitives/badge";
import type { TitlebarProps, TrafficLightKind, TrafficLightsProps } from "./titlebar.types";
import { titlebarTitleVariants, titlebarVariants, trafficLightVariants } from "./titlebar.variants";

const trafficLightGlyph: Record<TrafficLightKind, string> = {
  close: "\u00D7",
  minimize: "\u2212",
  maximize: "\u002B",
};

const trafficLightLabel: Record<TrafficLightKind, string> = {
  close: "Close window",
  minimize: "Minimize window",
  maximize: "Toggle maximize window",
};

export function TrafficLights({
  className,
  onClose,
  onMinimize,
  onToggleMaximize,
  ...props
}: TrafficLightsProps) {
  const lights: { kind: TrafficLightKind; onClick: (() => void) | undefined }[] = [
    { kind: "close", onClick: onClose },
    { kind: "minimize", onClick: onMinimize },
    { kind: "maximize", onClick: onToggleMaximize },
  ];

  return (
    <div
      data-slot="traffic-lights"
      className={cn("group/traffic flex items-center gap-2", className)}
      {...props}
    >
      {lights.map(({ kind, onClick }) => (
        <button
          key={kind}
          type="button"
          data-slot={`traffic-light-${kind}`}
          aria-label={trafficLightLabel[kind]}
          disabled={!onClick}
          onClick={onClick}
          className={trafficLightVariants({ light: kind, active: Boolean(onClick) })}
        >
          <span
            aria-hidden="true"
            className="opacity-0 transition-opacity duration-100 group-hover/traffic:opacity-100"
          >
            {trafficLightGlyph[kind]}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Titlebar({
  className,
  title,
  version,
  titlebarStart,
  titlebarEnd,
  showTrafficLights = true,
  onClose,
  onMinimize,
  onToggleMaximize,
  children,
  ...props
}: TitlebarProps) {
  return (
    <header
      data-slot="titlebar"
      data-tauri-drag-region
      className={cn(titlebarVariants(), className)}
      {...props}
    >
      {showTrafficLights ? (
        <TrafficLights
          onClose={onClose}
          onMinimize={onMinimize}
          onToggleMaximize={onToggleMaximize}
        />
      ) : null}

      {titlebarStart ? (
        <div data-slot="titlebar-start" className="z-10 flex items-center gap-1">
          {titlebarStart}
        </div>
      ) : null}

      {title ? (
        <span data-slot="titlebar-title" data-tauri-drag-region className={titlebarTitleVariants()}>
          {title}
        </span>
      ) : null}

      <div data-slot="titlebar-end" className="z-10 ml-auto flex items-center gap-2">
        {titlebarEnd}
        {version ? (
          <Badge data-slot="titlebar-version" variant="outline" numeric>
            {version}
          </Badge>
        ) : null}
      </div>

      {children}
    </header>
  );
}
