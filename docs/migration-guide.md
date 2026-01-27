# DiskCare Migration Guide

## Migrating Log Formats (v1 → v2)

DiskCare uses semantic versioning for log schemas. If a breaking change occurs (e.g. log format update), follow these steps:

1. **Check Log Version**: Each log file includes a `version` field (e.g. "0.0.1").
2. **Read CHANGELOG.md**: All breaking changes and migration steps are documented.
3. **Use Migration Tool**: If provided, run `diskcare migrate-logs` to update old logs to the new format.
4. **Manual Migration**: For custom setups, see migration scripts in `scripts/` or contact maintainers.

## Example: v1 to v2 Log Format

- v1: `{ version: "0.0.1", ... }`
- v2: `{ version: "0.1.0", ... }` (new fields, changed structure)

## Best Practices

- Always back up logs before migration
- Test migration on a copy before production
- Report issues via GitHub

---

For details, see CHANGELOG.md and docs/architecture.md.
