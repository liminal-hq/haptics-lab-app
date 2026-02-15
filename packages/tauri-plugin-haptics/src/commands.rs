use tauri::{command, Manager, Runtime};

use crate::{models::*, HapticsExt, Result};

#[command]
pub fn capabilities<R: Runtime, T: Manager<R>>(app: T) -> Result<Capabilities> {
  app.haptics().capabilities()
}

#[command]
pub fn play<R: Runtime, T: Manager<R>>(app: T, req: EffectRequest) -> Result<PlayResult> {
  app.haptics().play(req)
}

#[command]
pub fn stop<R: Runtime, T: Manager<R>>(app: T) -> Result<()> {
  app.haptics().stop()
}
