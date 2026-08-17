// Isolation application hook (sandboxed, runs before every IPC message is
// encrypted and forwarded to Tauri core). Anything not explicitly allowlisted
// here is dropped, regardless of what the (untrusted) main frontend sends.
//
// Allowed:
//   - gencore-core's app-info query
//   - the core window commands the titlebar/traffic-lights use
//   - opener open_url for the GenCore GitHub repository only
(() => {
  const ALLOWED_COMMANDS = [
    "plugin:gencore-core|get_app_info",
    "plugin:window|close",
    "plugin:window|minimize",
    "plugin:window|toggle_maximize",
    "plugin:window|start_dragging",
    "plugin:opener|open_url",
  ];
  const OPEN_URL_CMD = "plugin:opener|open_url";
  const GET_APP_INFO_CMD = "plugin:gencore-core|get_app_info";
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
    } else if (!isMainWindowArgs(payload.payload)) {
      reject();
    }

    return sanitize(payload, reconstructInnerPayload(payload.cmd, payload.payload));
  };
})();
