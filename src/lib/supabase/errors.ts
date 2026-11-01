export type PersistenceError = Error & { code: string };

export function persistenceFailure(code: string, message: string): never {
  throw Object.assign(new Error(message),{ code }) satisfies PersistenceError;
}

export function checkDatabaseError(error: { code: string; message: string } | null): void {
  if(error) persistenceFailure(error.message.includes("VERSION_CONFLICT") ? "VERSION_CONFLICT" : error.code,
    "Database operation failed. Inspect server-side database diagnostics.");
}
