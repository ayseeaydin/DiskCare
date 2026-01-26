# Null, Undefined, and Optional Field Conventions

To ensure consistency and maintainability, DiskCare uses the following conventions for handling missing, optional, or unavailable data in TypeScript:

## 1. null
- Use `null` to represent a value that is intentionally missing, unknown, or not applicable.
- Example: `lastAccessedAt: number | null` (timestamp is not available or not applicable)

## 2. undefined / Optional ( ? )
- Use `?` (optional) for fields that may be omitted entirely from an object.
- Example: `diagnostics?: string[]` (field is present only if there are diagnostics)
- Never use `null` for arrays or objects; omit the field instead.

## 3. Arrays and Objects
- If a field is present, it must never be `null`. Use an empty array/object if needed.
- If a field is not present, omit it (use `?`).
- Example: `diagnostics?: string[]` (undefined if not present, never `null`)

## 4. Numbers and Strings
- If a value is required but may be unknown, use `| null`.
- If a value is truly optional (may not exist at all), use `?`.
- Do not combine `?` and `| null` unless absolutely necessary.

## 5. General Guidelines
- Use `null` for “not available” or “not applicable” (especially for primitives).
- Use `?` for “optional, may be omitted entirely” (especially for arrays/objects).
- Never use both `?` and `| null` for the same field unless there is a strong reason and it is documented.

## Examples
```ts
// Good
lastAccessedAt: number | null;
diagnostics?: string[];

// Bad
lastAccessedAt?: number | null; // (avoid unless you have a strong reason)
diagnostics: string[] | null;    // (never use null for arrays)
```

> **Note:** This convention should be followed in all new code and when refactoring existing code. If you need to break this rule, document the reason clearly in code comments.
