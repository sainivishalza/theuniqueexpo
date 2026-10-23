import type { Instrumentation } from "next";

// Reports the errors the website runs into (see src/lib/server/error-log.ts). `register` runs once when the server starts;
// `onRequestError` runs for an error nobody caught while answering a request (a page or an API route).

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const flag = globalThis as unknown as { __errorsHooked?: boolean };
  if (flag.__errorsHooked) return;
  flag.__errorsHooked = true;
  // Many routes catch an error, log it with console.error and answer 500; those are reported too. The original console.error still runs.
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    try {
      const first = args.find((a) => a instanceof Error) as Error | undefined;
      // "Login error: <the error's message>": the words that were logged, then each error's message.
      const message = args.map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : "")).filter(Boolean).join(" ").slice(0, 500);
      if (!message) return;
      void import("@/lib/server/error-log").then((m) => m.recordError({ source: "server", message, detail: first?.stack ?? "" }));
    } catch {
      /* reporting must never break the thing that is being reported */
    }
  };
}

export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const error = err as { message?: string; stack?: string; digest?: string };
  const { recordError } = await import("@/lib/server/error-log");
  await recordError({ source: "server", message: String(error?.message ?? err), detail: error?.stack ?? "", path: `${request.method} ${request.path}` });
};
