#!/usr/bin/env node
import { Command } from "commander";
import { scanDisk } from "./scanner/index.js";

const program = new Command();

program
    .name("diskcare")
    .description("Safe-by-default disk hygiene tool")
    .version("0.1.0");

program
    .command("scan")
    .description("Scan disk and report safe-to-clean files")
    .action(async () => {
        console.log("🔍 Disk taranıyor...\n");

        const results = await scanDisk();

        for (const r of results) {
            console.log(`${r.name}`);
            console.log(`  Path : ${r.path}`);
            console.log(`  Size : ${(r.size / 1024 / 1024).toFixed(2)} MB\n`);
        }
    });

program.parse(process.argv);
