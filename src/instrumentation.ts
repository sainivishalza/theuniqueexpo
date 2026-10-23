import type { Instrumentation } from "next";

// Reports the errors the website runs into (see src/lib/server/error-log.ts). `register` runs once when the server starts;
// `onRequestError` runs for an error nobody caught while answering a request (a page or an API route). The work is in
// instrumentation-node.ts, loaded only by the Node.js server.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    (await import("./instrumentation-node")).registerNode();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await (await import("./instrumentation-node")).reportRequestError(err, request);
  }
};
