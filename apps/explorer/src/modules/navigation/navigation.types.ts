export interface BreadcrumbSegment {
  readonly label: string;
  readonly path: string;
}

export interface NavigationApi {
  readonly path: string;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly breadcrumbs: readonly BreadcrumbSegment[];
  navigateTo: (path: string) => void;
  back: () => void;
  forward: () => void;
  up: () => void;
}
