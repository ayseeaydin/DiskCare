import path from "node:path";

export type ConfigPathEnv = {
  APPDATA?: string;
  LOCALAPPDATA?: string;
  XDG_CONFIG_HOME?: string;
  HOME?: string;
};

type EnvLike = NodeJS.ProcessEnv;

export type GetDefaultConfigPathDeps = {
  cwd: string;
  platform: NodeJS.Platform;
  env: EnvLike;
  homedir: string;
  pathExists: (absolutePath: string) => boolean;
};

export function getLocalProjectConfigPath(cwd: string): string {
  return path.resolve(cwd, "config", "rules.json");
}

export function getUserConfigPath(deps: {
  platform: NodeJS.Platform;
  env: EnvLike;
  homedir: string;
}): string {
  const { platform, env, homedir } = deps;

  const p = platform === "win32" ? path.win32 : path.posix;

  if (platform === "win32") {
    const base = env.APPDATA ?? env.LOCALAPPDATA ?? homedir;
    return p.resolve(base, "DiskCare", "rules.json");
  }

  if (platform === "darwin") {
    return p.resolve(homedir, "Library", "Application Support", "DiskCare", "rules.json");
  }

  // linux + others: XDG first
  const xdg = env.XDG_CONFIG_HOME;
  if (typeof xdg === "string" && xdg.trim().length > 0) {
    return p.resolve(xdg, "diskcare", "rules.json");
  }

  return p.resolve(homedir, ".config", "diskcare", "rules.json");
}

/**
 * Default config selection strategy:
 * - Use local project config when it exists: <cwd>/config/rules.json
 * - Otherwise fall back to a per-user config directory
 */
export function getDefaultConfigPath(deps: GetDefaultConfigPathDeps): string {
  const local = getLocalProjectConfigPath(deps.cwd);
  if (deps.pathExists(local)) return local;

  return getUserConfigPath({ platform: deps.platform, env: deps.env, homedir: deps.homedir });
}
