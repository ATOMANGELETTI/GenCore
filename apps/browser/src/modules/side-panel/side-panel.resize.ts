export const DEFAULT_SIDE_PANEL_WIDTH = 280;
export const MIN_SIDE_PANEL_WIDTH = 200;
export const SIDE_PANEL_WIDTH_STEP = 10;

export function maxSidePanelWidth(containerWidth: number): number {
  const half =
    containerWidth > 0 ? Math.floor(containerWidth / 2) : Math.floor(window.innerWidth / 2);
  return Math.max(MIN_SIDE_PANEL_WIDTH, half);
}

export function clampSidePanelWidth(width: number, containerWidth: number): number {
  const max = maxSidePanelWidth(containerWidth);
  return Math.min(max, Math.max(MIN_SIDE_PANEL_WIDTH, width));
}
