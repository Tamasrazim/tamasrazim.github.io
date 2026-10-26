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

    let alpha_script_source = manifest.join("assets/desktop-alpha-export.js");
    let alpha_script_target = shell.join("desktop-alpha-export.js");
    fs::copy(&alpha_script_source, &alpha_script_target)?;
    println!("cargo:rerun-if-changed={}", alpha_script_source.display());

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

    // This panel exists only in the desktop package. The canonical browser UI is left unchanged.
    let still_marker = r#"<p class="note" id="stillExportNote">Frame numbers start at 0. After a successful render, TRILYVA also saves the selected still formats for this frame. PNG is the default.</p>"#;
    let alpha_panel = r#"<div class="sec" id="desktopAlphaExport" style="border-top:1px solid var(--rule);margin-top:14px;padding-top:14px">
      <h4>TRANSPARENT VIDEO · DESKTOP</h4>
      <p class="note">Set BACKGROUND to TRANSPARENT and export as PNG·DIR or PNG·ZIP first. Then encode that sequence as VP9 WebM with alpha or ProRes 4444 MOV. PNG, JPG, SVG and EPS still exports remain available above.</p>
      <div class="row"><label>PNG frame source</label><span class="val dim" id="alphaFolderLabel">Not selected</span></div>
      <div class="btn-row"><button class="btn" type="button" id="alphaChooseFrames">Choose PNG·DIR folder</button>
        <button class="btn" type="button" id="alphaChooseArchive">Choose PNG·ZIP archive</button>
        <select id="alphaProfile" aria-label="Transparent output format"><option value="webm">WebM · VP9 + alpha</option><option value="mov">MOV · ProRes 4444</option><option value="apng">APNG · animated image + alpha</option></select></div>
      <div class="row"><label>Frame settings</label><span class="val dim" id="alphaSettingsLabel">Current composition</span></div>
      <button class="btn solid" type="button" id="alphaEncodeButton">ENCODE TRANSPARENT VIDEO</button>
      <div class="note" id="alphaExportStatus" role="status" aria-live="polite">Alpha export is verified after encoding. A file without an alpha pixel format is rejected.</div>
    </div>"#;
    if !html.contains("id=\"desktopAlphaExport\"") {
        if !html.contains(still_marker) {
            return Err("Could not locate the still-frame export section to install the desktop alpha encoder UI.".into());
        }
        html = html.replace(still_marker, &format!("{still_marker}\n{alpha_panel}"));
    }

    let bridge_tag = r#"<script src="./desktop-bridge.js"></script>"#;
    let alpha_script_tag = r#"<script src="./desktop-alpha-export.js"></script>"#;
    if !html.contains(bridge_tag) || !html.contains(alpha_script_tag) {
        if let Some(index) = html.rfind("</body>") {
            let scripts = format!("{bridge_tag}\n{alpha_script_tag}\n");
            html.insert_str(index, &scripts);
        } else {
            html.push_str(&format!("{bridge_tag}\n{alpha_script_tag}\n"));
        }
    }
    fs::write(html_path, html)?;
    println!("cargo:rerun-if-changed={}", renderer.display());
    println!("cargo:rerun-if-changed={}", logo_source.display());
    Ok(())
}
