import fs from "fs";
import path from "path";
import os from "os";

export type DiskCareConfig = {
    exclude: string[];
    warnAboveGB: number;
};

const defaultConfig: DiskCareConfig = {
    exclude: ["node_modules", ".git"],
    warnAboveGB: 1
};

export function loadConfig(): DiskCareConfig {
    const configPath = path.join(os.homedir(), ".diskcarerc.json");

    if (!fs.existsSync(configPath)) {
        return defaultConfig;
    }

    try {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);

        return {
            exclude: parsed.exclude ?? defaultConfig.exclude,
            warnAboveGB: parsed.warnAboveGB ?? defaultConfig.warnAboveGB
        };
    } catch {
        return defaultConfig;
    }
}