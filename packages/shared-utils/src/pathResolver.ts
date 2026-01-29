import path from "node:path";

export class PathResolver {
  private readonly p: typeof path.posix | typeof path.win32;

  constructor(platform: NodeJS.Platform) {
    this.p = platform === "win32" ? path.win32 : path.posix;
  }

  resolve(...segments: string[]): string {
    return this.p.resolve(...segments);
  }

  join(...segments: string[]): string {
    return this.p.join(...segments);
  }

  normalize(value: string): string {
    return this.p.normalize(value);
  }

  parse(value: string): path.ParsedPath {
    return this.p.parse(value);
  }

  isAbsolute(value: string): boolean {
    return this.p.isAbsolute(value);
  }
}
