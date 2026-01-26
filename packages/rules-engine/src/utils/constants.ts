export const MIN_SAFE_AFTER_DAYS = 0;
/**
 * Maximum value for safeAfterDays in rules.
 * 9999 is a practical upper bound to prevent accidental huge values and keep config validation simple.
 * If you need 'never safe', use a very high value (e.g. 9999) instead of Infinity.
 */
export const MAX_SAFE_AFTER_DAYS = 9999;
