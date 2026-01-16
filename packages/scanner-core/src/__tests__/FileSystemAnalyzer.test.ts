import test from "node:test";
import assert from "node:assert/strict";

import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { FileSystemAnalyzer } from "../analyzers/FileSystemAnalyzer.js";

test("FileSystemAnalyzer.analyze - counts files and total bytes for a small directory", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "diskcare-analyzer-"));
    const fileA = path.join(tmpRoot, "a.txt");
    const fileB = path.join(tmpRoot, "b.txt");

    await fs.writeFile(fileA, "12345"); // 5 bytes
    await fs.writeFile(fileB, "12"); // 2 bytes

    const analyzer = new FileSystemAnalyzer();
    const metrics = await analyzer.analyze(tmpRoot);

    assert.equal(metrics.skipped, false);
    assert.equal(metrics.fileCount, 2);
    assert.equal(metrics.totalBytes, 7);

    // cleanup
    await fs.rm(tmpRoot, { recursive: true, force: true });
});
