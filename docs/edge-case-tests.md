# Edge Case Tests

Happy-path tests are not enough. DiskCare must cover worst-case scenarios and fallback chains with first-class tests.

## Principles

- Ask: "What is the worst-case scenario?" Then test it.
- Every new feature should include edge case coverage.

## Examples

- Partial analysis when subpaths are unreadable
- Permission denied during scanning or apply
- Paths that disappear between scan and apply
- Signals or interrupts during apply

## Trash safety audit (manual checklist)

- Symlink target cleanup (ensure the link is trashed, not the target)
- Permission denied cases (read-only folders, protected system paths)
- UNC paths on Windows (if supported by the platform and environment)
- Full Trash / Recycle Bin behavior (verify error handling and messaging)

---

See related test files and docs/safety-model.md for more examples.
