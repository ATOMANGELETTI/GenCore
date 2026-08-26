export interface Bookmark {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly createdAtMs: number;
}

export interface BookmarksDocumentV1 {
  readonly version: 1;
  readonly bookmarks: readonly Bookmark[];
}

export interface BookmarksApi {
  readonly bookmarks: readonly Bookmark[];
  readonly loaded: boolean;
  isBookmarked: (url: string) => boolean;
  addBookmark: (url: string, title: string) => void;
  removeBookmark: (url: string) => void;
  toggleBookmark: (url: string, title: string) => void;
}
