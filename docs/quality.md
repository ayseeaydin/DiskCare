# DiskCare Quality & Testing Guide

> Living document: keep this short, practical, and enforced by tests/lint.

## Goals

- Safety-first: cleanup is safe by default; destructive actions require explicit opt-in.
- Explainability: decisions and failures should be explainable (rules + diagnostics + error codes).
- Testability: core logic is testable without touching the real filesystem or shell.
- Consistency: consistent error formatting and predictable CLI output.

---

## Dependency Injection (DI) Principles

Rule of thumb: anything that touches the outside world is injectable.

### What we inject

- CLI output: commands write through an Output interface (easy to fake in tests).
- Filesystem access in services: prefer injecting a minimal fs interface into services that read/write files.
- Shell execution: wrap command execution behind a small interface for scanners.
- Existence checks / analyzers: allow injecting pathExists / analyzer implementations for scanner-core services.

### What we do not over-abstract

- Keep interfaces minimal (only the methods you use).
- Avoid wrapper classes without a clear testing or portability reason.

---

## Error Handling Strategy

### CLI

- Commands are wrapped by a centralized error boundary.
- Errors are formatted consistently as one-line messages.
- When we know the failure class, throw a typed DiskcareError with:
  - code (stable identifier)
  - context (safe-to-print metadata)
  - cause (original error)
- --verbose prints stack trace and cause chain.

### scanner-core

- Prefer Result for recoverable failures / fallbacks.
- Prefer explainable metrics for filesystem analysis:
  - skipped + error for non-readable targets
  - partial + skippedEntries when some subpaths were skipped
- Diagnostics are surfaced to the CLI when we fall back.

### rules-engine

- Loading/validation failures throw RulesConfigError (includes filePath + cause).
- Validation uses explicit type guards for narrowing.

---

## Testing Guidelines

### Avoid real FS when possible

- Unit tests should not rely on mkdtemp, real directories, or real files.
- Prefer in-memory fakes by injecting minimal fs interfaces.

### Keep tests deterministic

- Deterministic sorting where output order matters.
- Avoid time-based flakiness (use fixed timestamps).
- For CLI E2E error flows, use test-only env vars:
  - `DISKCARE_TEST_TRASH_ERROR` to inject trash failures
  - `DISKCARE_TEST_LOG_WRITE_ERROR` to inject log write failures

### Property-based tests (where valuable)

- Use fast-check for invariants like:
  - estimated bytes never negative
  - partial analysis never results in eligible

---

## Style / Complexity Budgets

Enforced in CLI package:

- complexity (cyclomatic complexity budget)
- max-lines-per-function

If a function breaks the budget:

- Extract helpers
- Keep pure logic separate from IO orchestration

---

## Post-v1 Technical Debt

- Consolidate Result<T, E> utilities across cli and packages/\*.
- Deduplicate toErrorMessage helpers in scanner-core and cli.
