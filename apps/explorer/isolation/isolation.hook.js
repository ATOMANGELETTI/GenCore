// Isolation application hook (sandboxed, runs before every IPC message is
// encrypted and forwarded to Tauri core). Anything not explicitly allowlisted
// here is dropped, regardless of what the (untrusted) main frontend sends.
//
// Allowed:
//   - gencore-core's app-info query
//   - the core window commands the titlebar/traffic-lights use, plus theme()
//   - opener open_url for the GenCore GitHub repository only
//   - event listen/unlisten for tauri://theme-changed (Window main) only
(() => {
  const ALLOWED_COMMANDS = [
    "plugin:gencore-core|get_app_info",
    "plugin:window|close",
    "plugin:window|minimize",
    "plugin:window|toggle_maximize",
    "plugin:window|start_dragging",
    "plugin:window|theme",
    "plugin:opener|open_url",
    "plugin:event|listen",
    "plugin:event|unlisten",
  ];
  const OPEN_URL_CMD = "plugin:opener|open_url";
  const GET_APP_INFO_CMD = "plugin:gencore-core|get_app_info";
  const LISTEN_CMD = "plugin:event|listen";
  const UNLISTEN_CMD = "plugin:event|unlisten";
  const THEME_CHANGED_EVENT = "tauri://theme-changed";
  const ALLOWED_OPEN_URL = "https://github.com/ATOMANGELETTI/GenCore";
  const MAIN_WINDOW_LABEL = "main";

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

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
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
    return hasKind && hasLabel && target.kind === "Window" && target.label === MAIN_WINDOW_LABEL;
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
      args.event === THEME_CHANGED_EVENT &&
      isWindowTarget(args.target) &&
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
      hasEvent && hasEventId && args.event === THEME_CHANGED_EVENT && isFiniteNumber(args.eventId)
    );
  }

  function reconstructInnerPayload(cmd, args) {
    if (cmd === OPEN_URL_CMD) {
      return { url: ALLOWED_OPEN_URL };
    }
    if (cmd === GET_APP_INFO_CMD) {
      if (args === undefined || args === null) {
        return undefined;
      }
      return {};
    }
    if (cmd === LISTEN_CMD) {
      return {
        event: THEME_CHANGED_EVENT,
        target: { kind: "Window", label: MAIN_WINDOW_LABEL },
        handler: args.handler,
      };
    }
    if (cmd === UNLISTEN_CMD) {
      return { event: THEME_CHANGED_EVENT, eventId: args.eventId };
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
    } else if (payload.cmd === GET_APP_INFO_CMD) {
      if (!isEmptyArgs(payload.payload)) {
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
