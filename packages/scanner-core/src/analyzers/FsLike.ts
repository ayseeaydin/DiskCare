import type { Dirent } from "node:fs";

export type FsLike = {
  stat(
    path: string,
  ): Promise<{ isDirectory(): boolean; size: number; mtimeMs: number; atimeMs: number }>;
  readdir(path: string, opts: { withFileTypes: true }): Promise<Dirent[]>;
};
