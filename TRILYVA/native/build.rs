fn main() {
    println!("cargo:rerun-if-changed=assets/trilyva.ico");
    println!("cargo:rerun-if-changed=assets/trilyva.svg");
    #[cfg(target_os = "windows")]
    {
        let mut resources = winres::WindowsResource::new();
        resources.set_icon("assets/trilyva.ico");
        if let Err(error) = resources.compile() {
            panic!("Could not embed the TRILYVA application icon: {error}");
        }
    }
}
