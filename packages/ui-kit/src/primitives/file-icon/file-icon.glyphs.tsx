import type { ReactNode } from "react";
import { type NordColorName, nordVar } from "../../tokens/tokens.nord";
import type { FileIconKindId } from "./file-icon.types";

const KIND_FILL: Record<FileIconKindId, NordColorName> = {
  drive: "frost-10",
  folder: "aurora-13",
  "folder-open": "aurora-13",
  file: "polar-3",
  ts: "frost-8",
  tsx: "frost-8",
  js: "aurora-13",
  jsx: "aurora-13",
  json: "aurora-13",
  toml: "aurora-14",
  yaml: "frost-9",
  xml: "frost-10",
  html: "aurora-12",
  css: "frost-8",
  md: "frost-9",
  txt: "polar-3",
  rs: "aurora-12",
  py: "frost-7",
  go: "frost-8",
  java: "aurora-12",
  c: "frost-10",
  cpp: "frost-10",
  cs: "aurora-14",
  sh: "aurora-14",
  ps1: "frost-9",
  sql: "frost-8",
  svg: "aurora-15",
  image: "aurora-15",
  audio: "aurora-15",
  video: "aurora-11",
  pdf: "aurora-11",
  archive: "aurora-13",
  exe: "frost-10",
  lock: "aurora-13",
  env: "aurora-14",
  git: "aurora-12",
  docker: "frost-8",
  font: "snow-4",
  log: "polar-3",
};

const GLYPHS: Record<FileIconKindId, (fill: string) => ReactNode> = {
  drive: (fill) => (
    <>
      <path fill={fill} d="M4.5 5.5h10.25v5H4.5z" />
      <path fill={fill} d="M1.15 7.15h2.2v1.7H1.15z" />
    </>
  ),
  folder: (fill) => <path fill={fill} d="M1.5 3.75h4.25l1.5 1.75H14.5v8.25H1.5z" />,
  "folder-open": (fill) => (
    <path fill={fill} d="M1.25 7.15h13.5L13.2 14.1H2.8zM1.7 3.4h4.6l1.2 2.25H1.7z" />
  ),
  file: (fill) => <path fill={fill} d="M4 1.25h5.75L12.75 4.5v10.25H4z" />,
  ts: (fill) => <path fill={fill} d="M2 1.75h12v3.25H9.75v9.25H6.25V5H2z" />,
  tsx: (fill) => (
    <path fill={fill} d="M2 1.75h12v3H9.25v6.5H6.75V4.75H2zM9.25 12h4.75v2.25H9.25z" />
  ),
  js: (fill) => (
    <path
      fill={fill}
      d="M4.25 1.5h7.5c1.52 0 2.75 1.23 2.75 2.75v7.5c0 1.52-1.23 2.75-2.75 2.75h-7.5C2.73 14.5 1.5 13.27 1.5 11.75v-7.5C1.5 2.73 2.73 1.5 4.25 1.5z"
    />
  ),
  jsx: (fill) => (
    <path
      fill={fill}
      d="M3.4 1.5h7.4c1.35 0 2.45 1.1 2.45 2.45v5.35H11.4v4.7H8.15V9.3H3.4c-1.35 0-2.45-1.1-2.45-2.45v-5.4C.95 2.6 2.05 1.5 3.4 1.5z"
    />
  ),
  json: (fill) => (
    <path
      fill={fill}
      d="M6.35 1.6c-2.35 0-3.7 1.35-3.7 3.2 0 1.1.7 1.95 1.8 2.4-1.1.45-1.8 1.3-1.8 2.45 0 1.85 1.35 3.25 3.7 3.25h1.15V11.1h-.75c-1.1 0-1.8-.7-1.8-1.6 0-.8.55-1.35 1.65-1.35h.9V7.35h-.9c-1.1 0-1.65-.55-1.65-1.35 0-.9.7-1.6 1.8-1.6h.75V1.6zm3.3 0h1.15c2.35 0 3.7 1.35 3.7 3.2 0 1.1-.7 1.95-1.8 2.4 1.1.45 1.8 1.3 1.8 2.45 0 1.85-1.35 3.25-3.7 3.25H9.65V11.1h.75c1.1 0 1.8-.7 1.8-1.6 0-.8-.55-1.35-1.65-1.35h-.9V7.35h.9c1.1 0 1.65-.55 1.65-1.35 0-.9-.7-1.6-1.8-1.6h-.75z"
    />
  ),
  toml: (fill) => <path fill={fill} d="M2 2.25h12v2.25H2zM2 6.9h12v2.25H2zM2 11.5h12v2.25H2z" />,
  yaml: (fill) => <path fill={fill} d="M2 2.25h12v2.25H2zM2 6.9h8.5v2.25H2zM2 11.5h5.25v2.25H2z" />,
  xml: (fill) => (
    <path
      fill={fill}
      d="M6.75 2.25 1.5 8l5.25 5.75 1.6-1.5L4.7 8l3.65-4.25zM9.25 2.25l-1.6 1.5L11.3 8l-3.65 4.25 1.6 1.5L14.5 8z"
    />
  ),
  html: (fill) => (
    <path
      fill={fill}
      d="M5.7 2.15 1.35 8l4.35 5.85 1.45-1.35L4.15 8l3-4.5zM10.3 2.15l-1.45 1.35L11.85 8l-3 4.5 1.45 1.35L14.65 8zM9.55 2.2h1.7L6.45 13.8H4.75z"
    />
  ),
  css: (fill) => (
    <path
      fill={fill}
      d="M5.45 1.4h1.7v13.2H5.45zM8.85 1.4h1.7v13.2H8.85zM1.4 5.2h13.2v1.7H1.4zM1.4 9.1h13.2v1.7H1.4z"
    />
  ),
  md: (fill) => (
    <path
      fill={fill}
      d="M2 13.75V2.25h2.45l3.55 6.35 3.55-6.35H14v11.5h-2.4V6.35L8.35 12.2h-.7L4.4 6.35v7.4z"
    />
  ),
  txt: (fill) => (
    <path
      fill={fill}
      d="M2.5 1.75h11v1.5H2.5zM2.5 5.4h11v1.5H2.5zM2.5 9.05h11v1.5H2.5zM2.5 12.7h8v1.5H2.5z"
    />
  ),
  rs: (fill) => <path fill={fill} d="M8 1.2 14.3 4.7v6.6L8 14.8 1.7 11.3V4.7z" />,
  py: (fill) => (
    <path
      fill={fill}
      d="M8 1.35a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4zM8 8.25a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4z"
    />
  ),
  go: (fill) => (
    <path fill={fill} d="M4.35 4.2h7.3a3.8 3.8 0 0 1 0 7.6h-7.3a3.8 3.8 0 0 1 0-7.6z" />
  ),
  java: (fill) => (
    <path
      fill={fill}
      d="M3.2 2.4h7.6v6.7c0 2.15-1.7 3.5-3.8 3.5s-3.8-1.35-3.8-3.5zM10.8 4.35h1.25c1.15 0 2.1.9 2.1 2.05s-.95 2.05-2.1 2.05H10.8z"
    />
  ),
  c: (fill) => (
    <path fill={fill} d="M12.7 3.35A6.05 6.05 0 1 0 12.7 12.65l-2.2-1.4a3.45 3.45 0 1 1 0-6.5z" />
  ),
  cpp: (fill) => (
    <path
      fill={fill}
      d="M10.15 3.45A5.55 5.55 0 1 0 10.15 12.55l-2-1.3a3.15 3.15 0 1 1 0-6.5zM11.05 6.2h1.55V4.65h1.7V6.2H15.85v1.7h-1.55v1.55h-1.7V7.9h-1.55z"
    />
  ),
  cs: (fill) => (
    <path
      fill={fill}
      d="M10.15 3.45A5.55 5.55 0 1 0 10.15 12.55l-2-1.3a3.15 3.15 0 1 1 0-6.5zM11 5.7h3.55v3.55H11z"
    />
  ),
  sh: (fill) => <path fill={fill} d="M2.15 3.35 9.6 8 2.15 12.65zM10.7 10.7h3.15v2.35H10.7z" />,
  ps1: (fill) => <path fill={fill} d="M9.85 1.2 4.15 8.45h3.45L5 14.8l7.2-8.5H8.7z" />,
  sql: (fill) => (
    <path
      fill={fill}
      d="M3 3.7c0-1.35 2.24-2.45 5-2.45s5 1.1 5 2.45v8.6c0 1.35-2.24 2.45-5 2.45s-5-1.1-5-2.45z"
    />
  ),
  svg: (fill) => <path fill={fill} d="M8 1.2 14.8 8 8 14.8 1.2 8z" />,
  image: (fill) => (
    <path
      fill={fill}
      d="M1.2 13.3 5.45 6.4l2.55 3.55 3.2-5.45 3.6 8.8zM11.55 2.2a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8z"
    />
  ),
  audio: (fill) => <path fill={fill} d="M2.2 5.7h3.15L9.55 2.45v11.1L5.35 10.3H2.2z" />,
  video: (fill) => <path fill={fill} d="M3.35 2.15 13.85 8 3.35 13.85z" />,
  pdf: (fill) => (
    <path fill={fill} d="M5.1 1.4h6.1L14.2 4.85v9.75H5.1zM1.4 6.4h3.7v6.35L3.25 11.5 1.4 12.75z" />
  ),
  archive: (fill) => <path fill={fill} d="M1.5 6.2h13v8.3h-13zM8 1.4 14.5 6.2H1.5z" />,
  exe: (fill) => <path fill={fill} d="M2 2.15h12v2.55H2zM2 6.2h12v7.65H2z" />,
  lock: (fill) => (
    <path
      fill={fill}
      d="M8 1.45a3.15 3.15 0 0 1 3.15 3.15v2.35h-1.75V4.6a1.4 1.4 0 0 0-2.8 0v2.35H4.85V4.6A3.15 3.15 0 0 1 8 1.45zM3.55 7.15h8.9v7.4H3.55z"
    />
  ),
  env: (fill) => (
    <path
      fill={fill}
      d="M3.1 8a2.7 2.7 0 1 1 2.45 1.3h3.15V7.45h1.45v1.85h1.4V7.45h1.45v3.4H5.55A2.7 2.7 0 0 1 3.1 8z"
    />
  ),
  git: (fill) => (
    <path
      fill={fill}
      d="M7.15 1.4h1.7v6.15l3.65-2.75 1.2 1.6-3.95 2.95V14.6H7.15V9.35L3.2 6.4l1.2-1.6 2.75 2.1z"
    />
  ),
  docker: (fill) => (
    <path
      fill={fill}
      d="M1.7 8.2h4.2v4.2H1.7zM5.95 8.2h4.2v4.2H5.95zM10.2 8.2h4.1v4.2H10.2zM3.85 3.5h4.2v4.2H3.85z"
    />
  ),
  font: (fill) => (
    <path
      fill={fill}
      fillRule="evenodd"
      d="M8 1.4 14.55 14.6h-2.75l-1.3-3.2H5.5l-1.3 3.2H1.45zm-1.65 7.7h3.3L8 5.35z"
    />
  ),
  log: (fill) => (
    <path
      fill={fill}
      d="M3.2 2.2h9.5a1.65 1.65 0 0 1 0 3.3H5.45v5.95h7.25a1.65 1.65 0 1 1 0 3.3H3.2a1.65 1.65 0 1 1 0-3.3h2.25V5.5H3.2a1.65 1.65 0 0 1 0-3.3z"
    />
  ),
};

export function FileIconGlyph({ kind }: { kind: FileIconKindId }) {
  return GLYPHS[kind](nordVar(KIND_FILL[kind]));
}
