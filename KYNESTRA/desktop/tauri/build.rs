use std::{env,fs,path::PathBuf};

fn main() {
    sync_c2m_assets().expect("failed to sync KYNESTRA C2M assets");
    sync_forge_assets().expect("failed to sync KYNESTRA Forge assets");
    tauri_build::build();
}

fn sync_c2m_assets() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR")?);
    let source = manifest_dir.join("../../modules/c2m/renderer");
    let target = manifest_dir.join("../shell/modules/c2m/renderer");

    fs::create_dir_all(target.join("icons"))?;

    for relative in [
        "index.html",
        "manifest.webmanifest",
        "media-stack.js",
        "sw.js",
        "icons/icon.svg",
    ] {
        let src = source.join(relative);
        let dst = target.join(relative);
        fs::copy(&src, &dst)?;
        println!("cargo:rerun-if-changed={}", src.display());
    }

    Ok(())
}

fn sync_forge_assets() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR")?);
    let source = manifest_dir.join("../../modules/forge/renderer");
    let target = manifest_dir.join("../shell/modules/forge/renderer");

    fs::create_dir_all(&target)?;

    for relative in [
        "index.html",
        "format-forge.webmanifest",
        "sw.js",
        "icon.svg",
    ] {
        let src = source.join(relative);
        let dst = target.join(relative);
        fs::copy(&src, &dst)?;
        println!("cargo:rerun-if-changed={}", src.display());
    }

    Ok(())
}
