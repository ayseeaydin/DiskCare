#!/usr/bin/env node
import { Command } from "commander";
import { scanDisk } from "./scanner/index.js";
import chalk from "chalk";
import { formatBytes } from "./utils/format.js";

const program = new Command();

program
    .name("diskcare")
    .description("Safe-by-default disk hygiene tool")
    .version("0.1.0");

program
    .command("scan")
    .description("Scan disk and report safe-to-clean files")
    .action(async () => {
        console.log(chalk.cyan.bold("\n🔍 DiskCare tarama başlatıldı\n"));

        const results = await scanDisk();
        let total = 0;

        for (const r of results) {
            total += r.size;

            const sizeLabel = formatBytes(r.size);
            const isLarge = r.size > 1024 * 1024 * 1024; // 1 GB

            console.log(chalk.white.bold(r.name));
            console.log(`  ${chalk.gray("Path")} : ${r.path}`);
            console.log(
                `  ${chalk.gray("Size")} : ${isLarge ? chalk.red.bold(sizeLabel + " ⚠️") : chalk.green(sizeLabel)
                }\n`
            );
        }

        console.log(chalk.yellow.bold("Toplam temizlenebilir alan:"));
        console.log(chalk.yellow(formatBytes(total)));
        console.log("");
    });

program.parse(process.argv);
