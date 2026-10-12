// What this does: Stages the complete renderer and other local creative tools before the Tauri shell is built.

use std::{
    env, fs,
    path::{Path, PathBuf},
};

fn main() {
    sync_c2m_assets().expect("failed to stage the canonical TRILYVA renderer for KYNESTRA");
    sync_c2m_batch_assets().expect("failed to sync KYNESTRA C2M batch assets");
    sync_forge_assets().expect("failed to sync KYNESTRA Forge assets");
    tauri_build::build();
}

// The renderer loads many local modules at runtime, so copy its whole folder—not just index.html.
fn sync_c2m_assets() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR")?);
    let source = manifest_dir.join("../../../projects/code-motion/renderer");
    let target = manifest_dir.join("../shell/modules/c2m/renderer");

    if target.exists() {
        fs::remove_dir_all(&target)?;
    }

    copy_directory(&source, &target)?;
    Ok(())
}

// Keep nested library modules, icons, worker files, manifests, and keyword data beside the HTML.
fn copy_directory(source: &Path, target: &Path) -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir_all(target)?;
    println!("cargo:rerun-if-changed={}", source.display());

    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());
        let file_type = entry.file_type()?;

        if file_type.is_dir() {
            copy_directory(&source_path, &target_path)?;
        } else if file_type.is_file() {
            fs::copy(&source_path, &target_path)?;
            println!("cargo:rerun-if-changed={}", source_path.display());
        }
    }

    Ok(())
}

fn sync_c2m_batch_assets() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR")?);
    let source = manifest_dir.join("../../modules/c2m/batch");
    let target = manifest_dir.join("../shell/modules/c2m/batch");

    fs::create_dir_all(&target)?;

    for relative in ["index.html"] {
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
