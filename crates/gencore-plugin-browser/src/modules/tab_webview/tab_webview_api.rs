use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, LogicalPosition, Manager, Runtime, Url, Webview, WebviewUrl,
    webview::{DownloadEvent, PageLoadEvent, PageLoadPayload, WebviewBuilder},
};

use super::tab_webview_error::TabWebviewError;
use crate::modules::downloads::handle_download_event;

const MAIN_WINDOW_LABEL: &str = "main";

/// Event emitted whenever a tab webview's URL changes.
pub const TAB_NAVIGATED_EVENT: &str = "gencore-browser://tab-navigated";
/// Event emitted when a tab webview starts loading a page.
pub const TAB_LOAD_STARTED_EVENT: &str = "gencore-browser://tab-load-started";
/// Event emitted when a tab webview finishes loading a page.
pub const TAB_LOAD_FINISHED_EVENT: &str = "gencore-browser://tab-load-finished";

/// Arguments for creating a tab's content webview.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateTabWebviewArgs {
    /// Unique webview label for this tab (e.g. `tab-<uuid>`).
    pub label: String,
    /// Initial URL to navigate to. Only `http`/`https` are accepted.
    pub url: String,
}

/// Arguments for closing a tab's content webview.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CloseTabWebviewArgs {
    /// Webview label to close.
    pub label: String,
}

/// Payload for [`TAB_NAVIGATED_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct TabNavigatedPayload {
    /// Webview label of the tab that navigated.
    pub label: String,
    /// The URL navigated to.
    pub url: String,
}

/// Payload for [`TAB_LOAD_STARTED_EVENT`] / [`TAB_LOAD_FINISHED_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct TabLoadPayload {
    /// Webview label of the tab whose load state changed.
    pub label: String,
    /// The URL being loaded.
    pub url: String,
}

fn is_allowed_scheme(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https")
}

/// Creates a new child webview for a browser tab, attached to the `main` window.
///
/// Registers `on_navigation` (blocks non-http(s) navigation, emits
/// [`TAB_NAVIGATED_EVENT`]), `on_page_load` (emits [`TAB_LOAD_STARTED_EVENT`] /
/// [`TAB_LOAD_FINISHED_EVENT`]), and `on_download` hooks, which can only be attached at
/// webview-creation time in Rust — this is why tab creation is a dedicated command
/// rather than the generic JS `Webview` constructor.
#[tauri::command]
pub async fn create_tab_webview<R: Runtime>(
    app: AppHandle<R>,
    label: String,
    url: String,
) -> Result<(), TabWebviewError> {
    let parsed = Url::parse(&url).map_err(|_| TabWebviewError::InvalidUrl)?;
    if !is_allowed_scheme(&parsed) {
        return Err(TabWebviewError::UnsupportedScheme);
    }

    if app.get_webview(&label).is_some() {
        return Err(TabWebviewError::AlreadyExists);
    }

    let webview_window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or(TabWebviewError::MainWindowUnavailable)?;
    let window = AsRef::<Webview<R>>::as_ref(&webview_window).window();

    let nav_label = label.clone();
    let nav_app = app.clone();
    let load_label = label.clone();
    let load_app = app.clone();
    let download_app = app.clone();

    let builder = WebviewBuilder::new(label.clone(), WebviewUrl::External(parsed))
        .on_navigation(move |url| {
            let allowed = is_allowed_scheme(url);
            if allowed {
                let _ = nav_app.emit(
                    TAB_NAVIGATED_EVENT,
                    TabNavigatedPayload {
                        label: nav_label.clone(),
                        url: url.to_string(),
                    },
                );
            }
            allowed
        })
        .on_page_load(move |_webview: Webview<R>, payload: PageLoadPayload<'_>| {
            let event = match payload.event() {
                PageLoadEvent::Started => TAB_LOAD_STARTED_EVENT,
                PageLoadEvent::Finished => TAB_LOAD_FINISHED_EVENT,
            };
            let _ = load_app.emit(
                event,
                TabLoadPayload {
                    label: load_label.clone(),
                    url: payload.url().to_string(),
                },
            );
        })
        .on_download(move |_webview: Webview<R>, event: DownloadEvent<'_>| {
            handle_download_event(&download_app, event)
        });

    let size = window
        .inner_size()
        .map_err(|err| TabWebviewError::Tauri(err.to_string()))?;

    window
        .add_child(builder, LogicalPosition::new(0, 0), size)
        .map_err(|err| TabWebviewError::Tauri(err.to_string()))?;

    Ok(())
}

/// Closes and removes a tab's content webview.
#[tauri::command]
pub async fn close_tab_webview<R: Runtime>(
    app: AppHandle<R>,
    label: String,
) -> Result<(), TabWebviewError> {
    let webview = app.get_webview(&label).ok_or(TabWebviewError::NotFound)?;
    webview
        .close()
        .map_err(|err| TabWebviewError::Tauri(err.to_string()))
}

/// Navigates an existing tab webview to a new URL.
///
/// Not a built-in Tauri IPC command (only `Webview::navigate` exists as a Rust
/// method), so it is wrapped here rather than called from the JS `Webview` class.
#[tauri::command]
pub async fn navigate_tab_webview<R: Runtime>(
    app: AppHandle<R>,
    label: String,
    url: String,
) -> Result<(), TabWebviewError> {
    let parsed = Url::parse(&url).map_err(|_| TabWebviewError::InvalidUrl)?;
    if !is_allowed_scheme(&parsed) {
        return Err(TabWebviewError::UnsupportedScheme);
    }
    let webview = app.get_webview(&label).ok_or(TabWebviewError::NotFound)?;
    webview
        .navigate(parsed)
        .map_err(|err| TabWebviewError::Tauri(err.to_string()))
}

/// Evaluates a script inside a tab webview (used for find-in-page highlighting).
///
/// Not a built-in Tauri IPC command (only `Webview::eval` exists as a Rust
/// method), so it is wrapped here rather than called from the JS `Webview` class.
#[tauri::command]
pub async fn eval_tab_webview<R: Runtime>(
    app: AppHandle<R>,
    label: String,
    script: String,
) -> Result<(), TabWebviewError> {
    let webview = app.get_webview(&label).ok_or(TabWebviewError::NotFound)?;
    webview
        .eval(script)
        .map_err(|err| TabWebviewError::Tauri(err.to_string()))
}
