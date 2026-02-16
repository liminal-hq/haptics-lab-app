use tauri::{command, AppHandle, Runtime};

use crate::{models::*, HapticsExt};

#[command]
pub fn capabilities<R: Runtime>(app: AppHandle<R>) -> std::result::Result<Capabilities, String> {
    app.haptics().capabilities().map_err(|e| e.to_string())
}

#[command]
pub fn play<R: Runtime>(
    app: AppHandle<R>,
    req: EffectRequest,
) -> std::result::Result<PlayResult, String> {
    app.haptics().play(req).map_err(|e| e.to_string())
}

#[command]
pub fn stop<R: Runtime>(app: AppHandle<R>) -> std::result::Result<(), String> {
    app.haptics().stop().map_err(|e| e.to_string())
}
