// Copies the canonical TRILYVA workspace into Tauri's packaged frontend without changing its layout.
use std::{
    env, fs,
    path::{Path, PathBuf},
};

fn copy_directory(source: &Path, target: &Path) -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir_all(target)?;
    println!("cargo:rerun-if-changed={}", source.display());
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());
        let kind = entry.file_type()?;
        if kind.is_dir() {
            copy_directory(&source_path, &target_path)?;
        } else if kind.is_file() {
            fs::copy(&source_path, &target_path)?;
            println!("cargo:rerun-if-changed={}", source_path.display());
        }
    }
    Ok(())
}

fn main() {
    if let Err(error) = stage_workspace() {
        panic!("failed to stage TRILYVA workspace: {error}");
    }
    tauri_build::build();
}

fn stage_workspace() -> Result<(), Box<dyn std::error::Error>> {
    let manifest = PathBuf::from(env::var("CARGO_MANIFEST_DIR")?);
    let repo = manifest.join("../../..");
    let renderer = repo.join("projects/code-motion/renderer");
    let shell = manifest.join("../shell");

    if !renderer.join("index.html").is_file() {
        return Err(format!("canonical renderer was not found at {}", renderer.display()).into());
    }
    if shell.exists() {
        fs::remove_dir_all(&shell)?;
    }
    copy_directory(&renderer, &shell)?;

    // The web build expects the website's root URL for the logo. The desktop copy
    // uses a relative logo asset so the interface works from the packaged app root.
    let logo_source = repo.join("assets/brand/trilyva/T.svg");
    let logo_target = shell.join("assets/brand/trilyva/T.svg");
    if logo_source.is_file() {
        if let Some(parent) = logo_target.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(&logo_source, &logo_target)?;
    }

    let bridge_source = manifest.join("assets/desktop-bridge.js");
    let bridge_target = shell.join("desktop-bridge.js");
    fs::copy(&bridge_source, &bridge_target)?;
    println!("cargo:rerun-if-changed={}", bridge_source.display());

    let html_path = shell.join("index.html");
    let mut html = fs::read_to_string(&html_path)?;
    html = html.replace(
        r#"src="/assets/brand/trilyva/T.svg""#,
        r#"src="./assets/brand/trilyva/T.svg""#,
    );

    // Do not register the browser service worker or load browser-edition analytics in the desktop package.
    html = html.replace(
        r#"<script type="module" src="./firebase-analytics.js?v=20261022-1"></script>"#,
        "",
    );
    let service_worker = r#"<script>
(function(){
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(function(){});
  });
})();
</script>"#;
    html = html.replace(service_worker, "");

    let bridge_tag = r#"<script src="./desktop-bridge.js"></script>"#;
    if !html.contains(bridge_tag) {
        if let Some(index) = html.rfind("</body>") {
            html.insert_str(index, &format!("{bridge_tag}\n"));
        } else {
            html.push_str(bridge_tag);
        }
    }
    fs::write(html_path, html)?;
    println!("cargo:rerun-if-changed={}", renderer.display());
    println!("cargo:rerun-if-changed={}", logo_source.display());
    Ok(())
}
