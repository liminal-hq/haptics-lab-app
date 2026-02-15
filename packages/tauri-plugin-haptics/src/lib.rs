use tauri::{plugin::{Builder, TauriPlugin}, AppHandle, Manager, Runtime};

mod commands;
mod config;
mod desktop;
mod error;
mod mobile;
mod models;

pub use error::{Error, Result};

#[cfg(mobile)]
use tauri::plugin::PluginHandle;

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "ca.liminalhq.haptics";

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_haptics);

pub struct HapticsState<R: Runtime> {
  #[allow(dead_code)]
  app: AppHandle<R>,
  config: config::Config,

  #[cfg(mobile)]
  mobile: mobile::Haptics<R>,

  #[cfg(desktop)]
  desktop: desktop::Haptics,
}

impl<R: Runtime> HapticsState<R> {
  pub fn capabilities(&self) -> Result<models::Capabilities> {
    #[cfg(mobile)]
    { return self.mobile.capabilities(); }

    #[cfg(desktop)]
    { return self.desktop.capabilities(); }
  }

  pub fn play(&self, req: models::EffectRequest) -> Result<models::PlayResult> {
    // TODO: apply Rust-side validation/clamping too (belt & suspenders)
    #[cfg(mobile)]
    { return self.mobile.play(req); }

    #[cfg(desktop)]
    { return self.desktop.play(req); }
  }

  pub fn stop(&self) -> Result<()> {
    #[cfg(mobile)]
    { return self.mobile.stop(); }

    #[cfg(desktop)]
    { return self.desktop.stop(); }
  }
}

pub trait HapticsExt<R: Runtime> {
  fn haptics(&self) -> &HapticsState<R>;
}

impl<R: Runtime, T: Manager<R>> HapticsExt<R> for T {
  fn haptics(&self) -> &HapticsState<R> {
    self.state::<HapticsState<R>>().inner()
  }
}

pub fn init<R: Runtime>() -> TauriPlugin<R, Option<config::Config>> {
  Builder::<R, Option<config::Config>>::new("haptics")
    .js_init_script(include_str!("init-iife.js").to_string())
    .invoke_handler(tauri::generate_handler![
      commands::capabilities,
      commands::play,
      commands::stop,
    ])
    .setup(|app, api| {
      let default_config = config::Config::default();
      let config = api.config().as_ref().unwrap_or(&default_config).clone();

      #[cfg(target_os = "android")]
      let handle: PluginHandle<R> = api.register_android_plugin(PLUGIN_IDENTIFIER, "HapticsPlugin")?;

      #[cfg(target_os = "ios")]
      let handle: PluginHandle<R> = api.register_ios_plugin(init_plugin_haptics)?;

      app.manage(HapticsState {
        app: app.clone(),
        config,
        #[cfg(mobile)]
        mobile: mobile::Haptics(handle),
        #[cfg(desktop)]
        desktop: desktop::Haptics,
      });

      Ok(())
    })
    .build()
}
