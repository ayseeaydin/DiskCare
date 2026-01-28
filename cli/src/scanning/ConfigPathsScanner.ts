import path from "node:path";

import type { DiscoveredTarget, Scanner } from "@diskcare/scanner-core";
import { RulesConfigLoader } from "@diskcare/rules-engine";
import type { Rule } from "@diskcare/rules-engine";

type ConfigPathsScannerDeps = {
  configPath: string;
  cwd: string;
  loader?: RulesConfigLoader;
};

export class ConfigPathsScanner implements Scanner {
  private readonly configPath: string;
  private readonly cwd: string;
  private readonly loader: RulesConfigLoader;

  constructor(deps: ConfigPathsScannerDeps) {
    this.configPath = deps.configPath;
    this.cwd = deps.cwd;
    this.loader = deps.loader ?? new RulesConfigLoader();
  }

  async scan(): Promise<DiscoveredTarget[]> {
    let config: { rules: Rule[] };
    try {
      config = await this.loader.loadFromFile(this.configPath);
    } catch {
      return [];
    }

    const targets: DiscoveredTarget[] = [];
    for (const rule of config.rules) {
      const rawPaths = Array.isArray(rule.paths) ? rule.paths : [];
      const validPaths = rawPaths.filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0,
      );

      let index = 0;
      for (const p of validPaths) {
        index += 1;
        const absolute = path.isAbsolute(p) ? p : path.resolve(this.cwd, p);
        const id = validPaths.length === 1 ? `custom:${rule.id}` : `custom:${rule.id}:${index}`;

        targets.push({
          id,
          ruleId: rule.id,
          kind: "custom-path",
          path: absolute,
          displayName: `Custom Path (${rule.id})`,
        });
      }
    }

    return targets;
  }
}
