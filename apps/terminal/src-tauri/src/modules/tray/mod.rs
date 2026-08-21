use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};
use std::time::{Duration, Instant};

use gencore_core::{PxRect, PxSize, tray_menu_origin};
use tauri::{
    App, AppHandle, Manager, PhysicalPosition, Runtime, WindowEvent,
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

const TRAY_PNG: &[u8] = include_bytes!("../../../icons/tray.png");
const TRAY_TOOLTIP: &str = "GenCore Terminal";
const TRAY_MENU_BLUR_GRACE: Duration = Duration::from_millis(300);

struct TrayMenuFocusLatch {
    shown_at: Mutex<Instant>,
    seen_focus: AtomicBool,
}

impl TrayMenuFocusLatch {
    fn new() -> Self {
        Self {
            shown_at: Mutex::new(Instant::now()),
            seen_focus: AtomicBool::new(false),
        }
    }

    fn mark_shown(&self) {
        *self.shown_at.lock().expect("tray-menu shown_at mutex") = Instant::now();
        self.seen_focus.store(false, Ordering::SeqCst);
    }

    fn note_focused(&self) {
        self.seen_focus.store(true, Ordering::SeqCst);
    }

    fn should_hide_on_blur(&self) -> bool {
        if self.seen_focus.load(Ordering::SeqCst) {
            return true;
        }
        self.shown_at
            .lock()
            .expect("tray-menu shown_at mutex")
            .elapsed()
            >= TRAY_MENU_BLUR_GRACE
    }
}

/// Registers the tray icon, hide-to-tray on main close, and tray-menu positioning.
pub fn setup<R: Runtime>(app: &App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let latch = Arc::new(TrayMenuFocusLatch::new());
    bind_window_events(app, Arc::clone(&latch))?;

    let image = Image::from_bytes(TRAY_PNG)?;
    TrayIconBuilder::new()
        .icon(image)
        .tooltip(TRAY_TOOLTIP)
        .on_tray_icon_event(move |tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => show_main(tray.app_handle()),
            TrayIconEvent::Click {
                button: MouseButton::Right,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } => {
                let app = tray.app_handle();
                let scale = app
                    .get_webview_window("tray-menu")
                    .and_then(|window| window.scale_factor().ok())
                    .unwrap_or(1.0);
                show_tray_menu(app, icon_px_rect(&rect, scale), &latch);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn bind_window_events<R: Runtime>(
    app: &App<R>,
    latch: Arc<TrayMenuFocusLatch>,
) -> Result<(), Box<dyn std::error::Error>> {
    let main = app
        .get_webview_window("main")
        .ok_or("main window is missing")?;
    let main_hide = main.clone();
    main.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = main_hide.hide();
        }
    });

    let tray_menu = app
        .get_webview_window("tray-menu")
        .ok_or("tray-menu window is missing")?;
    let tray_menu_hide = tray_menu.clone();
    tray_menu.on_window_event(move |event| match event {
        WindowEvent::Focused(true) => latch.note_focused(),
        WindowEvent::Focused(false) if latch.should_hide_on_blur() => {
            let _ = tray_menu_hide.hide();
        }
        _ => {}
    });

    Ok(())
}

fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.unminimize();
        let _ = main.show();
        let _ = main.set_focus();
    }
    if let Some(tray_menu) = app.get_webview_window("tray-menu") {
        let _ = tray_menu.hide();
    }
}

fn show_tray_menu<R: Runtime>(app: &AppHandle<R>, icon: PxRect, latch: &TrayMenuFocusLatch) {
    let Some(menu) = app.get_webview_window("tray-menu") else {
        return;
    };
    latch.mark_shown();
    let size = menu.outer_size().unwrap_or(tauri::PhysicalSize {
        width: 200,
        height: 140,
    });
    let Some(monitor) = menu
        .monitor_from_point(f64::from(icon.x), f64::from(icon.y))
        .ok()
        .flatten()
        .or_else(|| menu.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten())
    else {
        return;
    };
    let work_area = monitor.work_area();
    let work = PxRect {
        x: work_area.position.x,
        y: work_area.position.y,
        width: work_area.size.width,
        height: work_area.size.height,
    };
    let (x, y) = tray_menu_origin(
        icon,
        PxSize {
            width: size.width,
            height: size.height,
        },
        work,
    );
    let _ = menu.set_position(PhysicalPosition::new(x, y));
    let _ = menu.show();
    let _ = menu.set_focus();
}

fn icon_px_rect(rect: &tauri::Rect, scale_factor: f64) -> PxRect {
    let pos = rect.position.to_physical::<i32>(scale_factor);
    let size = rect.size.to_physical::<u32>(scale_factor);
    PxRect {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
    }
}
