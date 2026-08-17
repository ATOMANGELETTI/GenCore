// Isolation application hook (sandboxed, runs before every IPC message is
// encrypted and forwarded to Tauri core). Anything not explicitly allowlisted
// here is dropped, regardless of what the (untrusted) main frontend sends.
//
// Allowed:
//   - gencore-core's app-info query
//   - the core window commands the titlebar/traffic-lights use
//   - opener open_url for the GenCore GitHub repository only
//   - gencore-fs list/list_drives/create_file/create_dir/watch/unwatch
//   - event listen/unlisten for gencore-fs://entry-changed only
(() => {
  const ALLOWED_COMMANDS = [
    "plugin:gencore-core|get_app_info",
    "plugin:window|close",
    "plugin:window|minimize",
    "plugin:window|toggle_maximize",
    "plugin:window|start_dragging",
    "plugin:opener|open_url",
    "plugin:gencore-fs|list_drives",
    "plugin:gencore-fs|list",
    "plugin:gencore-fs|create_file",
    "plugin:gencore-fs|create_dir",
    "plugin:gencore-fs|watch",
    "plugin:gencore-fs|unwatch",
    "plugin:event|listen",
    "plugin:event|unlisten",
  ];
  const OPEN_URL_CMD = "plugin:opener|open_url";
  const GET_APP_INFO_CMD = "plugin:gencore-core|get_app_info";
  const LIST_DRIVES_CMD = "plugin:gencore-fs|list_drives";
  const LIST_CMD = "plugin:gencore-fs|list";
  const CREATE_FILE_CMD = "plugin:gencore-fs|create_file";
  const CREATE_DIR_CMD = "plugin:gencore-fs|create_dir";
  const WATCH_CMD = "plugin:gencore-fs|watch";
  const UNWATCH_CMD = "plugin:gencore-fs|unwatch";
  const LISTEN_CMD = "plugin:event|listen";
  const UNLISTEN_CMD = "plugin:event|unlisten";
  const ENTRY_CHANGED_EVENT = "gencore-fs://entry-changed";
  const ALLOWED_OPEN_URL = "https://github.com/ATOMANGELETTI/GenCore";
  const MAIN_WINDOW_LABEL = "main";
  const PATH_MIN_LENGTH = 1;
  const PATH_MAX_LENGTH = 32767;

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function isEmptyArgs(args) {
    return (
      args === undefined || args === null || (isPlainObject(args) && Object.keys(args).length === 0)
    );
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

  function isFsPathCommand(cmd) {
    return (
      cmd === LIST_CMD || cmd === CREATE_FILE_CMD || cmd === CREATE_DIR_CMD || cmd === UNWATCH_CMD
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
      args.event === ENTRY_CHANGED_EVENT &&
      isAnyTarget(args.target) &&
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
      hasEvent && hasEventId && args.event === ENTRY_CHANGED_EVENT && isFiniteNumber(args.eventId)
    );
  }

  function reconstructInnerPayload(cmd, args) {
    if (cmd === OPEN_URL_CMD) {
      return { url: ALLOWED_OPEN_URL };
    }
    if (cmd === GET_APP_INFO_CMD || cmd === LIST_DRIVES_CMD) {
      if (args === undefined || args === null) {
        return undefined;
      }
      return {};
    }
    if (isFsPathCommand(cmd)) {
      return { path: args.path };
    }
    if (cmd === WATCH_CMD) {
      return { path: args.path, recursive: false };
    }
    if (cmd === LISTEN_CMD) {
      return {
        event: ENTRY_CHANGED_EVENT,
        target: { kind: "Any" },
        handler: args.handler,
      };
    }
    if (cmd === UNLISTEN_CMD) {
      return { event: ENTRY_CHANGED_EVENT, eventId: args.eventId };
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
    } else if (payload.cmd === GET_APP_INFO_CMD || payload.cmd === LIST_DRIVES_CMD) {
      if (!isEmptyArgs(payload.payload)) {
        reject();
      }
    } else if (isFsPathCommand(payload.cmd)) {
      if (!isPathOnlyArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === WATCH_CMD) {
      if (!isWatchArgs(payload.payload)) {
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
    } else if (!isMainWindowArgs(payload.payload)) {
      reject();
    }

    return sanitize(payload, reconstructInnerPayload(payload.cmd, payload.payload));
  };
})();
