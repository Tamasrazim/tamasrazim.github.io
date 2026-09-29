# .tamasrazim Format

Draft v0.1.

.tamasrazim is the native KYNESTRA project/package format.

Logical contents:
- manifest.json
- project.db
- modules/
- source/
- assets/
- renders/
- previews/

The physical container implementation is intentionally deferred. KYNESTRA may use an archive/package representation while exposing a single .tamasrazim extension.

## Minimum manifest

- format: tamasrazim
- formatVersion: 0.1
- projectId
- name
- createdBy: KYNESTRA

## Rules
- projectId is immutable after creation
- project name may change
- prefer project-relative paths
- caches must not be required to open a project
- secrets and platform credentials never belong inside the project package
- future format versions require explicit migrations
