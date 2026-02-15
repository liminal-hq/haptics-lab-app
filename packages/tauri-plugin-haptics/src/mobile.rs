use tauri::{plugin::PluginHandle, Runtime};

use crate::{models::*, Result};

pub struct Haptics<R: Runtime>(pub PluginHandle<R>);

impl<R: Runtime> Haptics<R> {
  pub fn capabilities(&self) -> Result<Capabilities> {
    self.0
      .run_mobile_plugin("capabilities", ())
      .map_err(Into::into)
  }

  pub fn play(&self, req: EffectRequest) -> Result<PlayResult> {
    self.0
      .run_mobile_plugin("play", req)
      .map_err(Into::into)
  }

  pub fn stop(&self) -> Result<()> {
    self.0
      .run_mobile_plugin("stop", ())
      .map(|_: serde_json::Value| ())
      .map_err(Into::into)
  }
}
