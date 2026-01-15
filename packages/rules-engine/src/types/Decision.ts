export type RiskLevel = "safe" | "caution" | "do-not-touch";

export type Decision = {
    risk: RiskLevel;
    safeAfterDays: number;
    reasons: string[];
};
