import { useFileList } from "../file-list/file-list.hook";
import type { FileListApi } from "../file-list/file-list.types";
import { useFileOps } from "../file-ops/file-ops.hook";
import type { FileOpsApi } from "../file-ops/file-ops.types";
import { useNavigation } from "../navigation/navigation.hook";
import type { NavigationApi } from "../navigation/navigation.types";

export interface WorkspaceApi {
  readonly navigation: NavigationApi;
  readonly fileList: FileListApi;
  readonly fileOps: FileOpsApi;
}

/** Composes navigation + the current directory's file list + file operations into one instance shared by the whole shell. */
export function useWorkspace(initialPath = ""): WorkspaceApi {
  const navigation = useNavigation(initialPath);
  const fileList = useFileList(navigation.path);
  const fileOps = useFileOps();

  return { navigation, fileList, fileOps };
}
