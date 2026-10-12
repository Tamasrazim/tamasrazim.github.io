# PHASEBREAK — Native Android Game

PHASEBREAK is a standalone, offline 2D platform game written in Kotlin for Android. It is not a website, PWA, browser game, or WebView wrapper.

## The game

Two realities occupy the same space. SOL platforms are solid in the bright phase; UMBRA platforms are solid in the shadow phase. Jump between platforms, switch realities mid-air, collect prism shards, activate checkpoints, and reach the gate at the end of each generated stage.

The game generates its rooms locally from a repeatable level seed. Progress and shard totals are saved on the device. There are no accounts, ads, analytics SDKs, paid services, or network permissions.

## Controls

- Left and right controls move the player.
- JUMP launches from a platform.
- PHASE swaps SOL and UMBRA. It can be used while airborne.
- The pause control opens the pause screen.
- Reach the gate to unlock the next stage. Falling returns the player to the latest checkpoint.

## Build an installable APK

The project uses Android Gradle Plugin 8.8.2, Kotlin 2.0.21 and Android SDK 35. It has no third-party runtime libraries.

On a machine with JDK 17+ and Android SDK platform 35 installed:

```sh
cd projects/phasebreak/android
gradle assembleDebug
```

The test APK is written to:

```
app/build/outputs/apk/debug/app-debug.apk
```

A GitHub Actions workflow also builds this APK and publishes it as a workflow artifact whenever the Android source changes. The debug APK is suitable for direct device testing; it is not a Play Store release. A production release must be signed with a private release key.

## Project layout

- `app/src/main/java/com/tamasrazim/phasebreak/MainActivity.kt` — Android activity and immersive display.
- `app/src/main/java/com/tamasrazim/phasebreak/PhasebreakGameView.kt` — rendering, controls, physics, procedural stages and local progress.
- `app/src/main/AndroidManifest.xml` — native Android entry point and landscape orientation.
- `app/build.gradle.kts` — Android build settings.
