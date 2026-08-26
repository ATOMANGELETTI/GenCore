// Isolation application hook (sandboxed, runs before every IPC message is
// encrypted and forwarded to Tauri core). Anything not explicitly allowlisted
// here is dropped, regardless of what the (untrusted) main frontend sends.
//
// Allowed:
//   - gencore-core's app-info query and set_theme_icon
//   - the core window commands the titlebar/traffic-lights use, plus theme()
//   - opener open_url for the GenCore GitHub repository only
//   - gencore-browser's tab webview lifecycle (create/close/navigate/eval) and
//     bookmarks/history/downloads JSON store load/save
//   - the built-in webview size/position/zoom/focus/hide/show commands,
//     restricted to labels matching our own generated tab pattern (never the
//     `main` chrome webview itself)
//   - event listen/unlisten for gencore-browser://* events and
//     tauri://theme-changed (Window main) only
//
// Tab content webviews (labeled `tab-<uuid>`) are never granted any
// capability at all (see capabilities/main.json, scoped by webview label to
// `main` only) — this hook only defends the trusted chrome webview itself
// against a compromised/XSS'd frontend dependency calling commands beyond
// what the UI legitimately needs.
(() => {
  const ALLOWED_COMMANDS = [
    "plugin:gencore-core|get_app_info",
    "plugin:gencore-core|set_theme_icon",
    "plugin:window|close",
    "plugin:window|minimize",
    "plugin:window|toggle_maximize",
    "plugin:window|start_dragging",
    "plugin:window|theme",
    "plugin:opener|open_url",
    "plugin:gencore-browser|create_tab_webview",
    "plugin:gencore-browser|close_tab_webview",
    "plugin:gencore-browser|navigate_tab_webview",
    "plugin:gencore-browser|eval_tab_webview",
    "plugin:gencore-browser|load_bookmarks",
    "plugin:gencore-browser|save_bookmarks",
    "plugin:gencore-browser|load_history",
    "plugin:gencore-browser|save_history",
    "plugin:gencore-browser|load_downloads",
    "plugin:gencore-browser|save_downloads",
    "plugin:webview|set_webview_size",
    "plugin:webview|set_webview_position",
    "plugin:webview|set_webview_zoom",
    "plugin:webview|set_webview_focus",
    "plugin:webview|webview_hide",
    "plugin:webview|webview_show",
    "plugin:event|listen",
    "plugin:event|unlisten",
  ];
  const GET_APP_INFO_CMD = "plugin:gencore-core|get_app_info";
  const SET_THEME_ICON_CMD = "plugin:gencore-core|set_theme_icon";
  const THEME_CMD = "plugin:window|theme";
  const OPEN_URL_CMD = "plugin:opener|open_url";
  const CREATE_TAB_CMD = "plugin:gencore-browser|create_tab_webview";
  const CLOSE_TAB_CMD = "plugin:gencore-browser|close_tab_webview";
  const NAVIGATE_TAB_CMD = "plugin:gencore-browser|navigate_tab_webview";
  const EVAL_TAB_CMD = "plugin:gencore-browser|eval_tab_webview";
  const LOAD_BOOKMARKS_CMD = "plugin:gencore-browser|load_bookmarks";
  const SAVE_BOOKMARKS_CMD = "plugin:gencore-browser|save_bookmarks";
  const LOAD_HISTORY_CMD = "plugin:gencore-browser|load_history";
  const SAVE_HISTORY_CMD = "plugin:gencore-browser|save_history";
  const LOAD_DOWNLOADS_CMD = "plugin:gencore-browser|load_downloads";
  const SAVE_DOWNLOADS_CMD = "plugin:gencore-browser|save_downloads";
  const SET_WEBVIEW_SIZE_CMD = "plugin:webview|set_webview_size";
  const SET_WEBVIEW_POSITION_CMD = "plugin:webview|set_webview_position";
  const SET_WEBVIEW_ZOOM_CMD = "plugin:webview|set_webview_zoom";
  const SET_WEBVIEW_FOCUS_CMD = "plugin:webview|set_webview_focus";
  const WEBVIEW_HIDE_CMD = "plugin:webview|webview_hide";
  const WEBVIEW_SHOW_CMD = "plugin:webview|webview_show";
  const LISTEN_CMD = "plugin:event|listen";
  const UNLISTEN_CMD = "plugin:event|unlisten";

  const THEME_POLAR_NIGHT = "polar-night";
  const THEME_SNOW_STORM = "snow-storm";
  const ALLOWED_OPEN_URL = "https://github.com/ATOMANGELETTI/GenCore";
  const MAIN_WINDOW_LABEL = "main";
  const TAB_LABEL_PATTERN = /^tab-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const URL_MAX_LENGTH = 8192;
  const SCRIPT_MAX_LENGTH = 65536;
  const JSON_MAX_LENGTH = 16 * 1024 * 1024;
  const TAB_NAVIGATED_EVENT = "gencore-browser://tab-navigated";
  const TAB_LOAD_STARTED_EVENT = "gencore-browser://tab-load-started";
  const TAB_LOAD_FINISHED_EVENT = "gencore-browser://tab-load-finished";
  const DOWNLOAD_STARTED_EVENT = "gencore-browser://download-started";
  const DOWNLOAD_FINISHED_EVENT = "gencore-browser://download-finished";
  const THEME_CHANGED_EVENT = "tauri://theme-changed";
  const ALLOWED_EVENTS = [
    TAB_NAVIGATED_EVENT,
    TAB_LOAD_STARTED_EVENT,
    TAB_LOAD_FINISHED_EVENT,
    DOWNLOAD_STARTED_EVENT,
    DOWNLOAD_FINISHED_EVENT,
    THEME_CHANGED_EVENT,
  ];

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function isEmptyArgs(args) {
    return (
      args === undefined || args === null || (isPlainObject(args) && Object.keys(args).length === 0)
    );
  }

  function isTabLabel(value) {
    return typeof value === "string" && TAB_LABEL_PATTERN.test(value);
  }

  function isAllowedUrl(value) {
    if (typeof value !== "string" || value.length < 1 || value.length > URL_MAX_LENGTH) {
      return false;
    }
    // Defense in depth: the Rust command also rejects non-http(s) schemes,
    // but reject here too so a compromised chrome frontend can't even get an
    // `about:`/`file:`/`javascript:` navigation request past the isolation
    // boundary in the first place.
    return /^https?:\/\//i.test(value);
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  // Only plain JSON-shaped data (no functions, no prototypes beyond
  // Object/Array), bounded depth and size — used for the `value` payload of
  // the built-in webview size/position/zoom setters, whose exact Rust-side
  // enum wire shape (`Size`/`Position`) is intentionally not re-implemented
  // here. The security-relevant part of these commands is *which* webview
  // label is targeted (validated separately via `isTabLabel`), not the
  // numeric geometry payload.
  function isJsonPlainData(value, depth) {
    if (depth > 6) {
      return false;
    }
    if (value === null || typeof value === "boolean" || typeof value === "string") {
      return true;
    }
    if (isFiniteNumber(value)) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length <= 64 && value.every((item) => isJsonPlainData(item, depth + 1));
    }
    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      return keys.length <= 32 && keys.every((key) => isJsonPlainData(value[key], depth + 1));
    }
    return false;
  }

  function isJsonStringArg(value) {
    return typeof value === "string" && value.length <= JSON_MAX_LENGTH;
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

  function isCreateTabArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 2) {
      return false;
    }
    let hasLabel = false;
    let hasUrl = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "label") {
        hasLabel = true;
        continue;
      }
      if (key === "url") {
        hasUrl = true;
        continue;
      }
      return false;
    }
    return hasLabel && hasUrl && isTabLabel(args.label) && isAllowedUrl(args.url);
  }

  function isCloseTabArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return keys.length === 1 && keys[0] === "label" && isTabLabel(args.label);
  }

  function isEvalTabArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 2) {
      return false;
    }
    let hasLabel = false;
    let hasScript = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "label") {
        hasLabel = true;
        continue;
      }
      if (key === "script") {
        hasScript = true;
        continue;
      }
      return false;
    }
    return (
      hasLabel &&
      hasScript &&
      isTabLabel(args.label) &&
      typeof args.script === "string" &&
      args.script.length <= SCRIPT_MAX_LENGTH
    );
  }

  function isSaveJsonCommand(cmd) {
    return cmd === SAVE_BOOKMARKS_CMD || cmd === SAVE_HISTORY_CMD || cmd === SAVE_DOWNLOADS_CMD;
  }

  function isSaveJsonArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return keys.length === 1 && keys[0] === "json" && isJsonStringArg(args.json);
  }

  function isWebviewLabelOnlyCommand(cmd) {
    return cmd === SET_WEBVIEW_FOCUS_CMD || cmd === WEBVIEW_HIDE_CMD || cmd === WEBVIEW_SHOW_CMD;
  }

  function isWebviewLabelOnlyArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return keys.length === 1 && keys[0] === "label" && isTabLabel(args.label);
  }

  function isWebviewLabelValueCommand(cmd) {
    return (
      cmd === SET_WEBVIEW_SIZE_CMD ||
      cmd === SET_WEBVIEW_POSITION_CMD ||
      cmd === SET_WEBVIEW_ZOOM_CMD
    );
  }

  function isWebviewLabelValueArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 2) {
      return false;
    }
    let hasLabel = false;
    let hasValue = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "label") {
        hasLabel = true;
        continue;
      }
      if (key === "value") {
        hasValue = true;
        continue;
      }
      return false;
    }
    return hasLabel && hasValue && isTabLabel(args.label) && isJsonPlainData(args.value, 0);
  }

  function isAnyTarget(target) {
    if (!isPlainObject(target)) {
      return false;
    }
    const keys = Object.keys(target);
    return keys.length === 1 && keys[0] === "kind" && target.kind === "Any";
  }

  function isMainWindowTarget(target) {
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

  function isAllowedListenEvent(event, target) {
    if (event === THEME_CHANGED_EVENT) {
      return isMainWindowTarget(target);
    }
    return ALLOWED_EVENTS.indexOf(event) !== -1 && isAnyTarget(target);
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
      ALLOWED_EVENTS.indexOf(args.event) !== -1 &&
      isFiniteNumber(args.eventId)
    );
  }

  function reconstructListen(args) {
    if (args.event === THEME_CHANGED_EVENT) {
      return {
        event: THEME_CHANGED_EVENT,
        target: { kind: "Window", label: MAIN_WINDOW_LABEL },
        handler: args.handler,
      };
    }
    return {
      event: args.event,
      target: { kind: "Any" },
      handler: args.handler,
    };
  }

  function reconstructInnerPayload(cmd, args) {
    if (cmd === OPEN_URL_CMD) {
      return { url: ALLOWED_OPEN_URL };
    }
    if (cmd === GET_APP_INFO_CMD) {
      return isEmptyArgs(args) ? undefined : {};
    }
    if (cmd === SET_THEME_ICON_CMD) {
      return { theme: args.theme };
    }
    if (cmd === CREATE_TAB_CMD || cmd === NAVIGATE_TAB_CMD) {
      return { label: args.label, url: args.url };
    }
    if (cmd === CLOSE_TAB_CMD) {
      return { label: args.label };
    }
    if (cmd === EVAL_TAB_CMD) {
      return { label: args.label, script: args.script };
    }
    if (cmd === LOAD_BOOKMARKS_CMD || cmd === LOAD_HISTORY_CMD || cmd === LOAD_DOWNLOADS_CMD) {
      return isEmptyArgs(args) ? undefined : {};
    }
    if (isSaveJsonCommand(cmd)) {
      return { json: args.json };
    }
    if (isWebviewLabelOnlyCommand(cmd)) {
      return { label: args.label };
    }
    if (isWebviewLabelValueCommand(cmd)) {
      return { label: args.label, value: args.value };
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
      return args === undefined || args === null ? undefined : {};
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
    } else if (payload.cmd === SET_THEME_ICON_CMD) {
      if (!isSetThemeIconArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === CREATE_TAB_CMD || payload.cmd === NAVIGATE_TAB_CMD) {
      if (!isCreateTabArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === CLOSE_TAB_CMD) {
      if (!isCloseTabArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === EVAL_TAB_CMD) {
      if (!isEvalTabArgs(payload.payload)) {
        reject();
      }
    } else if (
      payload.cmd === LOAD_BOOKMARKS_CMD ||
      payload.cmd === LOAD_HISTORY_CMD ||
      payload.cmd === LOAD_DOWNLOADS_CMD
    ) {
      if (!isEmptyArgs(payload.payload)) {
        reject();
      }
    } else if (isSaveJsonCommand(payload.cmd)) {
      if (!isSaveJsonArgs(payload.payload)) {
        reject();
      }
    } else if (isWebviewLabelOnlyCommand(payload.cmd)) {
      if (!isWebviewLabelOnlyArgs(payload.payload)) {
        reject();
      }
    } else if (isWebviewLabelValueCommand(payload.cmd)) {
      if (!isWebviewLabelValueArgs(payload.payload)) {
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
