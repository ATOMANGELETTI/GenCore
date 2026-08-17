import {
  observeElementRect as observeVirtualElementRect,
  type Rect,
  useVirtualizer,
  type Virtualizer,
} from "@tanstack/react-virtual";
import { ChevronRightIcon } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import { cn } from "../../lib/cn";
import type { TreeProps, TreeRow } from "./tree.types";
import { treeChevronVariants, treeRowVariants, treeVariants } from "./tree.variants";

const ROW_SIZE = 22;
const INDENT_PX = 16;

function observeTreeRect(instance: Virtualizer<HTMLDivElement, Element>, cb: (rect: Rect) => void) {
  return observeVirtualElementRect(instance, (rect) => {
    const element = instance.scrollElement;
    if (!(element instanceof HTMLElement)) {
      cb(rect);
      return;
    }

    const styleHeight = Number.parseFloat(element.style.height);
    const styleWidth = Number.parseFloat(element.style.width);

    cb({
      width: rect.width || element.clientWidth || (Number.isFinite(styleWidth) ? styleWidth : 0),
      height:
        rect.height || element.clientHeight || (Number.isFinite(styleHeight) ? styleHeight : 0),
    });
  });
}

function initialRectFromStyle(style: TreeProps["style"]): Rect | undefined {
  if (!style) {
    return undefined;
  }

  const height =
    typeof style.height === "number" ? style.height : Number.parseFloat(String(style.height ?? ""));
  if (!Number.isFinite(height) || height <= 0) {
    return undefined;
  }

  const width =
    typeof style.width === "number" ? style.width : Number.parseFloat(String(style.width ?? ""));

  return {
    width: Number.isFinite(width) && width > 0 ? width : 320,
    height,
  };
}

function selectedIndex(rows: TreeRow[]): number {
  const index = rows.findIndex((row) => row.selected);
  return index === -1 ? 0 : index;
}

function parentIndex(rows: TreeRow[], index: number): number {
  const depth = rows[index]?.depth ?? 0;
  for (let i = index - 1; i >= 0; i -= 1) {
    const ancestor = rows[i];
    if (ancestor && ancestor.depth < depth) {
      return i;
    }
  }
  return -1;
}

export function Tree({
  rows,
  onSelect,
  onToggle,
  renderLeading,
  renderName,
  className,
  style,
}: TreeProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_SIZE,
    getItemKey: (index) => rows[index]?.id ?? index,
    observeElementRect: observeTreeRect,
    initialRect: initialRectFromStyle(style),
    overscan: 4,
  });

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (rows.length === 0) {
      return;
    }

    const index = selectedIndex(rows);
    const current = rows[index];
    if (!current) {
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = rows[index + 1];
        if (next) {
          onSelect(next.id);
        }
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const previous = rows[index - 1];
        if (previous) {
          onSelect(previous.id);
        }
        break;
      }
      case "ArrowRight": {
        event.preventDefault();
        if (current.expandable && !current.expanded) {
          onToggle(current.id);
        } else {
          const next = rows[index + 1];
          if (next) {
            onSelect(next.id);
          }
        }
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        if (current.expanded) {
          onToggle(current.id);
        } else {
          const parentRow = rows[parentIndex(rows, index)];
          if (parentRow) {
            onSelect(parentRow.id);
          }
        }
        break;
      }
      case "Home": {
        event.preventDefault();
        const first = rows[0];
        if (first) {
          onSelect(first.id);
        }
        break;
      }
      case "End": {
        event.preventDefault();
        const last = rows.at(-1);
        if (last) {
          onSelect(last.id);
        }
        break;
      }
      case "Enter": {
        event.preventDefault();
        onSelect(current.id);
        break;
      }
      default:
        break;
    }
  }

  return (
    <div
      ref={parentRef}
      role="tree"
      tabIndex={0}
      data-slot="tree"
      className={cn(treeVariants(), className)}
      style={style}
      onKeyDown={handleKeyDown}
    >
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) {
            return null;
          }

          return (
            // Keyboard lives on role="tree" (single tab stop). Items are not in the tab order.
            // biome-ignore lint/a11y/useFocusableInteractive: ARIA tree pattern
            // biome-ignore lint/a11y/useKeyWithClickEvents: ARIA tree pattern
            <div
              key={virtualRow.key}
              role="treeitem"
              data-slot="tree-row"
              aria-level={row.depth + 1}
              aria-selected={row.selected}
              aria-expanded={row.expandable ? row.expanded : undefined}
              className={cn(
                treeRowVariants({
                  selected: row.selected,
                  muted: row.muted,
                  overflow: row.overflowVisible ? "visible" : "hidden",
                }),
              )}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                paddingLeft: row.depth * INDENT_PX,
              }}
              onClick={() => {
                parentRef.current?.focus();
                if (row.expandable) {
                  onToggle(row.id);
                } else {
                  onSelect(row.id);
                }
              }}
            >
              {row.expandable ? (
                <button
                  type="button"
                  data-slot="tree-chevron"
                  tabIndex={-1}
                  aria-hidden="true"
                  className={treeChevronVariants({ expanded: row.expanded })}
                  onClick={(event) => {
                    event.stopPropagation();
                    parentRef.current?.focus();
                    onToggle(row.id);
                  }}
                >
                  <ChevronRightIcon className="size-2" aria-hidden="true" />
                </button>
              ) : (
                <span className="size-2 shrink-0" aria-hidden="true" />
              )}
              {renderLeading?.(row)}
              <span
                data-slot="tree-name"
                className={cn("min-w-0", row.overflowVisible ? "overflow-visible" : "truncate")}
              >
                {renderName ? renderName(row) : row.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
