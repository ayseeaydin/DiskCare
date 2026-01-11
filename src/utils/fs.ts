import fs from "fs";
import path from "path";

type SizeOptions = {
    exclude: string[];
};

export async function getDirectorySize(
    dir: string,
    options: SizeOptions
): Promise<number> {
    let total = 0;

    let entries: fs.Dirent[];
    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
        return 0; // erişilemiyorsa sessizce geç
    }

    for (const entry of entries) {
        if (options.exclude.includes(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);

        try {
            if (entry.isFile()) {
                const stat = await fs.promises.stat(fullPath);
                total += stat.size;
            } else if (entry.isDirectory()) {
                total += await getDirectorySize(fullPath, options);
            }
        } catch {
            // permission veya race condition → sessiz geç
        }
    }

    return total;
}