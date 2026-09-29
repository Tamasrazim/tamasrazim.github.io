# .tamasrazim Format

Draft v0.2.

## Native format

.tamasrazim is KYNESTRA's native project/package format.

A working project is a directory whose name ends in `.tamasrazim`. A portable project package is also given the `.tamasrazim` extension and contains the working project as a ZIP archive.

This intentionally allows one extension to represent both:

- a live working project directory
- a portable project package file

They are not placed at the same filesystem path at the same time.

## Working project layout

```
Project.tamasrazim/
├── manifest.json
├── project.db
├── modules/
├── source/
├── assets/
├── renders/
└── previews/
```

Transient `cache/` content is not part of portable exports.

## Portable package

The portable file is a standard ZIP container.

It contains:

- all non-cache project files
- `package-manifest.json`

The package manifest includes:

- `format: tamasrazim`
- `packageVersion: 1`
- `projectId`
- project name
- package timestamp
- one SHA-256 and byte-size entry for every packaged file

KYNESTRA verifies each packaged file after extraction before accepting the imported project.

Package manifests must contain unique relative file paths, must include both `manifest.json` and `project.db`, and must not list the reserved `package-manifest.json` path. SHA-256 values are fixed-length hexadecimal digests. Package export writes to a temporary sibling file and only replaces the destination after the archive has finished successfully.

Symlinks are not packaged, preventing a project file from resolving outside the working project through a link.

## Minimum project manifest

- `format: tamasrazim`
- `formatVersion: 0.1`
- `projectId`
- `name`
- `createdBy: KYNESTRA`

## Rules

- `projectId` is immutable.
- Project name may change.
- Project-relative paths are preferred.
- Cache data is disposable.
- Secrets and platform credentials never belong inside the project package.
- Package extraction rejects absolute paths, parent-directory traversal, reserved manifest paths, and duplicate file entries.
- Future format versions require explicit migrations.
