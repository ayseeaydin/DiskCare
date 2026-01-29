# DiskCare Changelog

## [1.0.0] - 2026-01-27

### Added

- Initial public release: scan, clean, report, config, init commands
- Triple-gate safety model
- Custom rules via rules.json
- Log schema versioning (version: "0.0.1")
- Local-only analytics (privacy-first)

#### Highlights

- **@diskcare/shared-utils** package introduced
- Custom paths support in rules
- Improved error context and logging
- New edge-case and manual tests (symlink, permission, UNC, trash)

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- All known edge cases covered by tests

## Backward Compatibility

- All breaking changes will be documented here
- Migration guides will be provided for future log format changes
