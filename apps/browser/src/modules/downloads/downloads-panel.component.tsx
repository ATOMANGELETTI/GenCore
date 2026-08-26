import { cn } from "@gencore/ui-kit";
import { CheckCircle2, Download, XCircle } from "lucide-react";
import type { DownloadEntry } from "./downloads.types";

interface DownloadsPanelProps {
  readonly downloads: readonly DownloadEntry[];
}

function statusIcon(status: DownloadEntry["status"]) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-3.5 text-nord-aurora-14" />;
    case "failed":
      return <XCircle className="size-3.5 text-nord-aurora-11" />;
    default:
      return (
        <span className="size-2.5 animate-spin rounded-full border-[1.5px] border-nord-frost-9 border-t-transparent" />
      );
  }
}

export function DownloadsPanel({ downloads }: DownloadsPanelProps) {
  if (downloads.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
        <Download className="size-5 opacity-50" />
        <p>Downloaded files appear here.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 overflow-y-auto p-1.5">
      {[...downloads].reverse().map((download) => (
        <li
          key={download.id}
          className={cn(
            "flex items-center gap-2 rounded-sm px-2 py-1.5",
            download.status === "failed" && "opacity-70",
          )}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            {statusIcon(download.status)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium text-foreground">
              {download.fileName}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {download.status === "failed" ? "Failed" : download.path}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
