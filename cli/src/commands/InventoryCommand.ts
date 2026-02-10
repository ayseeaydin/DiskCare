/**
 * DiskCare v2 Inventory Command
 *
 * Discovers and catalogs all known cache/temp locations without cleanup.
 * Output is grouped by category for better visibility.
 * This is the primary v2 command - scan-first philosophy.
 */

import type { Command } from "commander";
import { z } from "zod";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ValidationError } from "../errors/DiskcareError.js";
import { JSON_INDENT } from "../utils/constants.js";
import { formatBytes } from "../formatters/formatBytes.js";
import type { ScanTarget } from "@diskcare/scanner-core";

type _InventoryOptions = {
  json?: boolean;
  category?: string;
  includeRepoLocal?: boolean;
};

const InventoryOptionsSchema = z
  .object({
    json: z.boolean().optional(),
    category: z.string().optional(),
    includeRepoLocal: z.boolean().optional(),
  })
  .passthrough();

export type InventoryCommandDeps = {
  scanAll: (context: CommandContext) => Promise<ScanTarget[]>;
};

type InventoryOutput = {
  command: "inventory";
  timestamp: string;
  categories: CategoryGroup[];
  summary: {
    totalTargets: number;
    totalEstimatedBytes: number;
    categoryCounts: Record<string, number>;
  };
};

type CategoryGroup = {
  category: string;
  displayName: string;
  targets: ScanTarget[];
  totalBytes: number;
  count: number;
};

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "os-temp": "OS Temporary Files",
  browsers: "Web Browsers",
  ides: "IDEs & Editors",
  "language-caches": "Language Package Managers",
  "build-tools": "Build Tools",
  "repo-local": "Repository-Local Caches",
  diagnostics: "Diagnostics & Logs",
  custom: "Custom Paths",
};

export class InventoryCommand extends BaseCommand {
  readonly name = "inventory";
  readonly description = "Discover and catalog all cache/temp locations (v2 scan-first).";

  constructor(private readonly deps?: InventoryCommandDeps) {
    super();
  }

  protected configure(cmd: Command): void {
    cmd.option("--json", "Output as JSON");
    cmd.option("--category <name>", "Filter by category (browsers, ides, etc.)");
    cmd.option(
      "--include-repo-local",
      "Include repo-local caches (requires running from project directory)",
    );
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = this.parseOptions(args);
    const deps = this.resolveDeps(context);

    context.output.progress("Discovering artifacts...");

    const targets = await deps.scanAll(context);

    context.output.progress(`Found ${targets.length} artifact(s)`);

    const inventory = this.buildInventory(targets, options);

    if (options.json) {
      this.printJson(context, inventory);
    } else {
      this.printHuman(context, inventory);
    }
  }

  private parseOptions(args: unknown[]): {
    json: boolean;
    category: string | null;
    includeRepoLocal: boolean;
  } {
    const raw = args[0] ?? {};
    const result = InventoryOptionsSchema.safeParse(raw);

    if (!result.success) {
      throw new ValidationError("Invalid inventory options", result.error as unknown as Record<string, unknown>);
    }

    return {
      json: result.data.json ?? false,
      category: result.data.category ?? null,
      includeRepoLocal: result.data.includeRepoLocal ?? false,
    };
  }

  private resolveDeps(_context: CommandContext): Required<InventoryCommandDeps> {
    if (this.deps?.scanAll) {
      return { scanAll: this.deps.scanAll };
    }

    // Default: use v2 scanner that includes all artifact discovery
    return {
      scanAll: async (ctx) => {
        const { scanAllV2 } = await import("../scanning/scanAllV2.js");
        return scanAllV2(ctx);
      },
    };
  }

  private buildInventory(
    targets: ScanTarget[],
    options: { category: string | null; includeRepoLocal: boolean },
  ): InventoryOutput {
    // Group targets by category (infer from target id for now)
    const categoryGroups = new Map<string, ScanTarget[]>();

    for (const target of targets) {
      const category = this.inferCategory(target);

      // Filter by category if specified
      if (options.category && category !== options.category) {
        continue;
      }

      // Skip repo-local unless explicitly requested
      if (category === "repo-local" && !options.includeRepoLocal) {
        continue;
      }

      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(target);
    }

    // Build category groups with stats
    const categories: CategoryGroup[] = [];
    let totalEstimatedBytes = 0;
    const categoryCounts: Record<string, number> = {};

    for (const [category, groupTargets] of categoryGroups.entries()) {
      const totalBytes = groupTargets.reduce((sum, t) => sum + (t.metrics?.totalBytes ?? 0), 0);
      totalEstimatedBytes += totalBytes;
      categoryCounts[category] = groupTargets.length;

      categories.push({
        category,
        displayName: CATEGORY_DISPLAY_NAMES[category] ?? category,
        targets: groupTargets,
        totalBytes,
        count: groupTargets.length,
      });
    }

    // Sort categories by total bytes (largest first)
    categories.sort((a, b) => b.totalBytes - a.totalBytes);

    return {
      command: "inventory",
      timestamp: new Date().toISOString(),
      categories,
      summary: {
        totalTargets: targets.length,
        totalEstimatedBytes,
        categoryCounts,
      },
    };
  }

  private inferCategory(target: ScanTarget): string {
    // Infer category from target id (temporary until we integrate artifact catalog)
    const id = target.id.toLowerCase();

    if (id.includes("chrome") || id.includes("firefox") || id.includes("edge") || id.includes("brave")) {
      return "browsers";
    }
    if (id.includes("vscode") || id.includes("jetbrains")) {
      return "ides";
    }
    if (id.includes("npm") || id.includes("pip") || id.includes("cargo")) {
      return "language-caches";
    }
    if (id.includes("next") || id.includes("turbo") || id.includes("vite") || id.includes("parcel")) {
      return "repo-local";
    }
    if (id.includes("temp")) {
      return "os-temp";
    }

    return "custom";
  }

  private printJson(context: CommandContext, inventory: InventoryOutput): void {
    context.output.info(JSON.stringify(inventory, null, JSON_INDENT));
  }

  private printHuman(context: CommandContext, inventory: InventoryOutput): void {
    context.output.info("=".repeat(60));
    context.output.info("DiskCare Artifact Inventory");
    context.output.info("=".repeat(60));
    context.output.info("");

    if (inventory.categories.length === 0) {
      context.output.info("No artifacts discovered.");
      return;
    }

    // Print summary
    context.output.info(
      `Total: ${inventory.summary.totalTargets} artifact(s), ${formatBytes(inventory.summary.totalEstimatedBytes)}`,
    );
    context.output.info("");

    // Print each category
    for (const category of inventory.categories) {
      this.printCategory(context, category);
    }

    // Print footer
    context.output.info("");
    context.output.info("-".repeat(60));
    context.output.info("💡 This is inventory mode - no files are deleted.");
    context.output.info("   Use 'diskcare scan' to see v1 targets with cleanup options.");
  }

  private printCategory(context: CommandContext, category: CategoryGroup): void {
    context.output.info("-".repeat(60));
    context.output.info(
      `📦 ${category.displayName} (${category.count} item(s), ${formatBytes(category.totalBytes)})`,
    );
    context.output.info("");

    for (const target of category.targets) {
      this.printTarget(context, target);
    }
  }

  private printTarget(context: CommandContext, target: ScanTarget): void {
    const exists = target.exists ? "✓" : "✗";
    const size = formatBytes(target.metrics?.totalBytes ?? 0);
    const files = target.metrics?.fileCount ?? 0;

    context.output.info(`  ${exists} ${target.displayName}`);
    context.output.info(`     Path: ${target.path}`);
    context.output.info(`     Size: ${size} (${files} file(s))`);

    if (target.diagnostics && target.diagnostics.length > 0) {
      context.output.info(`     Note: ${target.diagnostics[0]}`);
    }

    context.output.info("");
  }
}
