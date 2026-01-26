# DiskCare

> **Developer‑focused disk hygiene CLI** — analyze, plan, and safely clean cache & temp files with explainable rules and audit logs.

---

## Why DiskCare Exists

Over time, a developer machine silently fills up.

Caches, temp folders, build artifacts, abandoned sandboxes…
Eventually you can’t install a new program without manually hunting folders and googling:

> “Can I delete this? Will my system break?”

That uncertainty costs time, focus, and confidence. The computer starts to feel _out of control_.

**DiskCare was built to take control back.**

Not by blindly deleting files — but by:

- discovering known safe targets,
- analyzing them,
- deciding with explicit rules,
- and acting only when you consciously confirm.

DiskCare is designed for people who care about **safety, transparency, and reproducibility**.

---

## What DiskCare Does

DiskCare scans known disk‑hogging locations (OS temp, npm cache, project sandboxes, etc.), analyzes them, and builds a **cleaning plan** using a **rule engine**.

Every run is:

- explainable,
- logged,
- reversible (Trash, not hard‑delete),
- and safe‑by‑default.

### Core Capabilities

- 🔍 **Target discovery** – finds common cache & temp locations
- 📊 **Filesystem analysis** – size, file count, age, partial/permission errors
- 🧠 **Rule engine** – risk levels + safeAfterDays policies
- 📝 **Audit logging** – every run saved as structured JSON
- 🛡 **Safety gates** – dry‑run first, triple‑confirmation to apply
- 📈 **Reports** – summarize historical cleanups

---

## Safety Model (Non‑Negotiable)

DiskCare is intentionally hard to misuse.

Default behavior:

```
diskcare clean
```

➡ builds a plan
➡ deletes nothing

To actually move files to Trash, **all three** are required:

```
diskcare clean --apply --no-dry-run --yes
```

This design prevents:

- accidental deletes
- copy‑paste disasters
- automation without intent

Files are moved to **Trash / Recycle Bin**, not permanently removed.

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

- `eligible`
- `caution`
- `blocked`

Each one comes with **reasons**.

Nothing is deleted.

---

### 3. Apply consciously

```bash
diskcare clean --apply --no-dry-run --yes
```

Eligible targets are moved to Trash.

The run is logged with:

- per‑target results
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
  commands/        → scan, clean, report, init, config, schedule
  cleaning/        → plan builder
  logging/         → atomic audit logs
  reporting/       → historical aggregation

packages/
  scanner-core/    → filesystem analyzers & scanners
  rules-engine/   → policy & risk decision engine
```

### Design Principles

- deterministic outputs
- dependency injection everywhere
- testable without touching real disk
- logs as a first‑class product feature

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
- long‑term disk hygiene tracking

---

## Current Status

### Implemented

- Core scanning engine
- Rule‑based decision system
- scan / clean / report / init / config commands
- safe‑by‑default apply gates
- atomic structured logging
- comprehensive automated tests

### In Progress

- additional scanners (pip, cargo, docker, browsers)
- richer report output
- scheduling implementation

---

## Non‑Goals

DiskCare is **not**:

- a one‑click “boost your PC” cleaner
- a registry optimizer
- a black‑box deleter

It is a **developer control tool**.

---

## Philosophy

Your machine should not slowly become an unknown territory.

DiskCare treats disk cleanup as an engineering problem:
observable, explainable, versioned, and safe.

---

## License

MIT

---

## Test Coverage & Safety Notes

- **SandboxCacheScanner**: Sadece test ortamında kullanılır, production'da gerçek .sandbox-cache hedefi yoktur.
- **ScheduleCommand**: Komutun kendisi stub'dur ("coming soon"), testler sadece CLI'nın çökmediğini ve doğru mesajı verdiğini doğrular.
- **NpmCacheScanner ve entegrasyon testleri**: Gerçek npm cache'e erişilmez, tüm yollar ve çıktılar izole/mocked olarak test edilir. Bu, güvenlik ve deterministik testler için zorunludur.

Daha fazla bilgi için ilgili test dosyalarındaki açıklamalara bakınız.

---

## Platform Support

> **Important:** As of January 2026, DiskCare has only been developed and tested on Windows 10/11.
> Linux and macOS have not been tested at all. There may be platform-specific path/behavior issues or compatibility gaps.

- **Windows 10/11:** Fully supported and tested.
- **macOS:** Theoretical support exists, but it has never been tested. Manual verification is needed for macOS-specific paths (e.g., `~/Library/Application Support`).
- **Linux:** Theoretical support exists, but it has never been tested. Path and permission differences may occur across distributions.

**Contributions are welcome!** If you test DiskCare on other platforms, please share your findings and help improve cross-platform support.

---

If you use DiskCare and it saved you from manual cleanup hell — the product did its job.
