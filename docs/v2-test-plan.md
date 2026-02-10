# DiskCare v2 Test Plan

## Overview

Testing strategy for v2 follows a layered approach:

1. **Unit tests**: Individual scanner logic, path resolution
2. **Integration tests**: Scanner registry, config loading, safety gates
3. **E2E tests**: Full CLI workflows, JSON output validation
4. **Determinism tests**: Reproducible scans, stable ordering

---

## 1. Unit Tests

### 1.1 Scanner Tests

**Location**: `packages/scanner-core/src/scanners/__tests__/`

```typescript
// VSCodeCacheScanner.test.ts
import { describe, it, expect } from "node:test";
import { VSCodeCacheScanner } from "../VSCodeCacheScanner.js";
import type { Scanner } from "../BaseScanner.js";

describe("VSCodeCacheScanner", () => {
  it("should discover VS Code cache on Windows", async () => {
    const scanner: Scanner = new VSCodeCacheScanner("cache", {
      platform: "win32",
      homedir: "C:\\Users\\testuser",
      env: { APPDATA: "C:\\Users\\testuser\\AppData\\Roaming" },
    });

    const targets = await scanner.scan();

    expect(targets.length).toBe(1);
    expect(targets[0].id).toBe("vscode-cache");
    expect(targets[0].path).toContain("Code\\Cache\\Cache_Data");
    expect(targets[0].displayName).toBe("VS Code Cache");
    expect(targets[0].evidence).toContain("Matched VS Code cache pattern");
  });

  it("should return empty array on unsupported platform", async () => {
    const scanner: Scanner = new VSCodeCacheScanner("cache", {
      platform: "freebsd" as NodeJS.Platform,
      homedir: "/home/testuser",
    });

    const targets = await scanner.scan();
    expect(targets.length).toBe(0);
  });

  it("should NOT throw on missing paths", async () => {
    const scanner: Scanner = new VSCodeCacheScanner("cache", {
      platform: "win32",
      homedir: "C:\\NonExistent",
    });

    // Should not throw - just return discovered path (exists=false later)
    const targets = await scanner.scan();
    expect(targets.length).toBeGreaterThan(0);
  });

  it("should include diagnostics in output", async () => {
    const scanner = new VSCodeCacheScanner("cache");
    const targets = await scanner.scan();

    if (targets.length > 0) {
      expect(targets[0].diagnostics).toBeDefined();
      expect(targets[0].diagnostics).toContain("v2 scan-only: discovered but never auto-deleted");
    }
  });
});

// RepoLocalCacheScanner.test.ts
describe("RepoLocalCacheScanner", () => {
  it("should return empty array without cwd", async () => {
    const scanner = new RepoLocalCacheScanner();
    const targets = await scanner.scan();

    expect(targets.length).toBe(0); // v2 philosophy: never global scan
  });

  it("should discover .next/cache with cwd", async () => {
    const scanner = new RepoLocalCacheScanner({
      cwd: "/path/to/project",
      platform: "linux",
    });

    const targets = await scanner.scan();

    expect(targets.length).toBeGreaterThan(0);
    const nextCache = targets.find((t) => t.id === "nextjs-cache");
    expect(nextCache).toBeDefined();
    expect(nextCache?.path).toBe("/path/to/project/.next/cache");
  });

  it("should include repo-local diagnostics", async () => {
    const scanner = new RepoLocalCacheScanner({ cwd: "/test" });
    const targets = await scanner.scan();

    targets.forEach((target) => {
      expect(target.diagnostics).toContain("repo-local: requires --cwd flag");
    });
  });
});
```

### 1.2 Path Resolver Tests

```typescript
// PathResolver.test.ts
import { describe, it, expect } from "node:test";
import { PathResolver } from "../pathResolver.js";

describe("PathResolver", () => {
  describe("Windows paths", () => {
    it("should use backslashes", () => {
      const resolver = new PathResolver("win32");
      const result = resolver.join("C:", "Users", "test", "AppData");
      expect(result).toBe("C:\\Users\\test\\AppData");
    });

    it("should normalize forward slashes", () => {
      const resolver = new PathResolver("win32");
      const result = resolver.normalize("C:/Users/test");
      expect(result).toBe("C:\\Users\\test");
    });
  });

  describe("Unix paths", () => {
    it("should use forward slashes", () => {
      const resolver = new PathResolver("linux");
      const result = resolver.join("/home", "test", ".cache");
      expect(result).toBe("/home/test/.cache");
    });

    it("should normalize backslashes", () => {
      const resolver = new PathResolver("darwin");
      const result = resolver.normalize("\\home\\test");
      expect(result).toBe("/home/test");
    });
  });
});
```

### 1.3 Artifact Catalog Tests

```typescript
// ArtifactCatalog.test.ts
import { describe, it, expect } from "node:test";
import {
  getArtifactById,
  getArtifactsByCategory,
  getCleanableArtifacts,
  getScanOnlyArtifacts,
  checkPreconditions,
} from "../ArtifactCatalog.js";

describe("ArtifactCatalog", () => {
  it("should find artifact by id", () => {
    const artifact = getArtifactById("npm-cache");
    expect(artifact).toBeDefined();
    expect(artifact?.displayName).toBe("npm Cache Directory");
    expect(artifact?.action).toBe("cleanable");
  });

  it("should return undefined for unknown id", () => {
    const artifact = getArtifactById("nonexistent-artifact");
    expect(artifact).toBeUndefined();
  });

  it("should filter artifacts by category", () => {
    const browsers = getArtifactsByCategory("browsers");
    expect(browsers.length).toBeGreaterThan(0);
    expect(browsers.every((a) => a.category === "browsers")).toBe(true);
  });

  it("should separate cleanable from scan-only", () => {
    const cleanable = getCleanableArtifacts();
    const scanOnly = getScanOnlyArtifacts();

    expect(cleanable.every((a) => a.action === "cleanable")).toBe(true);
    expect(scanOnly.every((a) => a.action === "scan-only")).toBe(true);

    // v1 artifacts are cleanable
    expect(cleanable.some((a) => a.id === "npm-cache")).toBe(true);
    expect(cleanable.some((a) => a.id === "os-temp")).toBe(true);

    // v2 artifacts are scan-only
    expect(scanOnly.some((a) => a.id === "vscode-cache")).toBe(true);
  });

  it("should check preconditions", () => {
    const repoArtifact = getArtifactById("repo-local-nextjs");
    const result = checkPreconditions(repoArtifact!, { cwd: undefined });

    expect(result.met).toBe(false);
    expect(result.missing).toContain("requiresCwd");
  });
});
```

---

## 2. Integration Tests

### 2.1 Scanner Registry Tests

```typescript
// ScannerRegistry.test.ts
import { describe, it, expect, beforeEach } from "node:test";
import { ScannerRegistry } from "../ScannerRegistry.js";
import type { Scanner, DiscoveredTarget } from "../types/ScanTarget.js";

describe("ScannerRegistry", () => {
  let registry: ScannerRegistry;

  beforeEach(() => {
    registry = new ScannerRegistry();
  });

  it("should register scanner successfully", () => {
    registry.register({
      id: "test-scanner",
      artifacts: [],
      factory: () => createMockScanner([]),
      enabled: true,
    });

    expect(registry.get("test-scanner")).toBeDefined();
  });

  it("should throw on duplicate registration", () => {
    registry.register({
      id: "test-scanner",
      artifacts: [],
      factory: () => createMockScanner([]),
      enabled: true,
    });

    expect(() => {
      registry.register({
        id: "test-scanner",
        artifacts: [],
        factory: () => createMockScanner([]),
        enabled: true,
      });
    }).toThrow("Scanner already registered");
  });

  it("should apply config to enable/disable scanners", () => {
    registry.register({
      id: "scanner-a",
      artifacts: [],
      factory: () => createMockScanner([]),
      enabled: true,
    });

    registry.applyConfig({
      scanners: {
        "scanner-a": { enabled: false },
      },
      globalExcludePaths: [],
    });

    const enabled = registry.getEnabled();
    expect(enabled.some((e) => e.id === "scanner-a")).toBe(false);
  });

  it("should run all enabled scanners in parallel", async () => {
    registry.register({
      id: "scanner-1",
      artifacts: [],
      factory: () =>
        createMockScanner([
          { id: "target-1", kind: "custom-path", path: "/path1", displayName: "T1" },
        ]),
      enabled: true,
    });

    registry.register({
      id: "scanner-2",
      artifacts: [],
      factory: () =>
        createMockScanner([
          { id: "target-2", kind: "custom-path", path: "/path2", displayName: "T2" },
        ]),
      enabled: true,
    });

    const targets = await registry.scanAll();

    expect(targets.length).toBe(2);
    expect(targets.some((t) => t.id === "target-1")).toBe(true);
    expect(targets.some((t) => t.id === "target-2")).toBe(true);
  });

  it("should handle scanner failures gracefully", async () => {
    registry.register({
      id: "good-scanner",
      artifacts: [],
      factory: () =>
        createMockScanner([{ id: "t1", kind: "custom-path", path: "/p1", displayName: "T1" }]),
      enabled: true,
    });

    registry.register({
      id: "bad-scanner",
      artifacts: [],
      factory: () => ({
        scan: async () => {
          throw new Error("Scanner failed");
        },
      }),
      enabled: true,
    });

    // Should not throw - returns partial results
    const targets = await registry.scanAll();

    expect(targets.length).toBe(1); // Only good scanner's result
    expect(targets[0].id).toBe("t1");
  });
});

function createMockScanner(targets: DiscoveredTarget[]): Scanner {
  return {
    scan: async () => targets,
  };
}
```

### 2.2 Safety Gate Tests

```typescript
// SafetyGate.test.ts
import { describe, it, expect } from "node:test";
import { SafetyGate } from "../SafetyGate.js";
import { getArtifactById } from "../ArtifactCatalog.js";

describe("SafetyGate", () => {
  it("should pass check for artifact without preconditions", () => {
    const gate = new SafetyGate();
    const artifact = getArtifactById("npm-cache");
    const result = gate.checkPreconditions(artifact!);

    expect(result.safe).toBe(true);
    expect(result.shouldSkip).toBe(false);
    expect(result.warnings.length).toBe(0);
  });

  it("should warn about missing cwd for repo-local", () => {
    const gate = new SafetyGate(); // No cwd
    const artifact = getArtifactById("repo-local-nextjs");
    const result = gate.checkPreconditions(artifact!);

    expect(result.shouldSkip).toBe(true);
    expect(result.warnings.some((w) => w.includes("requires --cwd"))).toBe(true);
  });

  it("should pass check when cwd is provided", () => {
    const gate = new SafetyGate({ cwd: "/test/project" });
    const artifact = getArtifactById("repo-local-nextjs");
    const result = gate.checkPreconditions(artifact!);

    expect(result.shouldSkip).toBe(false);
  });

  it("should warn about running processes", async () => {
    const mockProcessChecker = {
      checkRunning: async (names: string[]) => names, // All running
    };

    const gate = new SafetyGate({
      processChecker: mockProcessChecker,
    });

    const artifact = getArtifactById("vscode-cache");
    const target = {
      id: "vscode-cache",
      kind: "custom-path" as const,
      path: "/path/to/cache",
      displayName: "VS Code Cache",
      exists: true,
    };

    const result = await gate.validateTarget(target, artifact);

    expect(result.warnings.some((w) => w.includes("running"))).toBe(true);
    expect(result.safe).toBe(true); // Warn but don't block
  });
});
```

### 2.3 Config Loading Tests

```typescript
// ScannerConfig.test.ts
import { describe, it, expect } from "node:test";
import { loadScannerConfig, mergeScannerConfig } from "../ScannerConfig.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

describe("ScannerConfig", () => {
  it("should return default config when no file exists", () => {
    const config = loadScannerConfig("/nonexistent/path/scanners.json");

    expect(config.scanners).toBeDefined();
    expect(config.scanners["npm-cache"]?.enabled).toBe(true);
    expect(config.globalExcludePaths).toContain("**/node_modules/**");
  });

  it("should load valid config file", () => {
    const tmpFile = path.join(tmpdir(), `test-config-${Date.now()}.json`);
    fs.writeFileSync(
      tmpFile,
      JSON.stringify({
        scanners: {
          "npm-cache": { enabled: false },
        },
        globalExcludePaths: ["**/test/**"],
      }),
    );

    try {
      const config = loadScannerConfig(tmpFile);

      expect(config.scanners["npm-cache"]?.enabled).toBe(false);
      expect(config.globalExcludePaths).toContain("**/test/**");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("should merge user config with defaults", () => {
    const merged = mergeScannerConfig({
      scanners: {
        "vscode-cache": { enabled: false },
      },
      globalExcludePaths: ["**/custom/**"],
    });

    expect(merged.scanners["npm-cache"]?.enabled).toBe(true); // Default
    expect(merged.scanners["vscode-cache"]?.enabled).toBe(false); // Override
    expect(merged.globalExcludePaths).toContain("**/node_modules/**"); // Default
    expect(merged.globalExcludePaths).toContain("**/custom/**"); // User
  });
});
```

---

## 3. E2E Tests

### 3.1 Inventory Command Tests

```typescript
// inventory.e2e.test.ts
import { describe, it, expect } from "node:test";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

describe("diskcare inventory (E2E)", () => {
  it("should discover artifacts and output human-readable format", async () => {
    const { stdout } = await execAsync("node cli/dist/index.js inventory");

    expect(stdout).toContain("DiskCare Artifact Inventory");
    expect(stdout).toContain("Total:");
    expect(stdout).toContain("artifact(s)");
    expect(stdout).toContain("This is inventory mode - no files are deleted");
  });

  it("should output valid JSON with schemaVersion", async () => {
    const { stdout } = await execAsync("node cli/dist/index.js inventory --json");
    const output = JSON.parse(stdout);

    expect(output.schemaVersion).toBe("0.1");
    expect(output.command).toBe("inventory");
    expect(output.timestamp).toBeDefined();
    expect(output.categories).toBeInstanceOf(Array);
    expect(output.summary).toBeDefined();
    expect(output.summary.totalTargets).toBeGreaterThan(0);
  });

  it("should filter by category", async () => {
    const { stdout } = await execAsync(
      "node cli/dist/index.js inventory --category browsers --json",
    );
    const output = JSON.parse(stdout);

    expect(output.categories.length).toBeGreaterThanOrEqual(0);
    output.categories.forEach((cat: any) => {
      expect(cat.category).toBe("browsers");
    });
  });

  it("should include repo-local with cwd", async () => {
    const { stdout } = await execAsync("node cli/dist/index.js inventory --cwd . --json");
    const output = JSON.parse(stdout);

    // Should have custom category with node_modules/.cache etc
    const customCat = output.categories.find((c: any) => c.category === "custom");
    expect(customCat).toBeDefined();
  });

  it("should respect scanner config", async () => {
    // Create temp config disabling all v2 scanners
    const configContent = {
      scanners: {
        "chrome-cache": { enabled: false },
        "chrome-code-cache": { enabled: false },
        "chrome-gpu-cache": { enabled: false },
        "edge-cache": { enabled: false },
        "edge-code-cache": { enabled: false },
        "edge-gpu-cache": { enabled: false },
        "brave-cache": { enabled: false },
        "brave-code-cache": { enabled: false },
        "brave-gpu-cache": { enabled: false },
        "firefox-cache": { enabled: false },
        "vscode-cache": { enabled: false },
        "vscode-cached-data": { enabled: false },
        "vscode-gpu-cache": { enabled: false },
      },
      globalExcludePaths: [],
    };

    require("fs").writeFileSync("config/scanners.json", JSON.stringify(configContent));

    try {
      const { stdout } = await execAsync("node cli/dist/index.js inventory --json");
      const output = JSON.parse(stdout);

      // Should only have v1 artifacts (os-temp, npm-cache)
      const browserCat = output.categories.find((c: any) => c.category === "browsers");
      expect(browserCat).toBeUndefined();
    } finally {
      // Restore default config
      require("fs").unlinkSync("config/scanners.json");
    }
  });
});
```

### 3.2 JSON Schema Validation

```typescript
// jsonSchema.e2e.test.ts
import { describe, it, expect } from "node:test";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import Ajv from "ajv";

const execAsync = promisify(exec);

describe("JSON Schema validation", () => {
  it("should produce output conforming to schema", async () => {
    const { stdout } = await execAsync("node cli/dist/index.js inventory --json");
    const output = JSON.parse(stdout);

    const schema = require("../config/artifacts.schema.json");
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(output);

    if (!valid) {
      console.error("Validation errors:", validate.errors);
    }

    expect(valid).toBe(true);
  });
});
```

---

## 4. Determinism Tests

### 4.1 Scan Reproducibility

```typescript
// determinism.test.ts
import { describe, it, expect } from "node:test";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

describe("Scan determinism", () => {
  it("should produce identical results on repeated scans", async () => {
    const { stdout: run1 } = await execAsync("node cli/dist/index.js inventory --json");
    const { stdout: run2 } = await execAsync("node cli/dist/index.js inventory --json");

    const output1 = JSON.parse(run1);
    const output2 = JSON.parse(run2);

    // Ignore timestamp (expected to differ)
    delete output1.timestamp;
    delete output2.timestamp;

    // Target counts should be identical
    expect(output1.summary.totalTargets).toBe(output2.summary.totalTargets);
    expect(output1.categories.length).toBe(output2.categories.length);

    // Paths should be identical
    const paths1 = extractPaths(output1);
    const paths2 = extractPaths(output2);
    expect(paths1.sort()).toEqual(paths2.sort());
  });

  it("should maintain stable ordering within categories", async () => {
    const { stdout } = await execAsync("node cli/dist/index.js inventory --json");
    const output = JSON.parse(stdout);

    for (const category of output.categories) {
      const sizes = category.targets.map((t: any) => t.metrics.totalBytes);

      // Targets should be ordered by size (descending)
      const sorted = [...sizes].sort((a, b) => b - a);
      expect(sizes).toEqual(sorted);
    }
  });
});

function extractPaths(output: any): string[] {
  const paths: string[] = [];
  for (const category of output.categories) {
    for (const target of category.targets) {
      paths.push(target.path);
    }
  }
  return paths;
}
```

### 4.2 Log Determinism

```typescript
// logDeterminism.test.ts
import { describe, it, expect } from "node:test";
import { readFileSync, readdirSync } from "node:fs";

describe("Log file determinism", () => {
  it("should write logs with consistent format", () => {
    const logFiles = readdirSync("logs")
      .filter((f) => f.startsWith("run-"))
      .map((f) => `logs/${f}`);

    expect(logFiles.length).toBeGreaterThan(0);

    for (const logFile of logFiles) {
      const log = JSON.parse(readFileSync(logFile, "utf-8"));

      // Every log must have these fields
      expect(log.timestamp).toBeDefined();
      expect(log.command).toBeDefined();
      expect(log.duration).toBeDefined();
      expect(log.result).toBeDefined();

      // Timestamps should be ISO 8601
      expect(() => new Date(log.timestamp)).not.toThrow();
    }
  });

  it("should generate unique log filenames", () => {
    const logFiles = readdirSync("logs").filter((f) => f.startsWith("run-"));
    const uniqueFiles = new Set(logFiles);

    expect(logFiles.length).toBe(uniqueFiles.size);
  });
});
```

---

## 5. Performance Tests

```typescript
// performance.test.ts
import { describe, it, expect } from "node:test";
import { performance } from "node:perf_hooks";
import { scanAllV2 } from "../scanning/scanAllV2.js";

describe("Performance benchmarks", () => {
  it("should complete full scan in under 5 seconds", async () => {
    const start = performance.now();

    await scanAllV2({ cwd: process.cwd(), output: console });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5000); // 5 seconds
  });

  it("should run scanners in parallel", async () => {
    // Mock scanners with artificial delay
    const registry = new ScannerRegistry();

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    registry.register({
      id: "slow-1",
      artifacts: [],
      factory: () => ({
        scan: async () => {
          await delay(100);
          return [];
        },
      }),
      enabled: true,
    });

    registry.register({
      id: "slow-2",
      artifacts: [],
      factory: () => ({
        scan: async () => {
          await delay(100);
          return [];
        },
      }),
      enabled: true,
    });

    const start = performance.now();
    await registry.scanAll();
    const duration = performance.now() - start;

    // If sequential: 200ms, if parallel: ~100ms
    expect(duration).toBeLessThan(150); // Parallel execution
  });
});
```

---

## 6. Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --test-name-pattern="Scanner"

# Run with coverage
npm test -- --experimental-test-coverage

# Run E2E tests only
npm run test:e2e

# Run determinism tests
npm run test:determinism
```

### Test Configuration

```json
// package.json
{
  "scripts": {
    "test": "node --test **/__tests__/**/*.test.ts",
    "test:e2e": "node --test **/__tests__/**/*.e2e.test.ts",
    "test:determinism": "node --test **/__tests__/**/determinism.test.ts",
    "test:coverage": "node --test --experimental-test-coverage"
  }
}
```

---

## 7. Quality Gates

All PRs must pass:

1. ✅ **Unit tests**: 100% of scanner tests passing
2. ✅ **Integration tests**: Registry, config, safety gates
3. ✅ **E2E tests**: CLI commands produce valid JSON
4. ✅ **Determinism**: Repeated scans produce identical results
5. ✅ **Linting**: 0 ESLint errors
6. ✅ **Type checking**: 0 TypeScript errors
7. ✅ **Schema validation**: JSON output conforms to schema

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest, macos-latest]
        node: [18, 20, 22]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}

      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - run: npm test
      - run: npm run test:e2e
      - run: npm run test:determinism
```

---

## Summary

- **Unit tests**: Scanner/path/catalog logic (fast, isolated)
- **Integration tests**: Registry/config/safety (medium, mocked deps)
- **E2E tests**: Full CLI workflows (slow, real filesystem)
- **Determinism tests**: Reproducible results (critical for trust)

**Test coverage goal**: >80% for scanner-core, >60% for CLI commands
