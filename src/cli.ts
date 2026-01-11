#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";

import { scanDisk } from "./scanner/index.js";
import { formatBytes } from "./utils/format.js";
import { loadConfig } from "./config.js";
import { findCleanCandidates } from "./utils/cleanCandidates.js";

const program = new Command();

program
  .name("diskcare")
  .description("Safe-by-default disk hygiene tool")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan disk and report safe-to-clean files")
  .action(async () => {
    const config = loadConfig();
    const warnLimit = config.warnAboveGB * 1024 * 1024 * 1024;

    console.log(chalk.cyan.bold("\n🔍 DiskCare tarama başlatıldı\n"));

    const results = await scanDisk();
    let total = 0;

    for (const r of results) {
      total += r.size;

      const sizeLabel = formatBytes(r.size);
      const isLarge = r.size > warnLimit;

      console.log(chalk.white.bold(r.name));
      console.log(`  ${chalk.gray("Path")} : ${r.path}`);
      console.log(
        `  ${chalk.gray("Size")} : ${
          isLarge
            ? chalk.red.bold(sizeLabel + " ⚠️")
            : chalk.green(sizeLabel)
        }\n`
      );
    }

    console.log(chalk.yellow.bold("Toplam temizlenebilir alan:"));
    console.log(chalk.yellow(formatBytes(total)));
    console.log("");
  });

program
  .command("clean")
  .description("Simulate disk cleanup (dry-run only)")
  .option("--dry-run", "Show what would be deleted without deleting")
  .action(async (options) => {
    if (!options.dryRun) {
      console.log(
        chalk.red("❌ Güvenlik nedeniyle --dry-run zorunludur.")
      );
      console.log(
        chalk.gray("➡️ Örnek: diskcare clean --dry-run\n")
      );
      return;
    }

    console.log(
      chalk.cyan.bold("\n🧪 DiskCare temizleme simülasyonu (dry-run)\n")
    );

    const config = loadConfig();
    const targets = await scanDisk();

    let total = 0;

    for (const target of targets) {
      const candidates = await findCleanCandidates(
        target.path,
        config.exclude
      );

      if (candidates.length === 0) continue;

      console.log(chalk.white.bold(target.name));

      for (const c of candidates) {
        total += c.size;
        console.log(
          `  • ${chalk.gray(c.path)} (${formatBytes(c.size)})`
        );
      }

      console.log("");
    }

    console.log(chalk.yellow.bold("Toplam silinebilir alan (simülasyon):"));
    console.log(chalk.yellow(formatBytes(total)));
    console.log("");
  });

program.parse(process.argv);