# DiskCare Migration Guide

## Migrating Log Formats (v1 to v2)

DiskCare uses semantic versioning for log schemas. If a breaking change occurs (for example a log format update), follow these steps:

1. Check log version: each log file includes a `version` field (for example "0.0.1").
2. Read CHANGELOG.md: breaking changes and migration steps are documented there.
3. Use migration tool: if provided, run `diskcare migrate-logs` to update old logs to the new format.
4. Manual migration: for custom setups, see migration scripts in `scripts/` or contact maintainers.

## Example: v1 to v2 log format

- v1: `{ version: "0.0.1", ... }`
- v2: `{ version: "0.1.0", ... }` (new fields, changed structure)

## Best practices

- Always back up logs before migration
- Test migration on a copy before production
