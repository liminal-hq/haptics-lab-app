const COMMANDS: &[&str] = &["capabilities", "play", "stop"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .global_api_script_path("./src/init-iife.js")
        .android_path("android")
        .build();
}
