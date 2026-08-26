import { Button, Input } from "@gencore/ui-kit";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { SEARCH_ENGINE_OPTIONS, SECTION_LABEL_CLASS } from "../config.constants";
import { useConfig } from "../config.hook";
import { ConfigToggle } from "../config.toggle";

interface GeneralViewProps {
  onClearBrowsingData?: () => void;
}

export function GeneralView({ onClearBrowsingData }: GeneralViewProps) {
  const {
    homepageUrl,
    setHomepageUrl,
    searchEngineId,
    setSearchEngineId,
    showBookmarksBar,
    setShowBookmarksBar,
  } = useConfig();
  const [homepageDraft, setHomepageDraft] = React.useState(homepageUrl);

  React.useEffect(() => {
    setHomepageDraft(homepageUrl);
  }, [homepageUrl]);

  return (
    <div data-slot="general-view">
      <p className={SECTION_LABEL_CLASS}>Search engine</p>
      <div className="flex flex-col gap-1 overflow-hidden rounded-sm border border-border bg-background p-1">
        {SEARCH_ENGINE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-accent"
          >
            <input
              type="radio"
              name="search-engine"
              checked={searchEngineId === option.id}
              onChange={() => setSearchEngineId(option.id)}
              className="size-3.5 accent-nord-frost-10"
            />
            <span className="text-xs">{option.title}</span>
          </label>
        ))}
      </div>

      <p className={SECTION_LABEL_CLASS}>Homepage</p>
      <Input
        value={homepageDraft}
        onChange={(event) => setHomepageDraft(event.target.value)}
        onBlur={() => {
          const trimmed = homepageDraft.trim();
          if (trimmed) {
            setHomepageUrl(trimmed);
          } else {
            setHomepageDraft(homepageUrl);
          }
        }}
        className="h-7 text-xs"
        aria-label="Homepage URL"
      />

      <p className={SECTION_LABEL_CLASS}>Layout</p>
      <div className="flex flex-col gap-1">
        <ConfigToggle
          checked={showBookmarksBar}
          label="Show bookmarks bar"
          description="Display starred bookmarks below the address bar"
          onCheckedChange={setShowBookmarksBar}
        />
      </div>

      <p className={SECTION_LABEL_CLASS}>Privacy</p>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onClearBrowsingData}>
        <Trash2 className="size-3.5" />
        Clear browsing data
      </Button>
    </div>
  );
}
