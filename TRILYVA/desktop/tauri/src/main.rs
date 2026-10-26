// Starts the TRILYVA desktop application.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    trilyva_desktop_lib::run();
}
