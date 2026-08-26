use std::sync::Mutex;

use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateIcon, DestroyIcon, HICON, ICON_BIG, ICON_SMALL, SendMessageW, WM_SETICON,
};

use super::theme_icon_error::ThemeIconError;
use super::theme_icon_scale::{ICON_BIG_MAX_EDGE, ICON_SMALL_EDGE, scale_rgba_to_max_edge};

/// Live `HICON`s currently assigned to the main window. Dropping them while
/// Windows still holds `WM_SETICON` handles would revert the taskbar glyph.
pub struct ThemeIconState {
    live: Mutex<Option<(OwnedIcon, OwnedIcon)>>,
}

struct OwnedIcon(isize);

// SAFETY: `HICON` is an opaque user32 handle. The mutex in `ThemeIconState`
// serializes create/replace/destroy, so the value is never used from two
// threads at once.
unsafe impl Send for OwnedIcon {}

impl OwnedIcon {
    fn from_hicon(icon: HICON) -> Self {
        Self(icon.0 as isize)
    }

    fn as_hicon(&self) -> HICON {
        HICON(self.0 as *mut core::ffi::c_void)
    }
}

impl ThemeIconState {
    pub fn new() -> Self {
        Self {
            live: Mutex::new(None),
        }
    }
}

impl Default for ThemeIconState {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for ThemeIconState {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.live.lock() {
            destroy_pair(guard.take());
        }
    }
}

/// Creates a Windows icon from RGBA and destroys it. Proves `CreateIcon` accepts
/// the packed buffer without leaking a live handle.
pub fn create_hicon_from_rgba(rgba: &[u8], width: u32, height: u32) -> Result<(), ThemeIconError> {
    let icon = hicon_from_rgba(rgba, width, height)?;
    unsafe {
        DestroyIcon(icon).map_err(|e| ThemeIconError::TaskbarIcon(e.to_string()))?;
    }
    Ok(())
}

/// Scales the window raster and assigns `ICON_SMALL` plus `ICON_BIG` on `hwnd`.
pub fn apply_taskbar_icons(
    hwnd_bits: isize,
    rgba: &[u8],
    width: u32,
    height: u32,
    state: &ThemeIconState,
) -> Result<(), ThemeIconError> {
    let (small_rgba, small_w, small_h) =
        scale_rgba_to_max_edge(rgba, width, height, ICON_SMALL_EDGE)?;
    let (big_rgba, big_w, big_h) = scale_rgba_to_max_edge(rgba, width, height, ICON_BIG_MAX_EDGE)?;
    let small = hicon_from_rgba(&small_rgba, small_w, small_h)?;
    let big = match hicon_from_rgba(&big_rgba, big_w, big_h) {
        Ok(icon) => icon,
        Err(err) => {
            let _ = unsafe { DestroyIcon(small) };
            return Err(err);
        }
    };

    let hwnd = HWND(hwnd_bits as *mut core::ffi::c_void);
    // SAFETY: `small` / `big` remain owned by `ThemeIconState` until replaced.
    // `WM_SETICON` does not copy the `HICON`; destroying it early blanks the taskbar.
    unsafe {
        SendMessageW(
            hwnd,
            WM_SETICON,
            Some(WPARAM(ICON_SMALL as usize)),
            Some(LPARAM(small.0 as isize)),
        );
        SendMessageW(
            hwnd,
            WM_SETICON,
            Some(WPARAM(ICON_BIG as usize)),
            Some(LPARAM(big.0 as isize)),
        );
    }

    let previous = {
        let mut guard = state
            .live
            .lock()
            .map_err(|_| ThemeIconError::TaskbarIcon("theme icon lock poisoned".into()))?;
        guard.replace((OwnedIcon::from_hicon(small), OwnedIcon::from_hicon(big)))
    };
    destroy_pair(previous);
    Ok(())
}

fn hicon_from_rgba(rgba: &[u8], width: u32, height: u32) -> Result<HICON, ThemeIconError> {
    if width == 0 || height == 0 {
        return Err(ThemeIconError::InvalidRgba);
    }
    let expected = (width as usize)
        .checked_mul(height as usize)
        .and_then(|pixels| pixels.checked_mul(4))
        .ok_or(ThemeIconError::InvalidRgba)?;
    if rgba.len() != expected {
        return Err(ThemeIconError::InvalidRgba);
    }

    let pixel_count = (width as usize) * (height as usize);
    let mut color = rgba.to_vec();
    let mut and_mask = Vec::with_capacity(pixel_count);
    for pixel in color.chunks_exact_mut(4) {
        and_mask.push(pixel[3].wrapping_sub(u8::MAX));
        pixel.swap(0, 2);
    }

    // SAFETY: `and_mask` and `color` pointers are valid for the duration of the
    // call; `CreateIcon` copies the bitmaps into the returned `HICON`.
    unsafe {
        CreateIcon(
            None,
            width as i32,
            height as i32,
            1,
            32,
            and_mask.as_ptr(),
            color.as_ptr(),
        )
        .map_err(|e| ThemeIconError::TaskbarIcon(e.to_string()))
    }
}

fn destroy_pair(pair: Option<(OwnedIcon, OwnedIcon)>) {
    if let Some((small, big)) = pair {
        let _ = unsafe { DestroyIcon(small.as_hicon()) };
        let _ = unsafe { DestroyIcon(big.as_hicon()) };
    }
}
