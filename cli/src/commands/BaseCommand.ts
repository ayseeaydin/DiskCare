import type { Command } from "commander";
import type { CommandContext } from "../types/CommandContext.js";
import { handleCommandError } from "../utils/commandErrors.js";

export abstract class BaseCommand {
  abstract readonly name: string;
  abstract readonly description: string;

  /**
   * Register commander command + options + handler.
   * Keep wiring here, logic in execute().
   */
  register(program: Command, context: CommandContext): void {
    const cmd = program.command(this.name).description(this.description);
    this.configure(cmd);
    cmd.action(async (...args: unknown[]) => {
      try {
        await this.execute(args, context);
      } catch (err) {
        handleCommandError(context, err);
      }
    });
  }

  protected configure(_cmd: Command): void {
    // optional
  }

  protected abstract execute(args: unknown[], context: CommandContext): Promise<void>;
}
