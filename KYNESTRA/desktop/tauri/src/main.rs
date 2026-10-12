// What this does: Starts the KYNESTRA desktop application and hands control to Tauri's app runtime.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kynestra_lib::run()
}
