import { Button, cn, Separator } from "@gencore/ui-kit";
import { Check } from "lucide-react";
import * as React from "react";
import { FILE_SIZE_FORMAT_OPTIONS, nextRadioIndex, SECTION_LABEL_CLASS } from "../config.constants";
import { useConfig } from "../config.hook";
import { ConfigToggle } from "../config.toggle";
import type { FileSizeFormat } from "../config.types";

export function GeneralView() {
  const {
    showHiddenFiles,
    setShowHiddenFiles,
    showFileExtensions,
    setShowFileExtensions,
    confirmBeforeDelete,
    setConfirmBeforeDelete,
    fileSizeFormat,
    setFileSizeFormat,
  } = useConfig();
  const formatRefs = React.useRef<Partial<Record<FileSizeFormat, HTMLButtonElement | null>>>({});

  function onFormatRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, id: FileSizeFormat) {
    const currentIndex = FILE_SIZE_FORMAT_OPTIONS.findIndex((option) => option.id === id);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = nextRadioIndex(event.key, currentIndex, FILE_SIZE_FORMAT_OPTIONS.length);
    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = FILE_SIZE_FORMAT_OPTIONS[nextIndex];
    if (next) {
      setFileSizeFormat(next.id);
      formatRefs.current[next.id]?.focus();
    }
  }

  return (
    <div data-slot="general-view">
      <p className={SECTION_LABEL_CLASS}>Files</p>
      <div className="flex flex-col gap-1">
        <ConfigToggle
          checked={showHiddenFiles}
          label="Show hidden files"
          description="Include hidden and system items in listings"
          onCheckedChange={setShowHiddenFiles}
        />
        <ConfigToggle
          checked={showFileExtensions}
          label="Show file extensions"
          description="Display the full name, including the extension"
          onCheckedChange={setShowFileExtensions}
        />
        <ConfigToggle
          checked={confirmBeforeDelete}
          label="Confirm before delete"
          description="Ask before moving items to the Recycle Bin"
          onCheckedChange={setConfirmBeforeDelete}
        />
      </div>

      <p className={SECTION_LABEL_CLASS}>File Size Units</p>
      <div
        role="radiogroup"
        aria-label="File Size Units"
        className="overflow-hidden rounded-sm border border-border bg-background"
      >
        {FILE_SIZE_FORMAT_OPTIONS.map((option, index) => {
          const isSelected = fileSizeFormat === option.id;
          const { Icon } = option;

          return (
            <React.Fragment key={option.id}>
              {index > 0 ? <Separator /> : null}
              <Button
                ref={(node) => {
                  formatRefs.current[option.id] = node;
                }}
                type="button"
                role="radio"
                variant="ghost"
                aria-checked={isSelected}
                aria-label={`${option.title}, ${option.subtitle}`}
                tabIndex={isSelected ? 0 : -1}
                className={cn(
                  "group h-auto w-full justify-start gap-2 rounded-none px-2 py-1.5",
                  isSelected
                    ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                onClick={() => {
                  setFileSizeFormat(option.id);
                }}
                onKeyDown={(event) => {
                  onFormatRadioKeyDown(event, option.id);
                }}
              >
                <Icon aria-hidden="true" className="size-3 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                  <span className="text-xs font-medium">{option.title}</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      isSelected
                        ? "text-accent-foreground"
                        : "text-muted-foreground group-hover:text-accent-foreground",
                    )}
                  >
                    {option.subtitle}
                  </span>
                </span>
                {isSelected ? <Check aria-hidden="true" className="size-3 shrink-0" /> : null}
              </Button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
