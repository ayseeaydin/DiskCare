# DiskCare Log Schema & Versioning

## Versioning Policy

- Each log file includes a `version` field (for example "0.0.1").
- When a backward-incompatible log format change occurs, increment the version (for example "0.0.2", "0.1.0", "1.0.0").
- For each new format, add a migration function (for example `migrateV1toV2`, `migrateV2toV3`).
- Log-reading services (for example ReportService) check the version and run the migration pipeline if needed.

## Migration Pipeline

- Migration functions run in sequence so older logs are upgraded step by step to the latest format.
- Migration functions live in `src/reporting/ReportService.ts` or a dedicated module.
- Each migration guarantees a safe transition from the previous version to the next.

## Example

```js
{
  "version": "0.0.1",
  "command": "scan",
  ...
}
```

If the next format adds new fields:

```js
{
  "version": "0.0.2",
  "command": "scan",
  "newField": "...",
  ...
}
```

## Version Change and Migration Steps

1. When the log format changes, add a new migration function.
2. Bump the `version` field to the new version.
3. Add the migration function to the pipeline.
4. If needed, write a script to migrate old logs in bulk.

## Notes

- Migration functions and versioning prevent tech debt and complex fallback chains for backward compatibility.
- Update this file in every PR that changes the log schema.
