pub mod tab_webview_api;
pub mod tab_webview_error;

pub use tab_webview_api::{
    CloseTabWebviewArgs, CreateTabWebviewArgs, TAB_LOAD_FINISHED_EVENT, TAB_LOAD_STARTED_EVENT,
    TAB_NAVIGATED_EVENT, TabLoadPayload, TabNavigatedPayload, close_tab_webview,
    create_tab_webview, eval_tab_webview, navigate_tab_webview,
};
pub use tab_webview_error::TabWebviewError;
