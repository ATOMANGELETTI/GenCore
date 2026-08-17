export type FileIconKindId =
  | "drive"
  | "folder"
  | "folder-open"
  | "file"
  | "ts"
  | "tsx"
  | "js"
  | "jsx"
  | "json"
  | "toml"
  | "yaml"
  | "xml"
  | "html"
  | "css"
  | "md"
  | "txt"
  | "rs"
  | "py"
  | "go"
  | "java"
  | "c"
  | "cpp"
  | "cs"
  | "sh"
  | "ps1"
  | "sql"
  | "svg"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "archive"
  | "exe"
  | "lock"
  | "env"
  | "git"
  | "docker"
  | "font"
  | "log";

export type FileIconNodeKind = "drive" | "folder" | "file";

export interface FileIconResolveInput {
  nodeKind: FileIconNodeKind;
  extension?: string;
  open?: boolean;
}

export interface FileIconProps extends FileIconResolveInput {
  className?: string;
}
