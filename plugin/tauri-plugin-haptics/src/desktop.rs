use crate::{config::Config, models::*, Result};

pub struct Haptics {
    config: Config,
}

impl Haptics {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    pub fn capabilities(&self) -> Result<Capabilities> {
        let limits = Limits {
            max_duration_ms: self.config.max_duration_ms.unwrap_or(10_000),
            max_amplitude: u16::from(self.config.max_amplitude.unwrap_or(255)),
            allow_repeating_waveforms: self.config.allow_repeating_waveforms.unwrap_or(false),
        };
        let device = DeviceInfo {
            manufacturer: String::new(),
            model: std::env::consts::OS.to_string(),
            release: String::new(),
        };
        Ok(Capabilities::none("desktop", limits, device))
    }

    pub fn play(&self, _req: EffectRequest) -> Result<PlayResult> {
        Ok(PlayResult::silent("No vibrator on this platform"))
    }

    pub fn stop(&self) -> Result<()> {
        Ok(())
    }
}
