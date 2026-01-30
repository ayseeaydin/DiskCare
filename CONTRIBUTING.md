# Null, Undefined, and Optional Field Conventions

## English

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

- Use `null` for "not available" or "not applicable" (especially for primitives).
- Use `?` for "optional, may be omitted entirely" (especially for arrays/objects).
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

> Note: This convention should be followed in all new code and when refactoring existing code. If you need to break this rule, document the reason clearly in code comments.

---

## Türkçe

TypeScript'te eksik, opsiyonel veya erişilemeyen verileri tutarlı ve sürdürülebilir şekilde ele almak için DiskCare şu kuralları kullanır:

## 1. null

- Bilerek eksik, bilinmeyen veya uygulanamaz bir değeri temsil etmek için `null` kullanın.
- Örnek: `lastAccessedAt: number | null` (zaman damgası yok veya uygulanamaz)

## 2. undefined / Opsiyonel ( ? )

- Nesneden tamamen çıkarılabilen alanlar için `?` (opsiyonel) kullanın.
- Örnek: `diagnostics?: string[]` (yalnızca teşhis varsa alan bulunur)
- Dizi veya nesnelerde `null` kullanmayın; alanı tamamen çıkarın.

## 3. Diziler ve Nesneler

- Bir alan varsa asla `null` olmamalıdır. Gerekirse boş dizi/nesne kullanın.
- Bir alan yoksa çıkarın (`?` kullanın).
- Örnek: `diagnostics?: string[]` (yoksa undefined, asla `null` değil)

## 4. Sayılar ve String'ler

- Değer gerekli ama bilinmiyor olabilir ise `| null` kullanın.
- Değer gerçekten opsiyonelse (hiç var olmayabilir), `?` kullanın.
- `?` ve `| null` birlikte kullanmayın (mutlak gerekçe yoksa).

## 5. Genel Kurallar

- "Kullanılamıyor" veya "uygulanamaz" için `null` kullanın (özellikle primitive'lerde).
- "Opsiyonel, tamamen çıkarılabilir" için `?` kullanın (özellikle dizi/nesnelerde).
- Aynı alan için hem `?` hem `| null` kullanmayın; güçlü bir gerekçe varsa belgelendirin.

## Örnekler

```ts
// İyi
lastAccessedAt: number | null;
diagnostics?: string[];

// Kötü
lastAccessedAt?: number | null; // (güçlü gerekçe yoksa kaçının)
diagnostics: string[] | null;    // (diziler için asla null kullanmayın)
```

> Not: Bu kurallar tüm yeni kodlarda ve mevcut kodu refaktör ederken izlenmelidir. Bu kuralı bozmanız gerekiyorsa, nedeni kod yorumlarında açıkça belgeleyin.
