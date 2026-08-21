use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

use super::tray_error::TrayError;
use crate::modules::error::CoreError;

/// Physical pixel rectangle used by [`tray_menu_origin`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PxRect {
    /// Left edge in physical pixels.
    pub x: i32,
    /// Top edge in physical pixels.
    pub y: i32,
    /// Width in physical pixels.
    pub width: u32,
    /// Height in physical pixels.
    pub height: u32,
}

/// Physical pixel size used by [`tray_menu_origin`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PxSize {
    /// Width in physical pixels.
    pub width: u32,
    /// Height in physical pixels.
    pub height: u32,
}

/// Tray overlay command (`show`, `hide`, or `quit`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TrayAction {
    /// Unminimize, show, and focus `main`; hide `tray-menu`.
    Show,
    /// Hide `main` and `tray-menu`.
    Hide,
    /// Exit the process.
    Quit,
}

/// IPC payload for [`tray_action`]. Extra keys are rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TrayActionArgs {
    /// Action to apply.
    pub action: TrayAction,
}

const MENU_GAP_PX: i32 = 8;

/// Places the tray menu above `icon`, then clamps it inside `work`.
///
/// The menu's bottom edge sits [`MENU_GAP_PX`] above the icon's top edge and
/// is horizontally centered on the icon before clamping.
pub fn tray_menu_origin(icon: PxRect, menu: PxSize, work: PxRect) -> (i32, i32) {
    let menu_w = menu.width as i32;
    let menu_h = menu.height as i32;
    let ideal_x = icon.x + (icon.width as i32) / 2 - menu_w / 2;
    let ideal_y = icon.y - MENU_GAP_PX - menu_h;

    let work_right = work.x + work.width as i32;
    let work_bottom = work.y + work.height as i32;
    let max_x = work_right - menu_w;
    let max_y = work_bottom - menu_h;

    let x = ideal_x.clamp(work.x, max_x.max(work.x));
    let y = ideal_y.clamp(work.y, max_y.max(work.y));
    (x, y)
}

/// Show, hide, or quit from the tray-menu overlay.
#[tauri::command]
pub async fn tray_action<R: Runtime>(
    app: AppHandle<R>,
    args: TrayActionArgs,
) -> Result<(), CoreError> {
    if matches!(args.action, TrayAction::Quit) {
        app.exit(0);
        return Ok(());
    }

    let main = app
        .get_webview_window("main")
        .ok_or(TrayError::WindowMissing)?;
    let tray_menu = app
        .get_webview_window("tray-menu")
        .ok_or(TrayError::WindowMissing)?;

    match args.action {
        TrayAction::Show => {
            let _ = main.unminimize();
            let _ = main.show();
            let _ = main.set_focus();
            let _ = tray_menu.hide();
        }
        TrayAction::Hide => {
            let _ = main.hide();
            let _ = tray_menu.hide();
        }
        TrayAction::Quit => unreachable!("quit returns before window lookup"),
    }

    Ok(())
}
