import { Badge, FileIcon } from "@gencore/ui-kit";
import { Info } from "lucide-react";
import { useConfig } from "../config/config.hook";
import { formatModified, formatSize } from "../file-list/file-list.format";
import { useDetails } from "./details.hook";

interface DetailsProps {
  readonly selectedPaths: ReadonlySet<string>;
}

export function Details({ selectedPaths }: DetailsProps) {
  const paths = [...selectedPaths];

  if (paths.length === 0) {
    return <EmptyState message="Select a file or folder to see its details." />;
  }

  if (paths.length > 1) {
    return <MultiSelectionSummary count={paths.length} />;
  }

  return <SingleSelectionDetails path={paths[0] as string} />;
}

function SingleSelectionDetails({ path }: { path: string }) {
  const { stat, loading } = useDetails(path);
  const { fileSizeFormat } = useConfig();

  if (loading || !stat) {
    return <EmptyState message="Loading…" />;
  }

  return (
    <div
      data-slot="details-panel"
      className="flex h-full flex-col gap-3 overflow-y-auto p-3 text-xs"
    >
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <FileIcon
          className="size-10"
          nodeKind={stat.kind === "dir" ? "folder" : "file"}
          extension={stat.extension ?? undefined}
        />
        <span className="w-full truncate font-medium" title={stat.name}>
          {stat.name}
        </span>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5">
        <Row
          label="Type"
          value={stat.kind === "dir" ? "File folder" : (stat.extension?.toUpperCase() ?? "File")}
        />
        {stat.kind !== "dir" && <Row label="Size" value={formatSize(stat.size, fileSizeFormat)} />}
        <Row label="Modified" value={formatModified(stat.modifiedMs)} />
        <Row label="Created" value={formatModified(stat.createdMs)} />
        <Row label="Path" value={stat.path} mono />
      </dl>

      {(stat.readonly || stat.hidden || stat.system) && (
        <div className="flex flex-wrap gap-1 pt-1">
          {stat.readonly && <Badge variant="outline">Read-only</Badge>}
          {stat.hidden && <Badge variant="outline">Hidden</Badge>}
          {stat.system && <Badge variant="outline">System</Badge>}
        </div>
      )}
    </div>
  );
}

function MultiSelectionSummary({ count }: { count: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted-foreground">
      <Info className="size-6 opacity-50" aria-hidden="true" />
      <span>{count} items selected</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted-foreground">
      <Info className="size-6 opacity-50" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "truncate font-mono" : "truncate"} title={value}>
        {value}
      </dd>
    </>
  );
}
