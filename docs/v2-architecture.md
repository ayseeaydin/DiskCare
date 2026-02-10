# DiskCare v2 Architecture Documentation

## 1. Monorepo Structure

```
diskcare/
├── packages/
│   ├── shared-utils/          # Cross-cutting utilities
│   │   ├── src/
│   │   │   ├── config/        # Configuration loaders
│   │   │   │   └── ScannerConfig.ts
│   │   │   ├── system/        # System-level checks
│   │   │   │   ├── ProcessChecker.ts
│   │   │   │   └── PermissionChecker.ts
│   │   │   ├── pathResolver.ts
│   │   │   ├── result.ts
│   │   │   └── errorMessage.ts
│   │   └── package.json
│   │
│   ├── scanner-core/          # v2 Scanner infrastructure
│   │   ├── src/
│   │   │   ├── catalog/       # Artifact metadata
│   │   │   │   └── ArtifactCatalog.ts
│   │   │   ├── registry/      # Plugin system
│   │   │   │   └── ScannerRegistry.ts
│   │   │   ├── scanners/      # Scanner implementations
│   │   │   │   ├── BaseScanner.ts
│   │   │   │   ├── OsTempScanner.ts (v1)
│   │   │   │   ├── NpmCacheScanner.ts (v1)
│   │   │   │   ├── ChromiumCacheScanner.ts (v2)
│   │   │   │   ├── FirefoxCacheScanner.ts (v2)
│   │   │   │   ├── VSCodeCacheScanner.ts (v2)
│   │   │   │   ├── JetBrainsCacheScanner.ts (v2)
│   │   │   │   ├── PipCacheScanner.ts (v2)
│   │   │   │   └── RepoLocalCacheScanner.ts (v2)
│   │   │   ├── safety/        # Safety validation
│   │   │   │   └── SafetyGate.ts
│   │   │   ├── analyzers/
│   │   │   │   └── FileSystemAnalyzer.ts
│   │   │   ├── types/
│   │   │   │   ├── ScanTarget.ts
│   │   │   │   └── ScanMetrics.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── rules-engine/          # Risk assessment & cleanup rules
│   │   └── (existing structure)
│   │
│   └── cli/                   # User-facing CLI
│       ├── src/
│       │   ├── commands/
│       │   │   ├── ScanCommand.ts (v1)
│       │   │   ├── CleanCommand.ts (v1)
│       │   │   ├── ReportCommand.ts (v1)
│       │   │   └── InventoryCommand.ts (v2 NEW)
│       │   ├── scanning/
│       │   │   ├── scanAll.ts (v1)
│       │   │   └── scanAllV2.ts (v2 NEW)
│       │   └── index.ts
│       └── package.json
│
├── config/                    # User-facing configuration
│   ├── rules.json            # v1 cleanup rules
│   ├── rules.manual.json     # v1 user overrides
│   ├── scanners.json         # v2 NEW: scanner enable/disable
│   └── artifacts.schema.json # v2 NEW: JSON Schema
│
├── docs/
│   ├── architecture.md       # System design
│   ├── rules-engine.md
│   ├── safety-model.md
│   ├── v2-inventory-mode.md  # NEW: v2 documentation
│   └── v2-scanner-api.md     # NEW: Plugin development
│
└── logs/                     # Execution logs
    └── run-*.json

```

### Rationale for Structure

1. **`shared-utils/`**: Platform-agnostic utilities (path resolution, config loading, system checks)
2. **`scanner-core/`**: v2 plugin infrastructure - isolated from CLI for reusability
3. **`rules-engine/`**: v1 risk assessment - kept separate for backwards compatibility
4. **`cli/`**: User interface - orchestrates scanner-core + rules-engine
5. **`config/`**: User-editable configs at root for discoverability

---

## 2. Artifact Catalog v0.1

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://diskcare.dev/schemas/artifacts/v0.1.json",
  "title": "DiskCare Artifact Catalog",
  "description": "Metadata for discoverable cache and temporary file artifacts",
  "type": "object",
  "required": ["schemaVersion", "artifacts"],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$",
      "description": "Catalog schema version (e.g., '0.1')"
    },
    "artifacts": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/Artifact"
      }
    }
  },
  "definitions": {
    "Artifact": {
      "type": "object",
      "required": ["id", "displayName", "category", "scope", "action", "risk"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9-]+$",
          "description": "Unique identifier (kebab-case)"
        },
        "displayName": {
          "type": "string",
          "description": "Human-readable name"
        },
        "category": {
          "type": "string",
          "enum": [
            "os-temp",
            "browsers",
            "ides",
            "language-caches",
            "build-tools",
            "repo-local",
            "diagnostics",
            "custom"
          ]
        },
        "scope": {
          "type": "string",
          "enum": ["global", "repo-local"],
          "description": "Scan scope"
        },
        "action": {
          "type": "string",
          "enum": ["cleanable", "scan-only"],
          "description": "v1 cleanable or v2 scan-only"
        },
        "risk": {
          "type": "string",
          "enum": ["safe", "caution", "dangerous"],
          "description": "Risk level for cleanup operations"
        },
        "scannerClass": {
          "type": "string",
          "description": "TypeScript class name implementing Scanner interface"
        },
        "preconditions": {
          "type": "object",
          "properties": {
            "requiresCwd": {
              "type": "boolean",
              "description": "Requires --cwd flag (repo-local artifacts)"
            },
            "requiresElevated": {
              "type": "boolean",
              "description": "Requires admin/root privileges"
            },
            "requiresProcessStopped": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Process names that should be stopped"
            },
            "platforms": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": ["win32", "darwin", "linux"]
              }
            }
          }
        },
        "metadata": {
          "type": "object",
          "description": "Additional artifact-specific metadata"
        }
      }
    }
  }
}
```

### Example: artifacts.json (Catalog Data)

```json
{
  "schemaVersion": "0.1",
  "artifacts": [
    {
      "id": "npm-cache",
      "displayName": "npm Cache Directory",
      "category": "language-caches",
      "scope": "global",
      "action": "cleanable",
      "risk": "safe",
      "scannerClass": "NpmCacheScanner",
      "preconditions": {
        "platforms": ["win32", "darwin", "linux"]
      },
      "metadata": {
        "safeAfterDays": 14,
        "reproducible": true
      }
    },
    {
      "id": "vscode-cache",
      "displayName": "VS Code Cache",
      "category": "ides",
      "scope": "global",
      "action": "scan-only",
      "risk": "caution",
      "scannerClass": "VSCodeCacheScanner",
      "preconditions": {
        "requiresProcessStopped": ["code.exe", "code"],
        "platforms": ["win32", "darwin", "linux"]
      },
      "metadata": {
        "cachePath": "Code/Cache/Cache_Data",
        "rebuildsOnStartup": true
      }
    },
    {
      "id": "repo-local-nextjs",
      "displayName": "Next.js Build Cache",
      "category": "repo-local",
      "scope": "repo-local",
      "action": "scan-only",
      "risk": "safe",
      "scannerClass": "RepoLocalCacheScanner",
      "preconditions": {
        "requiresCwd": true
      },
      "metadata": {
        "pattern": ".next/cache",
        "purpose": "Build optimization cache"
      }
    }
  ]
}
```

---

## 3. Scanner Plugin Interface & Registry Pattern

### BaseScanner Interface

```typescript
/**
 * Scanner interface for discovering artifacts.
 * All scanners MUST implement this interface.
 */
export interface Scanner {
  /**
   * Discover artifacts on the system.
   * Returns array of discovered targets (may be empty if nothing found).
   * MUST NOT throw on missing paths - return empty array instead.
   */
  scan(): Promise<DiscoveredTarget[]>;
}

/**
 * Discovered target metadata.
 * Returned by Scanner.scan() before filesystem analysis.
 */
export interface DiscoveredTarget {
  /**
   * Artifact ID from catalog (e.g., "vscode-cache").
   */
  id: string;

  /**
   * Target kind for backwards compatibility.
   */
  kind: ScanTargetKind;

  /**
   * Absolute path to artifact.
   */
  path: string;

  /**
   * Display name for UI.
   */
  displayName: string;

  /**
   * Diagnostic messages (warnings, notes, etc.).
   */
  diagnostics?: string[];

  /**
   * Evidence explaining why this target matched.
   * Example: "Matched pattern: C:/Users/*/AppData/Local/Temp"
   */
  evidence?: string;
}

/**
 * Enriched scan target (after filesystem analysis).
 */
export interface ScanTarget extends DiscoveredTarget {
  /**
   * Whether path exists on filesystem.
   */
  exists: boolean;

  /**
   * Filesystem metrics (size, file count, errors).
   */
  metrics: ScanMetrics;
}
```

### Scanner Implementation Example

```typescript
/**
 * VS Code Cache Scanner (v2 scan-only)
 * 
 * Discovers VS Code cache directories.
 * Action: scan-only (never auto-deleted)
 * Risk: caution (rebuilding is expensive)
 */
export class VSCodeCacheScanner implements Scanner {
  constructor(
    private readonly cacheType: 'cache' | 'cached-data' | 'gpu-cache',
    private readonly deps?: {
      platform?: NodeJS.Platform;
      env?: NodeJS.ProcessEnv;
      homedir?: string;
    }
  ) {}

  async scan(): Promise<DiscoveredTarget[]> {
    const platform = this.deps?.platform ?? process.platform;
    const homedir = this.deps?.homedir ?? os.homedir();

    const cachePath = this.getVSCodeCachePath(platform, homedir);
    if (!cachePath) return [];

    return [{
      id: `vscode-${this.cacheType}`,
      kind: 'custom-path',
      path: cachePath,
      displayName: `VS Code ${this.capitalize(this.cacheType)}`,
      evidence: `Matched VS Code ${this.cacheType} pattern for ${platform}`,
      diagnostics: [
        'v2 scan-only: discovered but never auto-deleted',
        'Requires VS Code to be closed for cleanup',
        'Cache rebuilds automatically on next launch',
      ],
    }];
  }

  private getVSCodeCachePath(platform: NodeJS.Platform, homedir: string): string | null {
    const resolver = new PathResolver(platform);
    
    if (platform === 'win32') {
      const appData = process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
      return resolver.join(appData, 'Code', this.getCacheDir());
    }
    
    if (platform === 'darwin') {
      return resolver.join(homedir, 'Library', 'Application Support', 'Code', this.getCacheDir());
    }
    
    return null; // Linux support TODO
  }

  private getCacheDir(): string {
    switch (this.cacheType) {
      case 'cache': return 'Cache/Cache_Data';
      case 'cached-data': return 'CachedData';
      case 'gpu-cache': return 'GPUCache';
    }
  }

  private capitalize(str: string): string {
    return str.replace(/-(.)/g, (_, c) => ` ${c.toUpperCase()}`).replace(/^./, c => c.toUpperCase());
  }
}

/**
 * Factory function for scanner creation.
 */
export function createVSCodeCacheScanner(deps?: { platform?: NodeJS.Platform }): Scanner {
  return new VSCodeCacheScanner('cache', deps);
}
```

### Scanner Registry Pattern

```typescript
/**
 * Scanner Registry for plugin-based scanner management.
 * 
 * Responsibilities:
 * - Register scanner factories with metadata
 * - Enable/disable scanners via config
 * - Run all enabled scanners in parallel
 * - Provide fault-tolerance (partial results on failure)
 */
export class ScannerRegistry {
  private readonly entries = new Map<string, ScannerRegistryEntry>();

  /**
   * Register a scanner with metadata.
   * @throws If scanner ID already registered
   */
  register(entry: ScannerRegistryEntry): void {
    if (this.entries.has(entry.id)) {
      throw new Error(`Scanner already registered: ${entry.id}`);
    }
    this.entries.set(entry.id, entry);
  }

  /**
   * Apply user configuration to enable/disable scanners.
   */
  applyConfig(config: ScannerConfig): void {
    for (const entry of this.entries.values()) {
      const settings = config.scanners[entry.id];
      if (settings) {
        entry.enabled = settings.enabled;
      }
    }
  }

  /**
   * Run all enabled scanners in parallel.
   * Returns discovered targets from successful scans.
   * Logs errors but doesn't throw (partial results acceptable).
   */
  async scanAll(deps?: ScannerDeps): Promise<DiscoveredTarget[]> {
    const enabled = this.getEnabled();
    const results = await Promise.allSettled(
      enabled.map(entry => entry.factory(deps).scan())
    );

    const targets: DiscoveredTarget[] = [];
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const entry = enabled[i];

      if (result.status === 'fulfilled') {
        targets.push(...result.value);
      } else {
        errors.push(`Scanner ${entry.id} failed: ${String(result.reason)}`);
      }
    }

    if (errors.length > 0) {
      console.warn('[ScannerRegistry] Some scanners failed:', errors);
    }

    return targets;
  }

  /**
   * Get all enabled scanners.
   */
  getEnabled(): ScannerRegistryEntry[] {
    return Array.from(this.entries.values()).filter(e => e.enabled);
  }
}

/**
 * Registry entry for a scanner.
 */
export type ScannerRegistryEntry = {
  /**
   * Unique scanner ID (matches artifact ID or group ID).
   */
  id: string;

  /**
   * Associated artifact definitions from catalog.
   */
  artifacts: ArtifactDefinition[];

  /**
   * Factory function to create scanner instances.
   */
  factory: ScannerFactory;

  /**
   * Whether scanner is enabled (default: true).
   */
  enabled: boolean;
};

/**
 * Factory function signature.
 * Takes optional dependencies for testing/DI.
 */
export type ScannerFactory = (deps?: ScannerDeps) => Scanner;

/**
 * Dependencies injectable into scanners.
 */
export type ScannerDeps = {
  cwd?: string;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
};
```

### Usage Example

```typescript
// Creating and configuring registry
const registry = new ScannerRegistry();

// Register v1 scanners
registry.register({
  id: 'npm-cache',
  artifacts: [getArtifactById('npm-cache')],
  factory: () => new NpmCacheScanner(),
  enabled: true,
});

// Register v2 scanners
registry.register({
  id: 'vscode-cache',
  artifacts: [getArtifactById('vscode-cache')],
  factory: createVSCodeCacheScanner,
  enabled: true,
});

// Apply user config
const config = loadScannerConfig();
registry.applyConfig(config);

// Scan all
const discovered = await registry.scanAll({ cwd: process.cwd() });
```

---

## 4. CLI Updates

### `diskcare inventory` (NEW v2 Command)

```bash
# Discover all artifacts (v1 + v2) without cleanup
diskcare inventory

# Output as JSON
diskcare inventory --json

# Filter by category
diskcare inventory --category browsers
diskcare inventory --category ides

# Include repo-local caches (requires running from project directory)
diskcare inventory --include-repo-local
diskcare inventory --cwd /path/to/project
```

### JSON Output Format (with schemaVersion)

```json
{
  "command": "inventory",
  "schemaVersion": "0.1",
  "timestamp": "2026-02-10T15:30:00.000Z",
  "categories": [
    {
      "category": "browsers",
      "displayName": "Web Browsers",
      "targets": [
        {
          "id": "chrome-cache",
          "kind": "custom-path",
          "path": "C:\\Users\\user\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache",
          "displayName": "Chrome Cache",
          "exists": true,
          "action": "scan-only",
          "risk": "caution",
          "scope": "global",
          "evidence": "Matched Chromium cache pattern for chrome browser",
          "metrics": {
            "totalBytes": 52428800,
            "fileCount": 150,
            "directoryCount": 1,
            "lastModified": "2026-02-10T12:00:00.000Z",
            "error": null
          },
          "diagnostics": [
            "v2 scan-only: discovered but never auto-deleted",
            "Requires chrome.exe to be closed for cleanup"
          ],
          "safetyChecks": {
            "processRunning": ["chrome.exe"],
            "requiresElevated": false,
            "requiresCwd": false,
            "locked": false
          }
        }
      ],
      "totalBytes": 52428800,
      "count": 1
    }
  ],
  "summary": {
    "totalTargets": 30,
    "totalEstimatedBytes": 1073741824,
    "categoryCounts": {
      "os-temp": 1,
      "browsers": 10,
      "ides": 12,
      "language-caches": 2,
      "custom": 1
    }
  }
}
```

### `diskcare scan` (v1 Enhanced)

```bash
# v1 behavior (unchanged)
diskcare scan
diskcare scan --dry-run
diskcare scan --json

# NEW: Include v2 artifacts in output (read-only)
diskcare scan --inventory

# NEW: Specify project directory for repo-local scans
diskcare scan --cwd /path/to/project
```

---

## 5. Safety Gates & Metadata

Every scanner MUST provide metadata for safety validation:

```typescript
// Safety gate metadata embedded in DiscoveredTarget
export interface DiscoveredTarget {
  id: string;
  path: string;
  displayName: string;
  
  // Safety metadata
  evidence?: string;  // Why this target matched
  diagnostics?: string[];  // Warnings, notes
  
  // From artifact catalog
  action?: 'cleanable' | 'scan-only';
  risk?: 'safe' | 'caution' | 'dangerous';
  scope?: 'global' | 'repo-local';
}

// Safety checks (evaluated at runtime)
export interface SafetyCheckResult {
  safe: boolean;
  shouldSkip: boolean;
  warnings: string[];
  errors: string[];
}

// Safety preconditions (from artifact catalog)
export interface ArtifactPrecondition {
  requiresCwd?: boolean;           // Needs --cwd flag
  requiresElevated?: boolean;      // Needs admin/root
  requiresProcessStopped?: string[];  // Process names
  platforms?: NodeJS.Platform[];   // Supported platforms
}
```

### Example: Safety Gate Usage

```typescript
const gate = new SafetyGate({
  processChecker: {
    checkRunning: async (names) => checkRunningProcesses(names),
  },
  permissionChecker: {
    canAccess: async (path) => canReadFrom(path),
    isElevated: async () => isElevated(),
  },
  cwd: process.cwd(),
});

// Check preconditions before scan
const artifact = getArtifactById('vscode-cache');
const result = gate.checkPreconditions(artifact);

if (result.shouldSkip) {
  console.warn('Skipping:', result.warnings.join(', '));
}

// Validate discovered targets
const targets = await scanner.scan();
const validation = await gate.validateTargets(targets, artifactMap);
const safeTargets = gate.filterSafeTargets(targets, validation);
```

---

## 6. OS-Specific Path Resolution Strategy

### Current Implementation

```typescript
/**
 * Cross-platform path resolver.
 * Handles platform-specific path construction without executing shell commands.
 */
export class PathResolver {
  constructor(private readonly platform: NodeJS.Platform = process.platform) {}

  /**
   * Resolve path segments for target platform.
   * Uses platform-specific separators.
   */
  resolve(...segments: string[]): string {
    const separator = this.platform === 'win32' ? '\\' : '/';
    return segments.join(separator);
  }

  /**
   * Join path segments (alias for resolve).
   */
  join(...segments: string[]): string {
    return this.resolve(...segments);
  }

  /**
   * Normalize path for target platform.
   */
  normalize(p: string): string {
    if (this.platform === 'win32') {
      return p.replace(/\//g, '\\');
    }
    return p.replace(/\\/g, '/');
  }
}
```

### TODO: Enhanced Path Resolution

```typescript
/**
 * TODO: Platform-specific path expansion
 * 
 * PROBLEM: Environment variable syntax differs across platforms:
 * - Windows: %APPDATA%, %LOCALAPPDATA%, %USERPROFILE%
 * - Unix: $HOME, ${XDG_CACHE_HOME}
 * 
 * STRATEGY:
 * 1. Create PlatformPaths class with platform-specific methods
 * 2. Implement getAppData(), getCacheDir(), getHomeDir() per platform
 * 3. Use dependency injection for testing
 * 4. Cache resolved paths (avoid repeated env var lookups)
 * 
 * IMPLEMENTATION PRIORITY: Medium
 * Currently using node:os.homedir() + hardcoded relative paths.
 * Works for common cases but not XDG_*_HOME overrides.
 */

export class PlatformPaths {
  constructor(
    private readonly platform: NodeJS.Platform = process.platform,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  /**
   * Get user's home directory.
   * Respects $HOME (Unix) and %USERPROFILE% (Windows).
   */
  getHomeDir(): string {
    if (this.platform === 'win32') {
      return this.env.USERPROFILE || 'C:\\Users\\Default';
    }
    return this.env.HOME || '/home/user';
  }

  /**
   * Get application data directory.
   * Windows: %APPDATA%
   * macOS: ~/Library/Application Support
   * Linux: $XDG_DATA_HOME or ~/.local/share
   */
  getAppData(): string {
    if (this.platform === 'win32') {
      return this.env.APPDATA || path.join(this.getHomeDir(), 'AppData', 'Roaming');
    }
    if (this.platform === 'darwin') {
      return path.join(this.getHomeDir(), 'Library', 'Application Support');
    }
    // Linux
    return this.env.XDG_DATA_HOME || path.join(this.getHomeDir(), '.local', 'share');
  }

  /**
   * Get cache directory.
   * Windows: %LOCALAPPDATA%
   * macOS: ~/Library/Caches
   * Linux: $XDG_CACHE_HOME or ~/.cache
   */
  getCacheDir(): string {
    if (this.platform === 'win32') {
      return this.env.LOCALAPPDATA || path.join(this.getHomeDir(), 'AppData', 'Local');
    }
    if (this.platform === 'darwin') {
      return path.join(this.getHomeDir(), 'Library', 'Caches');
    }
    return this.env.XDG_CACHE_HOME || path.join(this.getHomeDir(), '.cache');
  }
}
```

---

## 7. Version Management

All JSON outputs MUST include `schemaVersion`:

```json
{
  "schemaVersion": "0.1",
  "command": "inventory",
  ...
}
```

Version compatibility rules:
- **Major version change** (0.x → 1.x): Breaking changes, clients must update
- **Minor version change** (0.1 → 0.2): Backwards-compatible additions
- **Patch version** (0.1.0 → 0.1.1): Bug fixes only

Current schema version: **0.1**

---

## Next Steps

1. ✅ Monorepo structure documented
2. ✅ Artifact Catalog v0.1 schema defined
3. ✅ Scanner plugin interface finalized
4. ✅ CLI updates specified
5. ⏳ Test plan (next section)
6. ⏳ Documentation updates (next section)
