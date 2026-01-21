import type { Output } from "../output/Output.js";

export type ProcessLike = {
  on: (event: "SIGINT" | "SIGTERM", listener: () => void) => void;
  exit: (code?: number) => never;
  exitCode: number | string | undefined;
};

export type InstallSignalHandlersDeps = {
  output: Output;
  proc: ProcessLike;
};

const installedFor = new WeakSet<object>();

export function installSignalHandlers(deps: InstallSignalHandlersDeps): void {
  if (installedFor.has(deps.proc as unknown as object)) return;
  installedFor.add(deps.proc as unknown as object);

  const { output, proc } = deps;

  proc.on("SIGINT", () => {
    output.warn("Interrupted (SIGINT). Exiting safely...");
    proc.exitCode = 130;
    proc.exit(130);
  });

  proc.on("SIGTERM", () => {
    output.warn("Terminated (SIGTERM). Exiting safely...");
    proc.exitCode = 143;
    proc.exit(143);
  });
}
