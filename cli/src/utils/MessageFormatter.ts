// MessageFormatter: Standardizes diagnostic and user-facing messages
// Usage: MessageFormatter.diagnostic('npm', 'lookup failed', { error, fallback: true })

export class MessageFormatter {
  static cliDescription(): string {
    return [
      "Safe, explainable disk hygiene CLI for developers (safe by default).",
      "",
      "By default, nothing is deleted - you only see a clean plan.",
      "To actually move files to Trash/Recycle Bin: --apply --no-dry-run --yes",
      "",
      "Commands: scan, clean, report, config, init",
      "",
      "Help: diskcare <command> --help",
    ].join("\n");
  }

  static progressScanningTargets(): string {
    return "Scanning targets...";
  }

  static progressScanCompleted(count: number): string {
    return `Scan completed. Found ${count} targets.`;
  }

  static progressBuildingPlan(): string {
    return "Building clean plan...";
  }

  static progressPlanReady(count: number): string {
    return `Clean plan ready. ${count} items in plan.`;
  }

  static onboardingMessage(): string {
    return [
      "\u001b[1mWelcome to DiskCare!\u001b[0m",
      "",
      "No rules.json config was found.",
      "",
      "To get started:",
      "  1. Run \u001b[32mdiskcare init\u001b[0m to create a config.",
      "  2. Then run \u001b[32mdiskcare scan\u001b[0m or \u001b[32mdiskcare clean\u001b[0m.",
      "",
      "Tip: Without a config, DiskCare uses safe default rules.",
      "Help: diskcare --help",
    ].join("\n");
  }

  static configCommandsHeader(): string {
    return "config commands:";
  }

  static configCommandsPath(): string {
    return "  diskcare config path    Print resolved rules config path";
  }

  static configPathLine(configPath: string): string {
    return `configPath: ${configPath}`;
  }

  static configExistsYes(isFile: boolean): string {
    return `exists: yes (file=${isFile ? "yes" : "no"})`;
  }

  static configExistsNo(): string {
    return "exists: no";
  }

  static configExistsUnknown(message: string): string {
    return `exists: unknown (${message})`;
  }

  static policiesHeader(): string {
    return "Available policies:";
  }

  static policyLine(label: string): string {
    return `- ${label}`;
  }

  static rulesConfigCreated(path: string): string {
    return `Created rules config: ${path}`;
  }

  static policySelected(policy: string): string {
    return `Policy: ${policy}`;
  }

  static scanReportHeader(dryRun: boolean): string {
    return `scan report (dryRun=${dryRun})`;
  }

  static cleanPlanHeader(dryRun: boolean, apply: boolean): string {
    return `clean plan (dryRun=${dryRun}, apply=${apply})`;
  }

  static cleanPlanSummary(
    eligible: number,
    caution: number,
    blocked: number,
    estimatedFree: string,
  ): string {
    return `summary: eligible=${eligible} | caution=${caution} | blocked=${blocked} | estimatedFree=${estimatedFree}`;
  }

  static targetIdLine(id: string): string {
    return `  id:      ${id}`;
  }

  static targetRuleIdLine(ruleId: string): string {
    return `  ruleId:  ${ruleId}`;
  }

  static targetPathLine(path: string): string {
    return `  path:    ${path}`;
  }

  static targetExistsLine(
    exists: string,
    skipped: string,
    partial: string,
    skippedEntries: number,
  ): string {
    return `  exists:  ${exists}   skipped: ${skipped}   partial: ${partial} (skippedEntries=${skippedEntries})`;
  }

  static targetSizeLine(size: string, files: string): string {
    return `  size:    ${size}   files: ${files}`;
  }

  static targetMtimeLine(modified: string): string {
    return `  mtime:   ${modified}`;
  }

  static targetAtimeLine(accessed: string): string {
    return `  atime:   ${accessed}`;
  }

  static targetRiskLine(risk: string, safeAfterDays: number | string): string {
    return `  risk:    ${risk}   safeAfterDays: ${safeAfterDays}`;
  }

  static targetRuleLine(rule: string): string {
    return `  rule:    ${rule}`;
  }

  static targetNoteLine(note: string): string {
    return `  note:    ${note}`;
  }

  static targetErrorLine(error: string): string {
    return `  error:   ${error}`;
  }

  static planStatusLine(status: string): string {
    return `  status:  ${status}`;
  }

  static planEstLine(est: string): string {
    return `  est:     ${est}`;
  }

  static planWhyLine(reason: string): string {
    return `  why:     ${reason}`;
  }

  static reportHeader(): string {
    return "report";
  }

  static reportSection(label: string): string {
    return label;
  }

  static reportLine(label: string, value: string, pad: number): string {
    return `  ${label.padEnd(pad, " ")} ${value}`;
  }

  static savedLog(path: string): string {
    return `Saved log: ${path}`;
  }

  static notePartialEstimated(): string {
    return "Note: Estimated sizes may be inaccurate due to partial analysis.";
  }

  static noEligibleItems(): string {
    return "No eligible items to clean.";
  }

  static estimatedFreeMessage(amount: string): string {
    return `\u001b[1m${amount} can be freed.\u001b[0m ${MessageFormatter.applyHowTo()}`;
  }

  static applyResultsLine(trashed: number, failed: number, skipped: number): string {
    return `apply results: trashed=${trashed} failed=${failed} skipped=${skipped}`;
  }

  static applyFailedLine(id: string, path: string, message: string): string {
    return `  failed: ${id} (${path}) - ${message}`;
  }

  static applySkippedLine(id: string, path: string, message: string): string {
    return `  skipped: ${id} (${path}) - ${message}`;
  }

  static applyBlockedDryRun(): string {
    return "apply requested, but dry-run is enabled; nothing was moved to Trash.";
  }

  static applyBlockedConfirmation(): string {
    return "apply requested, but confirmation is missing; nothing was moved to Trash.";
  }

  static applyBlockedGates(): string {
    return "apply requested, but apply gates were not satisfied; nothing was moved to Trash.";
  }

  static applyHowTo(): string {
    return "To actually apply, run: diskcare clean --apply --no-dry-run --yes";
  }

  static scheduleComingSoon(): string {
    return "Coming soon: This feature is not yet available.";
  }

  static verboseHint(): string {
    return "hint: re-run with --verbose for more detail";
  }

  static suggestionForCode(code: string): string | null {
    switch (code) {
      case "CONFIG_LOAD_ERROR":
        return "Config file is corrupted or missing. Fix it manually or run 'diskcare init --force' to recreate.";
      case "CONFIG_WRITE_ERROR":
        return "Could not write config file. Check the path, permissions, and disk space. Try running as administrator or choose a different location.";
      case "LOG_WRITE_ERROR":
        return "Could not write to logs directory. Check permissions, disk space, or try a different location.";
      case "SCAN_ERROR":
        return "Scan failed. Check that you have access to all target folders. Re-run with --verbose for details.";
      case "APPLY_ERROR":
        return "Cleanup could not be applied. Try running in dry-run mode first. To actually clean, use: --apply --no-dry-run --yes.";
      case "VALIDATION_ERROR":
        return "Invalid input. Check CLI arguments and configuration values. Run 'diskcare <command> --help' for usage examples.";
      default:
        return null;
    }
  }

  static diagnostic(context: string, message: string, opts?: Record<string, unknown>): string {
    // Example: "[npm] lookup failed (Error: ...), falling back."
    let msg = `[${context}] ${message}`;
    if (opts?.error) {
      msg += ` (${opts.error instanceof Error ? opts.error.message : String(opts.error)})`;
    }
    if (opts?.fallback) {
      msg += ", falling back.";
    }
    return msg;
  }

  static userFriendly(context: string, message: string, opts?: Record<string, unknown>): string {
    // Example: "Could not determine npm cache path. Using default."
    return message;
  }

  static tooRecent(days: number, safeAfter: number): string {
    return `Too recent: last modified ${days} day(s) ago (must be >= ${safeAfter}).`;
  }

  static rulesConfigNotLoaded(): string {
    return "Rules config not loaded; using defaults.";
  }

  static targetMissing(): string {
    return "Target path does not exist.";
  }

  static analysisSkipped(message: string): string {
    return `Target analysis skipped: ${message}`;
  }

  static partialAnalysis(skippedEntries: number): string {
    return `Partial analysis: ${skippedEntries} subpath(s) could not be read; not eligible for apply.`;
  }

  static partialEstimatedBytes(): string {
    return "Estimated size may be inaccurate due to partial analysis.";
  }

  static doNotTouch(): string {
    return "Rule risk is do-not-touch.";
  }

  static missingMtime(): string {
    return "Cannot determine lastModifiedAt; not eligible for apply.";
  }

  static applyDryRun(): string {
    return "Dry-run is enabled; no changes were made.";
  }

  static applyConfirmationRequired(): string {
    return "Confirmation required: pass --yes to apply.";
  }
}
