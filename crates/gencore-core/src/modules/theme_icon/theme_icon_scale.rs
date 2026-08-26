use super::theme_icon_error::ThemeIconError;

/// Maximum edge length for Windows `ICON_BIG` (taskbar / Alt+Tab).
pub const ICON_BIG_MAX_EDGE: u32 = 256;

/// Target edge length for Windows `ICON_SMALL` (titlebar).
pub const ICON_SMALL_EDGE: u32 = 32;

/// Nearest-neighbor downscale that preserves aspect ratio so the longer edge
/// is at most `max_edge`. Already-small buffers are copied unchanged.
pub fn scale_rgba_to_max_edge(
    rgba: &[u8],
    width: u32,
    height: u32,
    max_edge: u32,
) -> Result<(Vec<u8>, u32, u32), ThemeIconError> {
    if width == 0 || height == 0 || max_edge == 0 {
        return Err(ThemeIconError::InvalidRgba);
    }
    let expected = (width as usize)
        .checked_mul(height as usize)
        .and_then(|pixels| pixels.checked_mul(4))
        .ok_or(ThemeIconError::InvalidRgba)?;
    if rgba.len() != expected {
        return Err(ThemeIconError::InvalidRgba);
    }
    if width <= max_edge && height <= max_edge {
        return Ok((rgba.to_vec(), width, height));
    }

    let src_edge = u64::from(width.max(height));
    let new_w = ((u64::from(width) * u64::from(max_edge)) / src_edge).max(1) as u32;
    let new_h = ((u64::from(height) * u64::from(max_edge)) / src_edge).max(1) as u32;
    let mut out = vec![0_u8; (new_w as usize) * (new_h as usize) * 4];
    for y in 0..new_h {
        for x in 0..new_w {
            let src_x = x * width / new_w;
            let src_y = y * height / new_h;
            let src_i = ((src_y * width + src_x) * 4) as usize;
            let dst_i = ((y * new_w + x) * 4) as usize;
            out[dst_i..dst_i + 4].copy_from_slice(&rgba[src_i..src_i + 4]);
        }
    }
    Ok((out, new_w, new_h))
}
