import { getScanTargets } from "./targets.js";
import { getDirectorySize } from "../utils/fs.js";
import { loadConfig } from "../config.js";

export type ScanResult = {
    name: string;
    path: string;
    size: number;
};

export async function scanDisk(): Promise<ScanResult[]> {
    const config = loadConfig();
    const targets = getScanTargets();
    const results: ScanResult[] = [];

    for (const target of targets) {
        const size = await getDirectorySize(target.path, {
            exclude: config.exclude
        });

        results.push({
            name: target.name,
            path: target.path,
            size
        });
    }

    return results;
}