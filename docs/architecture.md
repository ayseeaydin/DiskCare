# DiskCare Architecture

## Why This Architecture?

DiskCare is designed for developer trust, safety, and extensibility. The CLI, rules engine, and scanner-core are separated for clear responsibilities:

- **CLI**: User interaction, error handling, onboarding, and progressive help.
- **Rules Engine**: Policy-driven risk and eligibility logic, custom rule support.
- **Scanner Core**: Platform-specific file analysis, metrics, and target discovery.

### Rationale

- **Safety-first**: All destructive actions are gated by explicit user consent and risk analysis.
- **Extensibility**: New rules, targets, and output formats can be added without breaking existing flows.
- **Testability**: Each layer is independently testable, with property-based and E2E tests.
- **Backward Compatibility**: Log schema versioning and migration pipeline ensure old logs remain usable.

## Key Design Decisions

- Triple-gate safety model (see safety-model.md)
- Feature flags for incomplete/experimental features
- Local-only analytics for privacy
- Semantic versioning for all breaking changes

---

For implementation details, see the source code and docs/safety-model.md.
