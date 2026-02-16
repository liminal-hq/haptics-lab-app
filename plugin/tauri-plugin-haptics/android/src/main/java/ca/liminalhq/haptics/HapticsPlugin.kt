package ca.liminalhq.haptics

import android.app.Activity
import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.webkit.WebView
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import org.json.JSONArray

@InvokeArg
internal class AndroidConfigArgs {
  var foregroundAudioUsage: String? = null
  var backgroundAudioUsage: String? = null
}

@InvokeArg
internal class PluginConfigArgs {
  var defaultUsage: String? = null
  var respectSystemHapticsSetting: Boolean? = null
  var stopBeforePlay: Boolean? = null
  var maxDurationMs: Long? = null
  var maxAmplitude: Int? = null
  var allowRepeatingWaveforms: Boolean? = null
  var android: AndroidConfigArgs? = null
}

@InvokeArg
internal class EffectRequestArgs {
  // NOTE: union types are easiest to parse as a JSObject
  var id: String? = null
  var usage: String? = null
  var respectSystemSettings: Boolean? = null
  var stopBeforePlay: Boolean? = null
  lateinit var effect: JSObject
}

@TauriPlugin
class HapticsPlugin(private val activity: Activity) : Plugin(activity) {

  private var cfg = PluginConfigArgs()
  private val vibrator: Vibrator by lazy { getVibrator(activity) }

  override fun load(webView: WebView) {
    // Pull config from tauri.conf.json if present
    runCatching { getConfig(PluginConfigArgs::class.java) }.onSuccess {
      cfg = it
    }
  }

  @Command
  fun capabilities(invoke: Invoke) {
    val ret = JSObject()

    val hasVibrator = vibrator.hasVibrator()
    ret.put("hasVibrator", hasVibrator)
    ret.put("hasAmplitudeControl", if (hasVibrator) vibrator.hasAmplitudeControl() else false)

    // composition primitives
    val compositionSupported = if (Build.VERSION.SDK_INT >= 30) vibrator.areAllPrimitivesSupported(
      VibrationEffect.Composition.PRIMITIVE_CLICK,
      VibrationEffect.Composition.PRIMITIVE_TICK,
      VibrationEffect.Composition.PRIMITIVE_THUD,
      VibrationEffect.Composition.PRIMITIVE_SPIN,
      VibrationEffect.Composition.PRIMITIVE_QUICK_RISE,
      VibrationEffect.Composition.PRIMITIVE_SLOW_RISE,
    ) else false
    ret.put("compositionSupported", compositionSupported)

    // Envelope effects are disabled here until this plugin is built with an API
    // level that includes stable envelope APIs on all toolchains.
    val envelopeSupported = false
    ret.put("envelopeSupported", envelopeSupported)

    // system setting (optional)
    val enabled = try {
      Settings.System.getInt(activity.contentResolver, Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) != 0
    } catch (_: Throwable) { null }
    if (enabled != null) ret.put("hapticFeedbackEnabled", enabled)

    invoke.resolve(ret)
  }

  @Command
  fun stop(invoke: Invoke) {
    vibrator.cancel()
    invoke.resolve(JSObject())
  }

  @Command
  fun play(invoke: Invoke) {
    val argsRoot = invoke.getArgs()
    val args = argsRoot.getJSObject("req") ?: argsRoot
    val effectObj = args.getJSObject("effect")
    if (effectObj == null) {
      invoke.reject("INVALID_EFFECT", "Missing effect payload")
      return
    }

    // honour system setting if configured
    val respect = if (args.has("respectSystemSettings")) {
      args.getBoolean("respectSystemSettings")
    } else {
      cfg.respectSystemHapticsSetting ?: true
    }
    if (respect) {
      val enabled = try {
        Settings.System.getInt(activity.contentResolver, Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) != 0
      } catch (_: Throwable) { true }
      if (!enabled) {
        val ret = JSObject()
        ret.put("ok", true)
        ret.put("downgraded", true)
        ret.put("downgradeReason", "System touch haptics disabled")
        invoke.resolve(ret)
        return
      }
    }

    val stopBefore = if (args.has("stopBeforePlay")) {
      args.getBoolean("stopBeforePlay")
    } else {
      cfg.stopBeforePlay ?: true
    }
    if (stopBefore) vibrator.cancel()

    val maxAmp = (cfg.maxAmplitude ?: 255).coerceIn(1, 255)
    val maxDur = (cfg.maxDurationMs ?: 10_000).coerceAtLeast(1)

    val (effect, downgraded, downgradeReason) = try {
      buildEffect(effectObj, vibrator, maxAmp, maxDur, cfg)
    } catch (e: Throwable) {
      invoke.reject("INVALID_EFFECT", e.message ?: "Invalid haptics request")
      return
    }

    val usage = args.getString("usage", cfg.defaultUsage ?: "touch") ?: "touch"
    val aa = audioAttributesForUsage(usage, cfg)

    // API surface differs by SDK; AudioAttributes works broadly.
    if (Build.VERSION.SDK_INT >= 21) {
      vibrator.vibrate(effect, aa)
    } else {
      // Very old fallback (unlikely in practice with Tauri minSdk)
      vibrator.vibrate(200)
    }

    val ret = JSObject()
    ret.put("ok", true)
    if (downgraded) {
      ret.put("downgraded", true)
      ret.put("downgradeReason", downgradeReason)
    }
    invoke.resolve(ret)
  }

  private fun buildEffect(
    effectObj: JSObject,
    vibrator: Vibrator,
    maxAmp: Int,
    maxDur: Long,
    cfg: PluginConfigArgs,
  ): Triple<VibrationEffect, Boolean, String?> {

    val type = effectObj.getString("type")

    return when (type) {
      "oneshot" -> {
        val dur = getLong(effectObj, "durationMs", "duration_ms").coerceAtMost(maxDur)
        val ampRaw = if (effectObj.has("amplitude")) effectObj.getInt("amplitude") else -1
        val amp = if (ampRaw <= 0) VibrationEffect.DEFAULT_AMPLITUDE else ampRaw.coerceIn(1, maxAmp)
        Triple(VibrationEffect.createOneShot(dur, amp), false, null)
      }

      "waveform" -> {
        val timings = toLongArray(getArray(effectObj, "timingsMs", "timings_ms"))
        val repeat = if (effectObj.has("repeat")) effectObj.getInt("repeat") else -1

        // Enforce repeat safety
        val allowRepeat = cfg.allowRepeatingWaveforms ?: false
        val safeRepeat = if (!allowRepeat && repeat >= 0) -1 else repeat
        val capped = capWaveformDuration(timings, maxDur)

        if (capped.isEmpty()) {
          throw IllegalArgumentException("timingsMs cannot be empty")
        }
        if (capped.all { it == 0L }) {
          throw IllegalArgumentException("at least one timing must be non-zero")
        }

        if (effectObj.has("amplitudes")) {
          val amps = toIntArray(getArray(effectObj, "amplitudes", "amplitudes_ms")).map { it.coerceIn(0, maxAmp) }.toIntArray()
          if (amps.size != capped.size) {
            throw IllegalArgumentException("amplitudes must have same length as timingsMs")
          }
          val eff = if (vibrator.hasAmplitudeControl()) {
            VibrationEffect.createWaveform(capped, amps, safeRepeat)
          } else {
            // Downgrade: non-zero amplitudes become full on; use timings-only
            VibrationEffect.createWaveform(capped, safeRepeat)
          }
          val downgraded = !vibrator.hasAmplitudeControl()
          Triple(eff, downgraded, if (downgraded) "Device lacks amplitude control" else null)
        } else {
          Triple(VibrationEffect.createWaveform(capped, safeRepeat), false, null)
        }
      }

      "predefined" -> {
        val id = getString(effectObj, "effectId", "effect_id")
        val effId = mapPredefinedEffect(id)
        Triple(VibrationEffect.createPredefined(effId), false, null)
      }

      "composition" -> {
        if (Build.VERSION.SDK_INT < 30) {
          // Downgrade to a click
          Triple(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK), true, "Composition requires API 30+")
        } else {
          val steps = getArray(effectObj, "steps")
          val comp = VibrationEffect.startComposition()

          for (i in 0 until steps.length()) {
            val step = getObject(steps, i)
            val kind = step.getString("kind")
            val delay = if (step.has("delayMs")) step.getLong("delayMs").toInt().coerceAtLeast(0) else 0

            when (kind) {
              "primitive" -> {
                val primId = mapPrimitive(step.getString("primitive"))
                val scale = if (step.has("scale")) step.getDouble("scale").toFloat().coerceIn(0f, 1f) else 1f
                comp.addPrimitive(primId, scale, delay)
              }
              "effect" -> {
                val primId = mapPrimitiveFromEffect(step.getString("effect"))
                comp.addPrimitive(primId, 1f, delay)
              }
            }
          }

          // If any primitive unsupported, composition may not play; you can pre-check in UI via capabilities.
          Triple(comp.compose(), false, null)
        }
      }

      "envelopeWaveform" -> {
        if (Build.VERSION.SDK_INT < 36) {
          Triple(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK), true, "Envelope requires API 36+ and device support")
        } else {
          Triple(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK), true, "Envelope effect is temporarily disabled")
        }
      }

      else -> throw IllegalArgumentException("Unknown effect type: $type")
    }
  }

  private fun capWaveformDuration(timings: LongArray, maxDur: Long): LongArray {
    var total = 0L
    val out = LongArray(timings.size)
    for (i in timings.indices) {
      val remain = (maxDur - total).coerceAtLeast(0)
      val v = timings[i].coerceAtLeast(0)
      val capped = v.coerceAtMost(remain)
      out[i] = capped
      total += capped
      if (total >= maxDur) {
        // zero out the rest
        for (j in i + 1 until timings.size) out[j] = 0
        break
      }
    }
    return out
  }

  private fun toLongArray(arr: JSArray): LongArray {
    val out = LongArray(arr.length())
    for (i in 0 until arr.length()) out[i] = arr.getLong(i)
    return out
  }

  private fun toIntArray(arr: JSArray): IntArray {
    val out = IntArray(arr.length())
    for (i in 0 until arr.length()) out[i] = arr.getInt(i)
    return out
  }

  private fun getArray(obj: JSObject, vararg keys: String): JSArray {
    for (key in keys) {
      if (!obj.has(key)) continue
      val raw = obj.get(key)
      when (raw) {
        is JSArray -> return raw
        is JSONArray -> return JSArray(raw.toString())
        else -> {
          val arr = JSArray.from(raw)
          if (arr != null) return arr
        }
      }
    }
    return JSArray()
  }

  private fun getLong(obj: JSObject, primary: String, fallback: String): Long {
    if (obj.has(primary)) return obj.getLong(primary)
    if (obj.has(fallback)) return obj.getLong(fallback)
    throw IllegalArgumentException("missing field `$primary`")
  }

  private fun getString(obj: JSObject, primary: String, fallback: String): String {
    if (obj.has(primary)) return obj.getString(primary)
    if (obj.has(fallback)) return obj.getString(fallback)
    throw IllegalArgumentException("missing field `$primary`")
  }

  private fun getObject(arr: JSArray, index: Int): JSObject {
    return JSObject.fromJSONObject(arr.getJSONObject(index))
  }

  private fun audioAttributesForUsage(usage: String, cfg: PluginConfigArgs): AudioAttributes {
    val u = usage.lowercase()

    val mappedUsage = when (u) {
      "alarm" -> AudioAttributes.USAGE_ALARM
      "notification" -> AudioAttributes.USAGE_NOTIFICATION
      "media" -> AudioAttributes.USAGE_MEDIA
      else -> AudioAttributes.USAGE_ASSISTANCE_SONIFICATION
    }

    return AudioAttributes.Builder()
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .setUsage(mappedUsage)
      .build()
  }

  private fun mapPredefinedEffect(id: String): Int {
    return when (id.lowercase()) {
      "click" -> VibrationEffect.EFFECT_CLICK
      "double_click" -> VibrationEffect.EFFECT_DOUBLE_CLICK
      "tick" -> VibrationEffect.EFFECT_TICK
      "heavy_click" -> VibrationEffect.EFFECT_HEAVY_CLICK
      else -> VibrationEffect.EFFECT_CLICK
    }
  }

  private fun mapPrimitiveFromEffect(id: String): Int {
    return when (id.lowercase()) {
      "tick" -> VibrationEffect.Composition.PRIMITIVE_TICK
      "thud" -> VibrationEffect.Composition.PRIMITIVE_THUD
      else -> VibrationEffect.Composition.PRIMITIVE_CLICK
    }
  }

  private fun mapPrimitive(id: String): Int {
    return when (id.lowercase()) {
      "tick" -> VibrationEffect.Composition.PRIMITIVE_TICK
      "click" -> VibrationEffect.Composition.PRIMITIVE_CLICK
      "thud" -> VibrationEffect.Composition.PRIMITIVE_THUD
      "spin" -> VibrationEffect.Composition.PRIMITIVE_SPIN
      "quick_rise" -> VibrationEffect.Composition.PRIMITIVE_QUICK_RISE
      "slow_rise" -> VibrationEffect.Composition.PRIMITIVE_SLOW_RISE
      else -> VibrationEffect.Composition.PRIMITIVE_CLICK
    }
  }

  private fun getVibrator(ctx: Context): Vibrator {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val vm = ctx.getSystemService(VibratorManager::class.java)
      vm.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      ctx.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
  }
}
