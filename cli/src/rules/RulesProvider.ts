import path from "node:path";

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
    context.output.warn(
      `rules: ${MessageFormatter.rulesConfigNotLoaded()} (${filePath}: ${truncate(
        msg,
        ANALYZER_ERROR_TRUNCATE_LIMIT,
      )})`,
    );
    return null;
  }
}
