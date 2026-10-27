# TRILYVA Native Verification Record

Recorded: 2026-10-27

This record separates build evidence from checks that still need to be run on an installed desktop app. A successful build does not establish that every feature is complete or that the UI has been exercised on every operating system.

## Verified source and CI

- Branch: `trilyva-native-rebuild`
- Source revision tested: [`b4550da4a0b847d5a5888edbb4a9f1283e079fa0`](https://github.com/Tamasrazim/tamasrazim.github.io/commit/b4550da4a0b847d5a5888edbb4a9f1283e079fa0)
- [GitHub Actions run 40419463012](https://github.com/Tamasrazim/tamasrazim.github.io/actions/runs/40419463012): **success**
- All four build jobs completed successfully: Windows x64, Linux x64, macOS Intel, and macOS Apple Silicon.
- Linux ran the native renderer test suite: **6 passed, 0 failed**.

The six renderer tests were:

1. `frame_output_does_not_depend_on_render_order`
2. `renders_basic_canvas_frame_from_native_contract`
3. `math_random_is_repeatable_for_the_same_frame`
4. `unsupported_text_is_reported_instead_of_dropped`
5. `unsupported_gradient_is_not_replaced_with_solid_white`
6. `infinite_frame_script_is_interrupted`

## Build artifact digests

These SHA-256 values are GitHub's digests for the downloadable Actions artifact ZIPs from the run above.

| Build | Artifact | Size | SHA-256 |
| --- | --- | ---: | --- |
| Windows x64 | `TRILYVA-Windows-x64-Setup` | 4,035,863 bytes | `3177e7b014fc476b783a4fd3a2248b3811ed3b47bf904c66113211ac86249ec7` |
| Linux x64 | `TRILYVA-Linux-x64` | 5,234,191 bytes | `debd4d363565086ef2cbcca234f5d4719ae23c8411286ed990eb43a2c4ba1dc7` |
| macOS Intel | `TRILYVA-macOS-Intel` | 3,711,284 bytes | `7db5499d809ac13c6b5c8bfc4bca8728dfd85641459b1fcbbd57992e7eba2d5c` |
| macOS Apple Silicon | `TRILYVA-macOS-Apple-Silicon` | 3,492,597 bytes | `f7f78120e464dac541aae48b00c06be82b9000640e430abe2f6efe5287601b8d` |

GitHub lists these artifacts as expiring on 2027-01-24.

## Windows package checked on this PC

The Windows artifact ZIP was downloaded and its local SHA-256 matched GitHub's artifact digest above. The archive contained one setup executable:

- Product name: TRILYVA
- Installer size: 4,541,073 bytes
- Installer SHA-256: `db97fb469b6bc7b1a7faa7320d9b85b366ff21cf104451e097fd4879f1660053`
- Installer Authenticode status: **NotSigned**

On 2026-10-27, the installer was run after the user authorized installation. TRILYVA opened to its native workspace, displayed the starter animation, and reported “Animation compiled.” The installed executable is also unsigned; its SHA-256 is `1c0480d6771695c90910978ae3cfec652e2044ffd2cc71fcd37b5446e600e3d7`. The Inno Setup uninstaller is present.

Project save/open and PNG export checks were interrupted when the app window closed during desktop interaction. Those behaviors remain unverified; the closure was not diagnosed as a crash. The app is currently left installed. Uninstall and repeat-install checks have not yet been run.
## Known product limits

The current native build is an early foundation, not full feature parity. The native README tracks remaining work, including text/font rendering, gradients, image drawing, compositing, background preview rendering, render cancellation, video/codec export, and the complete project/library workflow. CI verifies compilation, packaging, and the listed renderer tests; it does not verify those unfinished features or certify the installers for distribution.
