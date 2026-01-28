# DiskCare Code Review Checklist

Use this checklist for every PR or major commit:

## User Experience

- [ ] Are all user-facing error messages actionable and empathetic?
- [ ] Is CLI help output clear and progressive?

## Documentation

- [ ] Are new magic numbers documented with rationale?
- [ ] Are breaking changes explained in CHANGELOG.md?
- [ ] Is README updated for new features or changes?
- [ ] Are platform-specific behaviors documented?

## Testing

- [ ] Are edge cases and worst-case scenarios covered by tests?
- [ ] Are new features covered by property-based and E2E tests?
- [ ] Is backward compatibility tested (old logs, config, etc.)?
- [ ] Is the CLI binary tested via `npm link` or `npx diskcare --help`?

## Safety & Privacy

- [ ] Are destructive actions gated by triple safety model?
- [ ] Is telemetry privacy-first and local-only?

## Versioning

- [ ] Is semantic versioning followed for all breaking changes?
- [ ] Is log schema version updated if format changes?

---

Ask: "Six months from now, what questions will someone have when reading this code?" Document the answers.
