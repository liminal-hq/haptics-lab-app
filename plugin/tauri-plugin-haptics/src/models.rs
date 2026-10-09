use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
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
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
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
    pub platform: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sdk_int: Option<u32>,
    pub has_vibrator: bool,
    pub has_amplitude_control: bool,
    /// 0 no vibrator, 1 on/off, 2 amplitude, 3 primitives, 4 envelope.
    pub top_tier: u8,

    pub composition_supported: bool,
    #[serde(default)]
    pub primitives: BTreeMap<String, PrimitiveSupport>,

    /// `yes`, `no` or `unknown` per predefined effect.
    #[serde(default)]
    pub effects: BTreeMap<String, String>,

    pub envelope_supported: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub envelope_info: Option<EnvelopeInfo>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resonant_hz: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub q_factor: Option<f32>,

    /// `null` when the system setting cannot be read.
    #[serde(default)]
    pub touch_feedback_enabled: Option<bool>,
    /// Deprecated alias of `touch_feedback_enabled`, kept for one release.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub haptic_feedback_enabled: Option<bool>,

    pub limits: Limits,
    pub device: DeviceInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrimitiveSupport {
    pub supported: bool,
    /// Measured on this motor (API 31+); `null` when unknown.
    pub duration_ms: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvelopeInfo {
    pub max_size: u32,
    pub min_control_point_duration_ms: u64,
    pub max_control_point_duration_ms: u64,
    pub max_duration_ms: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frequency_profile: Option<FrequencyProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrequencyProfile {
    pub min_hz: f32,
    pub max_hz: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Limits {
    pub max_duration_ms: u64,
    pub max_amplitude: u16,
    pub allow_repeating_waveforms: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub manufacturer: String,
    pub model: String,
    /// OS version, for example "16".
    pub release: String,
}

impl Capabilities {
    /// The capabilities of a platform with no vibration motor.
    pub fn none(platform: &str, limits: Limits, device: DeviceInfo) -> Self {
        let primitives = PRIMITIVE_IDS
            .iter()
            .map(|id| {
                (
                    (*id).to_string(),
                    PrimitiveSupport {
                        supported: false,
                        duration_ms: None,
                    },
                )
            })
            .collect();
        let effects = EFFECT_IDS
            .iter()
            .map(|id| ((*id).to_string(), "no".to_string()))
            .collect();

        Self {
            platform: platform.to_string(),
            sdk_int: None,
            has_vibrator: false,
            has_amplitude_control: false,
            top_tier: 0,
            composition_supported: false,
            primitives,
            effects,
            envelope_supported: false,
            envelope_info: None,
            resonant_hz: None,
            q_factor: None,
            touch_feedback_enabled: None,
            haptic_feedback_enabled: None,
            limits,
            device,
        }
    }
}

pub const PRIMITIVE_IDS: [&str; 7] = [
    "tick",
    "low_tick",
    "click",
    "thud",
    "spin",
    "quick_rise",
    "slow_rise",
];

pub const EFFECT_IDS: [&str; 4] = ["click", "double_click", "tick", "heavy_click"];

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
        assert_eq!(
            value["effect"]["timingsMs"],
            serde_json::json!([0, 50, 50, 100])
        );
        assert_eq!(
            value["effect"]["amplitudes"],
            serde_json::json!([0, 128, 0, 255])
        );
        assert_eq!(value["effect"]["repeat"], -1);
    }

    #[test]
    fn deserializes_capabilities_from_the_native_shape() {
        let raw = serde_json::json!({
            "platform": "android",
            "sdkInt": 37,
            "hasVibrator": true,
            "hasAmplitudeControl": true,
            "topTier": 3,
            "compositionSupported": true,
            "primitives": {
                "click": { "supported": true, "durationMs": 12 },
                "low_tick": { "supported": false, "durationMs": null }
            },
            "effects": { "click": "yes", "heavy_click": "unknown" },
            "envelopeSupported": false,
            "resonantHz": 146.5,
            "touchFeedbackEnabled": true,
            "hapticFeedbackEnabled": true,
            "limits": {
                "maxDurationMs": 10000,
                "maxAmplitude": 255,
                "allowRepeatingWaveforms": false
            },
            "device": { "manufacturer": "Google", "model": "Pixel 8 Pro", "release": "17" }
        });

        let caps: Capabilities = serde_json::from_value(raw).expect("deserialize capabilities");
        assert_eq!(caps.top_tier, 3);
        assert_eq!(caps.primitives["click"].duration_ms, Some(12));
        assert!(!caps.primitives["low_tick"].supported);
        assert_eq!(caps.primitives["low_tick"].duration_ms, None);
        assert_eq!(caps.effects["heavy_click"], "unknown");
        assert_eq!(caps.resonant_hz, Some(146.5));
        assert_eq!(caps.touch_feedback_enabled, Some(true));
        assert_eq!(caps.device.model, "Pixel 8 Pro");
    }

    #[test]
    fn serializes_capabilities_with_camel_case_and_both_touch_keys() {
        let mut caps = Capabilities::none("android", test_limits(), test_device());
        caps.touch_feedback_enabled = Some(false);
        caps.haptic_feedback_enabled = Some(false);

        let value = serde_json::to_value(caps).expect("serialize capabilities");
        assert_eq!(value["topTier"], 0);
        assert_eq!(value["touchFeedbackEnabled"], false);
        assert_eq!(value["hapticFeedbackEnabled"], false);
        assert_eq!(value["limits"]["maxDurationMs"], 10_000);
        assert_eq!(value["primitives"]["low_tick"]["supported"], false);
        assert!(value.get("sdkInt").is_none());
        assert!(value.get("envelopeInfo").is_none());
    }

    #[test]
    fn desktop_capabilities_report_every_primitive_and_effect_as_unsupported() {
        let caps = Capabilities::none("desktop", test_limits(), test_device());
        assert_eq!(caps.primitives.len(), PRIMITIVE_IDS.len());
        assert!(caps.primitives.values().all(|p| !p.supported));
        assert_eq!(caps.effects.len(), EFFECT_IDS.len());
        assert!(caps.effects.values().all(|e| e == "no"));
        assert_eq!(caps.top_tier, 0);
    }

    fn test_limits() -> Limits {
        Limits {
            max_duration_ms: 10_000,
            max_amplitude: 255,
            allow_repeating_waveforms: false,
        }
    }

    fn test_device() -> DeviceInfo {
        DeviceInfo {
            manufacturer: "Test".to_string(),
            model: "Desktop".to_string(),
            release: "1".to_string(),
        }
    }
}
