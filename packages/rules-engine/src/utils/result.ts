export type Result<T, E = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export async function fromPromise<T>(p: Promise<T>): Promise<Result<T, unknown>> {
  try {
    return ok(await p);
  } catch (e) {
    return err(e);
  }
}
