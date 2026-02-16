use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectRequest {
    pub id: Option<String>,
    pub usage: Option<String>,
    pub respect_system_settings: Option<bool>,
    pub stop_before_play: Option<bool>,
    pub effect: Effect,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Effect {
    Oneshot {
        duration_ms: u64,
        amplitude: Option<u16>,
    },
    Waveform {
        timings_ms: Vec<u64>,
        amplitudes: Option<Vec<u16>>,
        repeat: Option<i32>,
    },
    Predefined {
        effect_id: String,
    },
    Composition {
        steps: Vec<CompositionStep>,
    },
    EnvelopeWaveform {
        initial_frequency_hz: Option<f32>,
        control_points: Vec<EnvelopePoint>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvelopePoint {
    pub amplitude: f32,
    pub frequency_hz: f32,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum CompositionStep {
    Primitive {
        primitive: String,
        scale: Option<f32>,
        delay_ms: Option<u64>,
    },
    Effect {
        effect: String,
        delay_ms: Option<u64>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Capabilities {
    pub has_vibrator: bool,
    pub has_amplitude_control: bool,

    pub composition_supported: bool,
    pub primitives: Option<serde_json::Value>,

    pub envelope_supported: bool,
    pub envelope_info: Option<serde_json::Value>,

    pub haptic_feedback_enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayResult {
    pub ok: bool,
    pub downgraded: Option<bool>,
    pub downgrade_reason: Option<String>,
}
