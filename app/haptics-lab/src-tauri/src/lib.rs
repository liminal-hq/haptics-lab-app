/// The level floor applied to every log line — native Rust and forwarded
/// webview `console.*` calls alike. Verbose in a debug build, `Info` and up in
/// a release one, the same split the other Liminal HQ apps use.
fn log_level() -> log::LevelFilter {
    if cfg!(debug_assertions) {
        log::LevelFilter::Trace
    } else {
        log::LevelFilter::Info
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // `tauri-plugin-log`'s own `plugin:log|log` command is what
        // `src/services/logger.ts` forwards the webview's `console.*` calls
        // into. That command re-emits through this same process-global `log`
        // logger, so forwarded webview messages land in exactly the same
        // stream (stdout, which is logcat on Android, plus the log file) as
        // native `log::info!()` calls, with the same formatting and level floor.
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log_level())
                .format(|out, message, record| {
                    out.finish(format_args!(
                        "[{}][{}][{}] {}",
                        chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f %:z"),
                        record.level(),
                        record.target(),
                        message
                    ))
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_material_you::init())
        .plugin(tauri_plugin_haptics::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn debug_builds_log_everything() {
        // Tests always run with debug assertions on.
        assert_eq!(log_level(), log::LevelFilter::Trace);
    }
}
