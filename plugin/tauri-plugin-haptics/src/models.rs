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
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
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
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_predefined_with_type_tag_and_camel_case_fields() {
        let req = EffectRequest {
            id: None,
            usage: Some("touch".to_string()),
            respect_system_settings: Some(true),
            stop_before_play: Some(true),
            effect: Effect::Predefined {
                effect_id: "click".to_string(),
            },
        };

        let value = serde_json::to_value(req).expect("serialize effect request");
        assert_eq!(value["effect"]["type"], "predefined");
        assert_eq!(value["effect"]["effectId"], "click");
    }

    #[test]
    fn deserializes_waveform_from_camel_case_fields() {
        let raw = serde_json::json!({
            "effect": {
                "type": "waveform",
                "timingsMs": [0, 50, 50, 100],
                "amplitudes": [0, 128, 0, 255],
                "repeat": -1
            }
        });

        let req: EffectRequest = serde_json::from_value(raw).expect("deserialize effect request");
        match req.effect {
            Effect::Waveform {
                timings_ms,
                amplitudes,
                repeat,
            } => {
                assert_eq!(timings_ms, vec![0, 50, 50, 100]);
                assert_eq!(amplitudes, Some(vec![0, 128, 0, 255]));
                assert_eq!(repeat, Some(-1));
            }
            _ => panic!("expected waveform effect"),
        }
    }

    #[test]
    fn serializes_waveform_with_expected_timings_key() {
        let req = EffectRequest {
            id: None,
            usage: Some("touch".to_string()),
            respect_system_settings: Some(true),
            stop_before_play: Some(true),
            effect: Effect::Waveform {
                timings_ms: vec![0, 50, 50, 100],
                amplitudes: Some(vec![0, 128, 0, 255]),
                repeat: Some(-1),
            },
        };

        let value = serde_json::to_value(req).expect("serialize waveform request");
        assert_eq!(value["effect"]["type"], "waveform");
        assert_eq!(value["effect"]["timingsMs"], serde_json::json!([0, 50, 50, 100]));
        assert_eq!(value["effect"]["amplitudes"], serde_json::json!([0, 128, 0, 255]));
        assert_eq!(value["effect"]["repeat"], -1);
    }
}
