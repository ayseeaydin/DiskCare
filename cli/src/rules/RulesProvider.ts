import path from "node:path";
import fs from "node:fs/promises";

import { RulesConfigError, RulesConfigLoader, RulesEngine } from "@diskcare/rules-engine";
import type { RuleConfig } from "@diskcare/rules-engine";

import type { CommandContext } from "../types/CommandContext.js";
import { truncate } from "../formatters/truncate.js";
import { toErrorMessage, toOneLine } from "../utils/errors.js";
import { fromPromise } from "../utils/result.js";
import { MessageFormatter } from "../utils/MessageFormatter.js";
import { ANALYZER_ERROR_TRUNCATE_LIMIT } from "../utils/constants.js";

type RulesConfigLoaderLike = {
  loadFromFile: (filePath: string) => Promise<RuleConfig>;
};

export class RulesProvider {
  constructor(
    private readonly rulesPath: string,
    private readonly loader: RulesConfigLoaderLike = new RulesConfigLoader(),
  ) {}

  static fromCwd(cwd: string): RulesProvider {
    const rulesPath = path.resolve(cwd, "config", "rules.json");
    return new RulesProvider(rulesPath);
  }

  async tryLoad(context: CommandContext): Promise<RulesEngine | null> {
    const loaded = await fromPromise(this.loader.loadFromFile(this.rulesPath));
    if (loaded.ok) {
      return new RulesEngine(loaded.value);
    }

    const err = loaded.error;
    const msg = toOneLine(toErrorMessage(err));

    const filePath = err instanceof RulesConfigError ? err.filePath : this.rulesPath;
    const location = await getJsonErrorLocation(filePath, err);
    const locationSuffix = location ? ` (line=${location.line}, col=${location.column})` : "";
    context.output.warn(
      `rules: ${MessageFormatter.rulesConfigNotLoaded()} (${filePath}${locationSuffix}: ${truncate(
        msg,
        ANALYZER_ERROR_TRUNCATE_LIMIT,
      )})`,
    );
    return null;
  }
}

async function getJsonErrorLocation(
  filePath: string,
  err: unknown,
): Promise<{ line: number; column: number } | null> {
  if (!(err instanceof RulesConfigError)) return null;
  const cause = err.cause;
  if (!(cause instanceof SyntaxError)) return null;

  const message = cause.message;
  const match = /position\s+(\d+)/i.exec(message);
  if (!match) return null;
  const position = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(position)) return null;

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }

  const slice = raw.slice(0, Math.max(0, position));
  const lines = slice.split(/\r?\n/);
  const line = lines.length;
  const column = lines[lines.length - 1]?.length ?? 0;
  return { line, column };
}
