export type Result<T, E = unknown> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(r: Result<T, E>): r is { ok: true; value: T } {
  return r.ok === true;
}

export function isErr<T, E>(r: Result<T, E>): r is { ok: false; error: E } {
  return r.ok === false;
}

export function map<T, E, U>(r: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (!r.ok) return r;
  return ok(fn(r.value));
}

export function mapErr<T, E, F>(r: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (r.ok) return r;
  return err(fn(r.error));
}

export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return r.ok ? r.value : fallback;
}

export async function fromPromise<T>(p: Promise<T>): Promise<Result<T, unknown>> {
  try {
    return ok(await p);
  } catch (error) {
    return err(error);
  }
}
