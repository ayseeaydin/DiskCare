
# DiskCare

> **Windows-only beta:** DiskCare şu anda yalnızca Windows ortamında test edilmiştir. Linux/macOS desteği için katkı ve testlere ihtiyaç vardır. Diğer platformlarda çalıştırmadan önce dikkatli olun.

> DiskCare, geliştiriciler için açıklanabilir kurallarla disk temizliği yapmayı sağlayan, güvenli ve denetlenebilir bir CLI aracıdır.

---

## 📦 Yayınlanmış NPM Paketi

DiskCare, npm üzerinde [@diskcare/cli](https://www.npmjs.com/package/@diskcare/cli) adıyla yayınlanmıştır. Herkes tarafından indirilebilir ve kullanılabilir.

### Hızlı Başlangıç

1. **Node.js (>=18) kurulu olmalı.**
2. Terminale şunu yazın:

  ```sh
  npm install -g @diskcare/cli
  ```

3. Kurulumdan sonra komut satırında:

  ```sh
  diskcare --help
  ```
  ile tüm komutları görebilirsiniz.

4. Temel kullanım örnekleri:

  ```sh
  diskcare scan
  diskcare clean
  diskcare clean --apply --no-dry-run --yes
  diskcare report
  ```

Tüm bağımlılıklar otomatik olarak kurulur. Sadece @diskcare/cli paketini yüklemeniz yeterlidir.

---

---

## Why DiskCare Exists

Over time, a developer machine silently fills up.

Caches, temp folders, build artifacts, abandoned sandboxes.
Eventually you cannot install a new program without manually hunting folders and searching:

"Can I delete this? Will my system break?"

That uncertainty costs time, focus, and confidence.

DiskCare was built to take control back.

Not by blindly deleting files, but by:

- discovering known safe targets
- analyzing them
- deciding with explicit rules
- acting only when you consciously confirm

DiskCare is designed for people who care about safety, transparency, and reproducibility.

---

## What DiskCare Does

DiskCare scans known disk-hogging locations (OS temp, npm cache, project sandboxes, etc.), analyzes them, and builds a cleaning plan using a rule engine.

Every run is:

- explainable
- logged
- reversible (Trash, not hard-delete)
- safe by default

### Core Capabilities

- Target discovery - finds common cache and temp locations
- Filesystem analysis - size, file count, age, partial or permission errors
- Rule engine - risk levels and safeAfterDays policies
- Audit logging - every run saved as structured JSON
- Safety gates - dry-run first, triple confirmation to apply
- Reports - summarize historical cleanups

---

## Safety Model (Non-Negotiable)

DiskCare is intentionally hard to misuse.

Default behavior:

```
diskcare clean
```

- builds a plan
- deletes nothing

To actually move files to Trash, all three are required:

```
diskcare clean --apply --no-dry-run --yes
```

This design prevents:

- accidental deletes
- copy-paste disasters
- automation without intent

Files are moved to Trash / Recycle Bin, not permanently removed.

---

## Example Workflow

### 1. Scan your system

```bash
diskcare scan
```

You get a structured report:

- what exists
- what was skipped
- how big each target is
- which rules apply

A JSON log is saved automatically.

---

### 2. Build a cleaning plan

```bash
diskcare clean
```

DiskCare classifies every target:

- eligible
- caution
- blocked

Each one comes with reasons.

Nothing is deleted.

---

### 3. Apply consciously

```bash
diskcare clean --apply --no-dry-run --yes
```

Eligible targets are moved to Trash.

The run is logged with:

- per-target results
- failure reasons
- estimated freed space

---

### 4. Review history

```bash
diskcare report
```

Get a summary of:

- total runs
- latest scan snapshot
- total cleaned space
- failed vs successful applies

---

## Architecture Overview

```
cli/
  commands/        -> scan, clean, report, init, config (schedule is disabled)
  cleaning/        -> plan builder
  logging/         -> atomic audit logs
  reporting/       -> historical aggregation

packages/
  scanner-core/    -> filesystem analyzers and scanners
  rules-engine/    -> policy and risk decision engine
```

### Design Principles

- deterministic outputs
- dependency injection everywhere
- testable without touching real disk
- logs as a first-class product feature

---

## Configuration

Rules are defined in `rules.json`.

Generate a starter config:

```bash
diskcare init
```

Available templates:

```bash
diskcare init --list-policies
```

Override path globally:

```bash
diskcare --config ./my-rules.json scan
```

Default behavior when config is missing:

- DiskCare continues with safe default rules (risk=caution, safeAfterDays=30)
- You will see a warning and onboarding tips in the CLI output

Custom path targets:

- You can optionally add `paths` to a rule to scan custom locations.
- Each path becomes a target under kind `custom-path` and uses the rule's id for decisions.
- Relative paths are resolved from the current working directory.

Example:

```json
{
  "id": "symlink-test",
  "risk": "safe",
  "safeAfterDays": 0,
  "description": "Custom test path",
  "paths": ["d:/diskcare/_manual/symlink-test/link.txt"]
}
```

---

## Example Rule

```json
{
  "id": "npm-cache",
  "risk": "safe",
  "safeAfterDays": 14,
  "description": "npm cache is reproducible"
}
```

Rules define:

- how risky a target is
- how old it must be before eligibility
- why it exists

---

## Logging Model

Each run produces a JSON log in `./logs/`.

They include:

- scan metrics
- clean plans
- apply results
- timestamps
- versioning

A meta pointer tracks the latest run.

This makes DiskCare usable for:

- audits
- dashboards
- automation
- long-term disk hygiene tracking

---

## Current Status

### Implemented

- Core scanning engine
- Rule-based decision system
- scan / clean / report / init / config commands
- safe-by-default apply gates
- atomic structured logging
- comprehensive automated tests

### In Progress

- additional scanners (pip, cargo, docker, browsers)
- richer report output
- scheduling implementation

---

## Non-Goals

DiskCare is not:

- a one-click "boost your PC" cleaner
- a registry optimizer
- a black-box deleter

It is a developer control tool.

---

## License

MIT

---

## Test Coverage and Safety Notes

- SandboxCacheScanner is test-only and not included in production builds.
- ScheduleCommand is a stub (coming soon); tests only verify it does not crash.
- NpmCacheScanner integration tests do not touch the real npm cache; all paths and outputs are mocked for safety and determinism.

See the related test files for details.

---

## Trash and Undo Notes

- DiskCare moves files to the OS Trash / Recycle Bin when applying.
- Restore is performed using your OS UI or tooling. There is no `diskcare restore` command yet.
- Apply is not atomic. If interrupted, some targets may be moved while others remain.

---

## Platform Support

Important: As of January 28, 2026, DiskCare has only been developed and tested on Windows 10/11.
Linux and macOS have not been tested. Treat them as unverified and expect platform-specific issues.

- Windows 10/11: supported and tested
- macOS: untested (theoretical support only)
- Linux: untested (theoretical support only)

If you test DiskCare on other platforms, please share your findings and help improve cross-platform support.

---

If DiskCare saved you from manual cleanup hell, it did its job.
