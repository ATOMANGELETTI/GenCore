// Isolation application hook (sandboxed, runs before every IPC message is
// encrypted and forwarded to Tauri core). Anything not explicitly allowlisted
// here is dropped, regardless of what the (untrusted) main frontend sends.
//
// Allowed:
//   - gencore-core's app-info query, tray_action, and set_theme_icon
//   - the core window commands the titlebar/traffic-lights use, plus theme()
//   - opener open_url for the GenCore GitHub repository only, and open_path
//     for opening a file with its OS default app (no scope restriction —
//     the app already grants unrestricted gencore-fs filesystem access)
//   - gencore-fs list/list_drives/stat/create_file/create_dir/rename/delete/
//     copy/move_paths/watch/unwatch
//   - event listen/unlisten for gencore-fs://entry-changed (Any) and
//     tauri://theme-changed (Window main or tray-menu) only
(() => {
  const ALLOWED_COMMANDS = [
    "plugin:gencore-core|get_app_info",
    "plugin:gencore-core|tray_action",
    "plugin:gencore-core|set_theme_icon",
    "plugin:window|close",
    "plugin:window|minimize",
    "plugin:window|toggle_maximize",
    "plugin:window|start_dragging",
    "plugin:window|theme",
    "plugin:opener|open_url",
    "plugin:opener|open_path",
    "plugin:gencore-fs|list",
    "plugin:gencore-fs|list_drives",
    "plugin:gencore-fs|stat",
    "plugin:gencore-fs|create_file",
    "plugin:gencore-fs|create_dir",
    "plugin:gencore-fs|rename",
    "plugin:gencore-fs|delete",
    "plugin:gencore-fs|copy",
    "plugin:gencore-fs|move_paths",
    "plugin:gencore-fs|watch",
    "plugin:gencore-fs|unwatch",
    "plugin:event|listen",
    "plugin:event|unlisten",
  ];
  const OPEN_URL_CMD = "plugin:opener|open_url";
  const OPEN_PATH_CMD = "plugin:opener|open_path";
  const GET_APP_INFO_CMD = "plugin:gencore-core|get_app_info";
  const TRAY_ACTION_CMD = "plugin:gencore-core|tray_action";
  const SET_THEME_ICON_CMD = "plugin:gencore-core|set_theme_icon";
  const THEME_CMD = "plugin:window|theme";
  const LIST_CMD = "plugin:gencore-fs|list";
  const LIST_DRIVES_CMD = "plugin:gencore-fs|list_drives";
  const STAT_CMD = "plugin:gencore-fs|stat";
  const CREATE_FILE_CMD = "plugin:gencore-fs|create_file";
  const CREATE_DIR_CMD = "plugin:gencore-fs|create_dir";
  const RENAME_CMD = "plugin:gencore-fs|rename";
  const DELETE_CMD = "plugin:gencore-fs|delete";
  const COPY_CMD = "plugin:gencore-fs|copy";
  const MOVE_PATHS_CMD = "plugin:gencore-fs|move_paths";
  const WATCH_CMD = "plugin:gencore-fs|watch";
  const UNWATCH_CMD = "plugin:gencore-fs|unwatch";
  const LISTEN_CMD = "plugin:event|listen";
  const UNLISTEN_CMD = "plugin:event|unlisten";
  const ENTRY_CHANGED_EVENT = "gencore-fs://entry-changed";
  const THEME_CHANGED_EVENT = "tauri://theme-changed";
  const THEME_POLAR_NIGHT = "polar-night";
  const THEME_SNOW_STORM = "snow-storm";
  const ALLOWED_OPEN_URL = "https://github.com/ATOMANGELETTI/GenCore";
  const MAIN_WINDOW_LABEL = "main";
  const TRAY_MENU_WINDOW_LABEL = "tray-menu";
  const PATH_MIN_LENGTH = 1;
  const PATH_MAX_LENGTH = 32767;
  const NAME_MAX_LENGTH = 255;
  const PATHS_MAX_LENGTH = 512;

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function isEmptyArgs(args) {
    return (
      args === undefined || args === null || (isPlainObject(args) && Object.keys(args).length === 0)
    );
  }

  function isEmptyArgCommand(cmd) {
    return cmd === GET_APP_INFO_CMD || cmd === LIST_DRIVES_CMD;
  }

  function isMainWindowArgs(args) {
    if (isEmptyArgs(args)) {
      return true;
    }
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return keys.length === 1 && keys[0] === "label" && args.label === MAIN_WINDOW_LABEL;
  }

  function isThemeWindowArgs(args) {
    if (isEmptyArgs(args)) {
      return true;
    }
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return keys.length === 1 && keys[0] === "label" && isAllowedWindowLabel(args.label);
  }

  function isAllowedOpenUrlArgs(args) {
    if (!isPlainObject(args) || args.url !== ALLOWED_OPEN_URL) {
      return false;
    }
    const keys = Object.keys(args);
    let hasUrl = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "url") {
        hasUrl = true;
        continue;
      }
      if (key === "with") {
        if (args.with !== undefined) {
          return false;
        }
        continue;
      }
      return false;
    }
    return hasUrl;
  }

  function isAllowedPath(path) {
    return (
      typeof path === "string" &&
      path.length >= PATH_MIN_LENGTH &&
      path.length <= PATH_MAX_LENGTH &&
      path.indexOf("\0") === -1
    );
  }

  function isAllowedFileName(name) {
    return (
      typeof name === "string" &&
      name.length >= 1 &&
      name.length <= NAME_MAX_LENGTH &&
      name.indexOf("\0") === -1
    );
  }

  function isPathsArray(value) {
    return (
      Array.isArray(value) &&
      value.length >= 1 &&
      value.length <= PATHS_MAX_LENGTH &&
      value.every(isAllowedPath)
    );
  }

  function isOpenPathArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    let hasPath = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "path") {
        hasPath = true;
        continue;
      }
      if (key === "with") {
        if (args.with !== undefined) {
          return false;
        }
        continue;
      }
      return false;
    }
    return hasPath && isAllowedPath(args.path);
  }

  function isFsPathCommand(cmd) {
    return (
      cmd === LIST_CMD ||
      cmd === STAT_CMD ||
      cmd === CREATE_FILE_CMD ||
      cmd === CREATE_DIR_CMD ||
      cmd === UNWATCH_CMD
    );
  }

  function isPathOnlyArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return keys.length === 1 && keys[0] === "path" && isAllowedPath(args.path);
  }

  function isWatchArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 2) {
      return false;
    }
    let hasPath = false;
    let hasRecursive = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "path") {
        hasPath = true;
        continue;
      }
      if (key === "recursive") {
        hasRecursive = true;
        continue;
      }
      return false;
    }
    return hasPath && hasRecursive && isAllowedPath(args.path) && args.recursive === false;
  }

  function isRenameArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 2) {
      return false;
    }
    let hasPath = false;
    let hasNewName = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "path") {
        hasPath = true;
        continue;
      }
      if (key === "new_name") {
        hasNewName = true;
        continue;
      }
      return false;
    }
    return hasPath && hasNewName && isAllowedPath(args.path) && isAllowedFileName(args.new_name);
  }

  function isDeleteArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return keys.length === 1 && keys[0] === "paths" && isPathsArray(args.paths);
  }

  function isCopyOrMoveCommand(cmd) {
    return cmd === COPY_CMD || cmd === MOVE_PATHS_CMD;
  }

  function isCopyOrMoveArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 2) {
      return false;
    }
    let hasPaths = false;
    let hasDestinationDir = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "paths") {
        hasPaths = true;
        continue;
      }
      if (key === "destination_dir") {
        hasDestinationDir = true;
        continue;
      }
      return false;
    }
    return (
      hasPaths &&
      hasDestinationDir &&
      isPathsArray(args.paths) &&
      isAllowedPath(args.destination_dir)
    );
  }

  function isTrayActionArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return (
      keys.length === 1 &&
      keys[0] === "action" &&
      (args.action === "show" || args.action === "hide" || args.action === "quit")
    );
  }

  function isSetThemeIconArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return (
      keys.length === 1 &&
      keys[0] === "theme" &&
      (args.theme === THEME_POLAR_NIGHT || args.theme === THEME_SNOW_STORM)
    );
  }

  function isAllowedWindowLabel(label) {
    return label === MAIN_WINDOW_LABEL || label === TRAY_MENU_WINDOW_LABEL;
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isAnyTarget(target) {
    if (!isPlainObject(target)) {
      return false;
    }
    const keys = Object.keys(target);
    return keys.length === 1 && keys[0] === "kind" && target.kind === "Any";
  }

  function isWindowTarget(target) {
    if (!isPlainObject(target)) {
      return false;
    }
    const keys = Object.keys(target);
    if (keys.length !== 2) {
      return false;
    }
    let hasKind = false;
    let hasLabel = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "kind") {
        hasKind = true;
        continue;
      }
      if (key === "label") {
        hasLabel = true;
        continue;
      }
      return false;
    }
    return hasKind && hasLabel && target.kind === "Window" && isAllowedWindowLabel(target.label);
  }

  function isAllowedListenEvent(event, target) {
    if (event === ENTRY_CHANGED_EVENT) {
      return isAnyTarget(target);
    }
    if (event === THEME_CHANGED_EVENT) {
      return isWindowTarget(target);
    }
    return false;
  }

  function isListenArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 3) {
      return false;
    }
    let hasEvent = false;
    let hasTarget = false;
    let hasHandler = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "event") {
        hasEvent = true;
        continue;
      }
      if (key === "target") {
        hasTarget = true;
        continue;
      }
      if (key === "handler") {
        hasHandler = true;
        continue;
      }
      return false;
    }
    return (
      hasEvent &&
      hasTarget &&
      hasHandler &&
      isAllowedListenEvent(args.event, args.target) &&
      isFiniteNumber(args.handler)
    );
  }

  function isUnlistenArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 2) {
      return false;
    }
    let hasEvent = false;
    let hasEventId = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "event") {
        hasEvent = true;
        continue;
      }
      if (key === "eventId") {
        hasEventId = true;
        continue;
      }
      return false;
    }
    return (
      hasEvent &&
      hasEventId &&
      (args.event === ENTRY_CHANGED_EVENT || args.event === THEME_CHANGED_EVENT) &&
      isFiniteNumber(args.eventId)
    );
  }

  function reconstructListen(args) {
    if (args.event === THEME_CHANGED_EVENT) {
      return {
        event: THEME_CHANGED_EVENT,
        target: { kind: "Window", label: args.target.label },
        handler: args.handler,
      };
    }
    return {
      event: ENTRY_CHANGED_EVENT,
      target: { kind: "Any" },
      handler: args.handler,
    };
  }

  function reconstructInnerPayload(cmd, args) {
    if (cmd === OPEN_URL_CMD) {
      return { url: ALLOWED_OPEN_URL };
    }
    if (cmd === OPEN_PATH_CMD) {
      return { path: args.path };
    }
    if (isEmptyArgCommand(cmd)) {
      if (args === undefined || args === null) {
        return undefined;
      }
      return {};
    }
    if (cmd === TRAY_ACTION_CMD) {
      return { action: args.action };
    }
    if (cmd === SET_THEME_ICON_CMD) {
      return { theme: args.theme };
    }
    if (isFsPathCommand(cmd)) {
      return { path: args.path };
    }
    if (cmd === WATCH_CMD) {
      return { path: args.path, recursive: false };
    }
    if (cmd === RENAME_CMD) {
      return { path: args.path, new_name: args.new_name };
    }
    if (cmd === DELETE_CMD) {
      return { paths: args.paths.slice() };
    }
    if (isCopyOrMoveCommand(cmd)) {
      return { paths: args.paths.slice(), destination_dir: args.destination_dir };
    }
    if (cmd === LISTEN_CMD) {
      return reconstructListen(args);
    }
    if (cmd === UNLISTEN_CMD) {
      return { event: args.event, eventId: args.eventId };
    }
    if (cmd === THEME_CMD && !isEmptyArgs(args)) {
      return { label: args.label };
    }
    if (isEmptyArgs(args)) {
      if (args === undefined || args === null) {
        return undefined;
      }
      return {};
    }
    return { label: MAIN_WINDOW_LABEL };
  }

  function reject() {
    throw new Error("IPC command is not allowlisted by the isolation hook");
  }

  function sanitize(payload, innerPayload) {
    return {
      cmd: payload.cmd,
      callback: payload.callback,
      error: payload.error,
      payload: innerPayload,
      options: payload.options,
    };
  }

  window.__TAURI_ISOLATION_HOOK__ = (payload) => {
    if (!isPlainObject(payload) || typeof payload.cmd !== "string") {
      reject();
    }

    if (ALLOWED_COMMANDS.indexOf(payload.cmd) === -1) {
      reject();
    }

    if (payload.cmd === OPEN_URL_CMD) {
      if (!isAllowedOpenUrlArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === OPEN_PATH_CMD) {
      if (!isOpenPathArgs(payload.payload)) {
        reject();
      }
    } else if (isEmptyArgCommand(payload.cmd)) {
      if (!isEmptyArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === TRAY_ACTION_CMD) {
      if (!isTrayActionArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === SET_THEME_ICON_CMD) {
      if (!isSetThemeIconArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === WATCH_CMD) {
      if (!isWatchArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === RENAME_CMD) {
      if (!isRenameArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === DELETE_CMD) {
      if (!isDeleteArgs(payload.payload)) {
        reject();
      }
    } else if (isCopyOrMoveCommand(payload.cmd)) {
      if (!isCopyOrMoveArgs(payload.payload)) {
        reject();
      }
    } else if (isFsPathCommand(payload.cmd)) {
      if (!isPathOnlyArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === LISTEN_CMD) {
      if (!isListenArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === UNLISTEN_CMD) {
      if (!isUnlistenArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === THEME_CMD) {
      if (!isThemeWindowArgs(payload.payload)) {
        reject();
      }
    } else if (!isMainWindowArgs(payload.payload)) {
      reject();
    }

    return sanitize(payload, reconstructInnerPayload(payload.cmd, payload.payload));
  };
})();
