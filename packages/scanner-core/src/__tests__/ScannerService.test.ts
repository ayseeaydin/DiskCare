import test from "node:test";
import assert from "node:assert/strict";

import { ScannerService } from "../ScannerService.js";
import { BaseScanner } from "../scanners/BaseScanner.js";
import type { ScanTarget } from "../types/ScanTarget.js";

class FakeScanner extends BaseScanner {
    constructor(private readonly targets: ScanTarget[]) {
        super();
    }

    async scan(): Promise<ScanTarget[]> {
        return this.targets;
    }
}

test("ScannerService.scanAll - merges scanner results and returns deterministic order by id", async () => {
    const s1 = new FakeScanner([
        {
            id: "z-target",
            kind: "os-temp",
            path: "C:\\z",
            displayName: "Z",
            exists: true,
        },
    ]);

    const s2 = new FakeScanner([
        {
            id: "a-target",
            kind: "npm-cache",
            path: "C:\\a",
            displayName: "A",
            exists: true,
        },
    ]);

    const service = new ScannerService([s1, s2]);
    const targets = await service.scanAll();

    assert.equal(targets.length, 2);
    assert.equal(targets[0]?.id, "a-target");
    assert.equal(targets[1]?.id, "z-target");
});
