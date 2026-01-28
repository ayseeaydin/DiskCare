# DiskCare Safety Model: Triple-Gate

DiskCare never deletes files without passing three safety gates:

1. **Risk Policy Gate**: Each target is classified by risk (safe, caution, do-not-touch) via rules-engine.
2. **User Consent Gate**: Destructive actions require --apply and --yes flags. No accidental deletes.
3. **Platform/Analysis Gate**: If analysis is partial, missing, or ambiguous, status is downgraded to caution or blocked.

## How It Works

- All targets are analyzed and classified before any action.
- The clean plan reports exactly what will happen, with reasons and risk levels.
- User must explicitly confirm before any destructive action.
- Edge cases (missing metrics, partial analysis, config errors) always default to caution or blocked.
- Apply is per-target and not atomic; interruptions can leave partial results.

## Example

- A file is only deleted if: risk="safe" AND user passes --apply AND --yes AND analysis is complete.
- Otherwise, the file is reported but not deleted.

---

See docs/architecture.md for design rationale.
