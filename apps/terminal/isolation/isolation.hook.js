// Isolation application hook (sandboxed, runs before every IPC message is
// encrypted and forwarded to Tauri core). Anything not explicitly allowlisted
// here is dropped, regardless of what the (untrusted) main frontend sends.
//
// Allowed:
//   - gencore-core's app-info query, pinned-tab load/save, and tray_action
//   - the core window commands the titlebar/traffic-lights use, plus theme()
//   - opener open_url for the GenCore GitHub repository only
//   - gencore-fs list/list_drives/create_file/create_dir/watch/unwatch
//   - gencore-pty open/write/resize/close
//   - event listen/unlisten for gencore-fs://entry-changed (Any),
//     gencore-pty://data (Any), gencore-pty://exit (Any), and
//     tauri://theme-changed (Window main or tray-menu) only
(() => {
  const ALLOWED_COMMANDS = [
    "plugin:gencore-core|get_app_info",
    "plugin:gencore-core|get_system_telemetry",
    "plugin:gencore-core|load_pinned_tabs",
    "plugin:gencore-core|save_pinned_tabs",
    "plugin:gencore-core|tray_action",
    "plugin:window|close",
    "plugin:window|minimize",
    "plugin:window|toggle_maximize",
    "plugin:window|start_dragging",
    "plugin:window|theme",
    "plugin:opener|open_url",
    "plugin:gencore-fs|list_drives",
    "plugin:gencore-fs|list",
    "plugin:gencore-fs|create_file",
    "plugin:gencore-fs|create_dir",
    "plugin:gencore-fs|watch",
    "plugin:gencore-fs|unwatch",
    "plugin:gencore-pty|open",
    "plugin:gencore-pty|write",
    "plugin:gencore-pty|resize",
    "plugin:gencore-pty|close",
    "plugin:event|listen",
    "plugin:event|unlisten",
    "plugin:gencore-assistant|list_conversations",
    "plugin:gencore-assistant|create_conversation",
    "plugin:gencore-assistant|delete_conversation",
    "plugin:gencore-assistant|list_messages",
    "plugin:gencore-assistant|send_message",
    "plugin:gencore-assistant|cancel_turn",
    "plugin:gencore-assistant|confirm_action",
    "plugin:gencore-assistant|reject_action",
    "plugin:gencore-assistant|get_agent_settings",
    "plugin:gencore-assistant|set_agent_settings",
    "plugin:gencore-assistant|set_api_key",
    "plugin:gencore-assistant|clear_api_key",
  ];
  const OPEN_URL_CMD = "plugin:opener|open_url";
  const GET_APP_INFO_CMD = "plugin:gencore-core|get_app_info";
  const GET_SYSTEM_TELEMETRY_CMD = "plugin:gencore-core|get_system_telemetry";
  const LOAD_PINNED_CMD = "plugin:gencore-core|load_pinned_tabs";
  const SAVE_PINNED_CMD = "plugin:gencore-core|save_pinned_tabs";
  const TRAY_ACTION_CMD = "plugin:gencore-core|tray_action";
  const THEME_CMD = "plugin:window|theme";
  const LIST_DRIVES_CMD = "plugin:gencore-fs|list_drives";
  const LIST_CMD = "plugin:gencore-fs|list";
  const CREATE_FILE_CMD = "plugin:gencore-fs|create_file";
  const CREATE_DIR_CMD = "plugin:gencore-fs|create_dir";
  const WATCH_CMD = "plugin:gencore-fs|watch";
  const UNWATCH_CMD = "plugin:gencore-fs|unwatch";
  const PTY_OPEN_CMD = "plugin:gencore-pty|open";
  const PTY_WRITE_CMD = "plugin:gencore-pty|write";
  const PTY_RESIZE_CMD = "plugin:gencore-pty|resize";
  const PTY_CLOSE_CMD = "plugin:gencore-pty|close";
  const LISTEN_CMD = "plugin:event|listen";
  const UNLISTEN_CMD = "plugin:event|unlisten";
  const ENTRY_CHANGED_EVENT = "gencore-fs://entry-changed";
  const THEME_CHANGED_EVENT = "tauri://theme-changed";
  const PTY_DATA_EVENT = "gencore-pty://data";
  const PTY_EXIT_EVENT = "gencore-pty://exit";
  const ALLOWED_OPEN_URL = "https://github.com/ATOMANGELETTI/GenCore";
  const MAIN_WINDOW_LABEL = "main";
  const TRAY_MENU_WINDOW_LABEL = "tray-menu";
  const PATH_MIN_LENGTH = 1;
  const PATH_MAX_LENGTH = 32767;
  const DIM_MIN = 1;
  const DIM_MAX = 999;
  const SESSION_ID_MAX_LENGTH = 64;
  const WRITE_DATA_MAX_LENGTH = 65536;
  const PINNED_JSON_MAX_LENGTH = 8388608;
  const THEME_POLAR_NIGHT = "polar-night";
  const THEME_SNOW_STORM = "snow-storm";
  const LIST_CONVERSATIONS_CMD = "plugin:gencore-assistant|list_conversations";
  const CREATE_CONVERSATION_CMD = "plugin:gencore-assistant|create_conversation";
  const DELETE_CONVERSATION_CMD = "plugin:gencore-assistant|delete_conversation";
  const LIST_MESSAGES_CMD = "plugin:gencore-assistant|list_messages";
  const SEND_MESSAGE_CMD = "plugin:gencore-assistant|send_message";
  const CANCEL_TURN_CMD = "plugin:gencore-assistant|cancel_turn";
  const CONFIRM_ACTION_CMD = "plugin:gencore-assistant|confirm_action";
  const REJECT_ACTION_CMD = "plugin:gencore-assistant|reject_action";
  const GET_AGENT_SETTINGS_CMD = "plugin:gencore-assistant|get_agent_settings";
  const SET_AGENT_SETTINGS_CMD = "plugin:gencore-assistant|set_agent_settings";
  const SET_API_KEY_CMD = "plugin:gencore-assistant|set_api_key";
  const CLEAR_API_KEY_CMD = "plugin:gencore-assistant|clear_api_key";
  const ASSISTANT_TOKEN_EVENT = "gencore-assistant://token";
  const ASSISTANT_TURN_EVENT = "gencore-assistant://turn";
  const ASSISTANT_ERROR_EVENT = "gencore-assistant://error";
  const ASSISTANT_UI_ACTION_EVENT = "gencore-assistant://ui-action";
  const ASSISTANT_ID_MAX_LENGTH = 64;
  const API_KEY_MAX_LENGTH = 4096;
  const OUTPUT_EXCERPT_MAX_LENGTH = 65536;
  const SNAPSHOT_TAB_ID_MAX_LENGTH = 256;
  const CONTEXT_LINES_MIN = 20;
  const CONTEXT_LINES_MAX = 200;
  // Exact Gemini Developer API model IDs offered in Config. Mirrors
  // `gencore_assistant::modules::secrets::secrets_api::ALLOWED_MODELS`.
  const ALLOWED_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-pro-preview",
  ];

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function isEmptyArgs(args) {
    return (
      args === undefined || args === null || (isPlainObject(args) && Object.keys(args).length === 0)
    );
  }

  function isEmptyArgCommand(cmd) {
    return (
      cmd === GET_APP_INFO_CMD ||
      cmd === GET_SYSTEM_TELEMETRY_CMD ||
      cmd === LIST_DRIVES_CMD ||
      cmd === LOAD_PINNED_CMD ||
      cmd === LIST_CONVERSATIONS_CMD ||
      cmd === CREATE_CONVERSATION_CMD ||
      cmd === GET_AGENT_SETTINGS_CMD ||
      cmd === CLEAR_API_KEY_CMD
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

  function isDimension(value) {
    return isFiniteNumber(value) && Number.isInteger(value) && value >= DIM_MIN && value <= DIM_MAX;
  }

  function isSessionId(value) {
    return typeof value === "string" && value.length >= 1 && value.length <= SESSION_ID_MAX_LENGTH;
  }

  function isPtyTheme(value) {
    return value === THEME_POLAR_NIGHT || value === THEME_SNOW_STORM;
  }

  function isPtyOpenArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    let hasCols = false;
    let hasRows = false;
    let hasCwd = false;
    let hasTheme = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "cols") {
        hasCols = true;
        continue;
      }
      if (key === "rows") {
        hasRows = true;
        continue;
      }
      if (key === "cwd") {
        hasCwd = true;
        continue;
      }
      if (key === "theme") {
        hasTheme = true;
        continue;
      }
      return false;
    }
    if (!hasCols || !hasRows || !isDimension(args.cols) || !isDimension(args.rows)) {
      return false;
    }
    if (hasCwd && !isAllowedPath(args.cwd)) {
      return false;
    }
    if (hasTheme && !isPtyTheme(args.theme)) {
      return false;
    }
    return true;
  }

  function isPtyWriteArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 2) {
      return false;
    }
    let hasSessionId = false;
    let hasData = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "session_id") {
        hasSessionId = true;
        continue;
      }
      if (key === "data") {
        hasData = true;
        continue;
      }
      return false;
    }
    return (
      hasSessionId &&
      hasData &&
      isSessionId(args.session_id) &&
      typeof args.data === "string" &&
      args.data.length <= WRITE_DATA_MAX_LENGTH
    );
  }

  function isPtyResizeArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 3) {
      return false;
    }
    let hasSessionId = false;
    let hasCols = false;
    let hasRows = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "session_id") {
        hasSessionId = true;
        continue;
      }
      if (key === "cols") {
        hasCols = true;
        continue;
      }
      if (key === "rows") {
        hasRows = true;
        continue;
      }
      return false;
    }
    return (
      hasSessionId &&
      hasCols &&
      hasRows &&
      isSessionId(args.session_id) &&
      isDimension(args.cols) &&
      isDimension(args.rows)
    );
  }

  function isPtyCloseArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return keys.length === 1 && keys[0] === "session_id" && isSessionId(args.session_id);
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

  function isSavePinnedArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return (
      keys.length === 1 &&
      keys[0] === "json" &&
      typeof args.json === "string" &&
      args.json.length <= PINNED_JSON_MAX_LENGTH
    );
  }

  function isAssistantId(value) {
    return (
      typeof value === "string" && value.length >= 1 && value.length <= ASSISTANT_ID_MAX_LENGTH
    );
  }

  function isConversationIdCommand(cmd) {
    return cmd === DELETE_CONVERSATION_CMD || cmd === LIST_MESSAGES_CMD || cmd === CANCEL_TURN_CMD;
  }

  function isActionIdCommand(cmd) {
    return cmd === CONFIRM_ACTION_CMD || cmd === REJECT_ACTION_CMD;
  }

  function isConversationIdArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return (
      keys.length === 1 && keys[0] === "conversation_id" && isAssistantId(args.conversation_id)
    );
  }

  function isActionIdArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return keys.length === 1 && keys[0] === "id" && isAssistantId(args.id);
  }

  function isSnapshotTab(tab) {
    if (!isPlainObject(tab)) {
      return false;
    }
    const keys = Object.keys(tab);
    let hasId = false;
    let hasPinned = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "id") {
        hasId = true;
        continue;
      }
      if (key === "name" || key === "cwd") {
        continue;
      }
      if (key === "pinned") {
        hasPinned = true;
        continue;
      }
      return false;
    }
    if (!hasId || !hasPinned || typeof tab.pinned !== "boolean") {
      return false;
    }
    if (
      typeof tab.id !== "string" ||
      tab.id.length < 1 ||
      tab.id.length > SNAPSHOT_TAB_ID_MAX_LENGTH
    ) {
      return false;
    }
    if (tab.name !== undefined && typeof tab.name !== "string") {
      return false;
    }
    if (tab.cwd !== undefined && !isAllowedPath(tab.cwd)) {
      return false;
    }
    return true;
  }

  function isFilesSelectionArgs(value) {
    if (!isPlainObject(value)) {
      return false;
    }
    const keys = Object.keys(value);
    if (keys.length !== 2) {
      return false;
    }
    let hasPath = false;
    let hasKind = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "path") {
        hasPath = true;
        continue;
      }
      if (key === "kind") {
        hasKind = true;
        continue;
      }
      return false;
    }
    return (
      hasPath &&
      hasKind &&
      isAllowedPath(value.path) &&
      typeof value.kind === "string" &&
      value.kind.length >= 1
    );
  }

  function isAssistantSnapshotArgs(value) {
    if (!isPlainObject(value)) {
      return false;
    }
    const keys = Object.keys(value);
    let hasActiveTabId = false;
    let hasActiveSessionId = false;
    let hasCwd = false;
    let hasOutputExcerpt = false;
    let hasTabs = false;
    let hasFilesSelection = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "active_tab_id") {
        hasActiveTabId = true;
        continue;
      }
      if (key === "active_session_id") {
        hasActiveSessionId = true;
        continue;
      }
      if (key === "cwd") {
        hasCwd = true;
        continue;
      }
      if (key === "output_excerpt") {
        hasOutputExcerpt = true;
        continue;
      }
      if (key === "tabs") {
        hasTabs = true;
        continue;
      }
      if (key === "files_selection") {
        hasFilesSelection = true;
        continue;
      }
      return false;
    }
    if (!hasActiveTabId || !hasOutputExcerpt || !hasTabs) {
      return false;
    }
    if (typeof value.active_tab_id !== "string" || value.active_tab_id.length < 1) {
      return false;
    }
    if (hasActiveSessionId && !isSessionId(value.active_session_id)) {
      return false;
    }
    if (hasCwd && !isAllowedPath(value.cwd)) {
      return false;
    }
    if (
      typeof value.output_excerpt !== "string" ||
      value.output_excerpt.length > OUTPUT_EXCERPT_MAX_LENGTH
    ) {
      return false;
    }
    if (!Array.isArray(value.tabs) || !value.tabs.every(isSnapshotTab)) {
      return false;
    }
    if (hasFilesSelection && !isFilesSelectionArgs(value.files_selection)) {
      return false;
    }
    return true;
  }

  function isSendMessageArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    if (keys.length !== 3) {
      return false;
    }
    let hasConversationId = false;
    let hasText = false;
    let hasSnapshot = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "conversation_id") {
        hasConversationId = true;
        continue;
      }
      if (key === "text") {
        hasText = true;
        continue;
      }
      if (key === "snapshot") {
        hasSnapshot = true;
        continue;
      }
      return false;
    }
    return (
      hasConversationId &&
      hasText &&
      hasSnapshot &&
      isAssistantId(args.conversation_id) &&
      typeof args.text === "string" &&
      isAssistantSnapshotArgs(args.snapshot)
    );
  }

  function isValidAssistantModel(value) {
    return ALLOWED_MODELS.indexOf(value) !== -1;
  }

  function isContextLines(value) {
    return (
      isFiniteNumber(value) &&
      Number.isInteger(value) &&
      value >= CONTEXT_LINES_MIN &&
      value <= CONTEXT_LINES_MAX
    );
  }

  function isSetAgentSettingsArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    let hasModel = false;
    let hasContextLines = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "model") {
        hasModel = true;
        continue;
      }
      if (key === "context_lines") {
        hasContextLines = true;
        continue;
      }
      return false;
    }
    if (hasModel && !isValidAssistantModel(args.model)) {
      return false;
    }
    if (hasContextLines && !isContextLines(args.context_lines)) {
      return false;
    }
    return true;
  }

  function isSetApiKeyArgs(args) {
    if (!isPlainObject(args)) {
      return false;
    }
    const keys = Object.keys(args);
    return (
      keys.length === 1 &&
      keys[0] === "key" &&
      typeof args.key === "string" &&
      args.key.length >= 1 &&
      args.key.length <= API_KEY_MAX_LENGTH
    );
  }

  function isAllowedWindowLabel(label) {
    return label === MAIN_WINDOW_LABEL || label === TRAY_MENU_WINDOW_LABEL;
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

  function isAnyListenEvent(event) {
    return (
      event === ENTRY_CHANGED_EVENT ||
      event === PTY_DATA_EVENT ||
      event === PTY_EXIT_EVENT ||
      event === ASSISTANT_TOKEN_EVENT ||
      event === ASSISTANT_TURN_EVENT ||
      event === ASSISTANT_ERROR_EVENT ||
      event === ASSISTANT_UI_ACTION_EVENT
    );
  }

  function isAllowedListenEvent(event, target) {
    if (isAnyListenEvent(event)) {
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
      (isAnyListenEvent(args.event) || args.event === THEME_CHANGED_EVENT) &&
      isFiniteNumber(args.eventId)
    );
  }

  function reconstructPtyOpen(args) {
    const payload = { cols: args.cols, rows: args.rows };
    if (typeof args.cwd === "string") {
      payload.cwd = args.cwd;
    }
    if (typeof args.theme === "string") {
      payload.theme = args.theme;
    }
    return payload;
  }

  function reconstructSnapshotTab(tab) {
    const result = { id: tab.id, pinned: tab.pinned };
    if (typeof tab.name === "string") {
      result.name = tab.name;
    }
    if (typeof tab.cwd === "string") {
      result.cwd = tab.cwd;
    }
    return result;
  }

  function reconstructFilesSelection(selection) {
    return { path: selection.path, kind: selection.kind };
  }

  function reconstructSnapshot(snapshot) {
    const result = {
      active_tab_id: snapshot.active_tab_id,
      output_excerpt: snapshot.output_excerpt,
      tabs: snapshot.tabs.map(reconstructSnapshotTab),
    };
    if (typeof snapshot.active_session_id === "string") {
      result.active_session_id = snapshot.active_session_id;
    }
    if (typeof snapshot.cwd === "string") {
      result.cwd = snapshot.cwd;
    }
    if (isPlainObject(snapshot.files_selection)) {
      result.files_selection = reconstructFilesSelection(snapshot.files_selection);
    }
    return result;
  }

  function reconstructSendMessage(args) {
    return {
      conversation_id: args.conversation_id,
      text: args.text,
      snapshot: reconstructSnapshot(args.snapshot),
    };
  }

  function reconstructSetAgentSettings(args) {
    const result = {};
    if (typeof args.model === "string") {
      result.model = args.model;
    }
    if (args.context_lines !== undefined) {
      result.context_lines = args.context_lines;
    }
    return result;
  }

  function reconstructListen(args) {
    if (args.event === THEME_CHANGED_EVENT) {
      return {
        event: THEME_CHANGED_EVENT,
        target: { kind: "Window", label: args.target.label },
        handler: args.handler,
      };
    }
    if (
      args.event === ENTRY_CHANGED_EVENT ||
      args.event === PTY_DATA_EVENT ||
      args.event === PTY_EXIT_EVENT ||
      args.event === ASSISTANT_TOKEN_EVENT ||
      args.event === ASSISTANT_TURN_EVENT ||
      args.event === ASSISTANT_ERROR_EVENT ||
      args.event === ASSISTANT_UI_ACTION_EVENT
    ) {
      return {
        event: args.event,
        target: { kind: "Any" },
        handler: args.handler,
      };
    }
    // Every allowed event is enumerated above. Never default an unknown
    // event through to entry-changed (or any other event) — reject it.
    return reject();
  }

  function reconstructInnerPayload(cmd, args) {
    if (cmd === OPEN_URL_CMD) {
      return { url: ALLOWED_OPEN_URL };
    }
    if (isEmptyArgCommand(cmd)) {
      if (args === undefined || args === null) {
        return undefined;
      }
      return {};
    }
    if (cmd === SAVE_PINNED_CMD) {
      return { json: args.json };
    }
    if (cmd === TRAY_ACTION_CMD) {
      return { action: args.action };
    }
    if (isFsPathCommand(cmd)) {
      return { path: args.path };
    }
    if (cmd === WATCH_CMD) {
      return { path: args.path, recursive: false };
    }
    if (cmd === PTY_OPEN_CMD) {
      return reconstructPtyOpen(args);
    }
    if (cmd === PTY_WRITE_CMD) {
      return { session_id: args.session_id, data: args.data };
    }
    if (cmd === PTY_RESIZE_CMD) {
      return { session_id: args.session_id, cols: args.cols, rows: args.rows };
    }
    if (cmd === PTY_CLOSE_CMD) {
      return { session_id: args.session_id };
    }
    if (cmd === LISTEN_CMD) {
      return reconstructListen(args);
    }
    if (cmd === UNLISTEN_CMD) {
      return { event: args.event, eventId: args.eventId };
    }
    if (isConversationIdCommand(cmd)) {
      return { conversation_id: args.conversation_id };
    }
    if (isActionIdCommand(cmd)) {
      return { id: args.id };
    }
    if (cmd === SEND_MESSAGE_CMD) {
      return reconstructSendMessage(args);
    }
    if (cmd === SET_AGENT_SETTINGS_CMD) {
      return reconstructSetAgentSettings(args);
    }
    if (cmd === SET_API_KEY_CMD) {
      return { key: args.key };
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
    } else if (isEmptyArgCommand(payload.cmd)) {
      if (!isEmptyArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === SAVE_PINNED_CMD) {
      if (!isSavePinnedArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === TRAY_ACTION_CMD) {
      if (!isTrayActionArgs(payload.payload)) {
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
    } else if (payload.cmd === PTY_OPEN_CMD) {
      if (!isPtyOpenArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === PTY_WRITE_CMD) {
      if (!isPtyWriteArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === PTY_RESIZE_CMD) {
      if (!isPtyResizeArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === PTY_CLOSE_CMD) {
      if (!isPtyCloseArgs(payload.payload)) {
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
    } else if (isConversationIdCommand(payload.cmd)) {
      if (!isConversationIdArgs(payload.payload)) {
        reject();
      }
    } else if (isActionIdCommand(payload.cmd)) {
      if (!isActionIdArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === SEND_MESSAGE_CMD) {
      if (!isSendMessageArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === SET_AGENT_SETTINGS_CMD) {
      if (!isSetAgentSettingsArgs(payload.payload)) {
        reject();
      }
    } else if (payload.cmd === SET_API_KEY_CMD) {
      if (!isSetApiKeyArgs(payload.payload)) {
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
