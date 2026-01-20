import { TRUNCATE_SUFFIX, TRUNCATE_SUFFIX_LENGTH } from "../utils/constants.js";

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  if (maxLen <= TRUNCATE_SUFFIX_LENGTH) return TRUNCATE_SUFFIX;
  return `${text.slice(0, maxLen - TRUNCATE_SUFFIX_LENGTH)}${TRUNCATE_SUFFIX}`;
}
