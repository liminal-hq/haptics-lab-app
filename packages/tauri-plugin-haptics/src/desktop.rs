use crate::{models::*, Result};

pub struct Haptics;

impl Haptics {
    pub fn capabilities(&self) -> Result<Capabilities> {
        Ok(Capabilities {
            has_vibrator: false,
            has_amplitude_control: false,
            composition_supported: false,
            primitives: None,
            envelope_supported: false,
            envelope_info: None,
            haptic_feedback_enabled: None,
        })
    }

    pub fn play(&self, _req: EffectRequest) -> Result<PlayResult> {
        Err(crate::Error::Unsupported)
    }

    pub fn stop(&self) -> Result<()> {
        Ok(())
    }
}
