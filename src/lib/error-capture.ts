let lastError: Error | null = null;

if (typeof globalThis !== "undefined") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (args[0] instanceof Error) lastError = args[0];
    origError.apply(console, args);
  };
}

export function consumeLastCapturedError(): Error | null {
  const err = lastError;
  lastError = null;
  return err;
}
