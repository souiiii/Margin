import { ZodError } from "zod";
import { AppError } from "./errors";
const identifier = (value: unknown) =>
  typeof value === "string" && /^[a-zA-Z0-9_.:[\]-]{1,200}$/.test(value)
    ? value
    : undefined;
/** Strict metadata allowlist. Never log messages, stacks, requests, bodies, or headers. */
export function logAIFailure(
  error: unknown,
  action: string,
  diagnosticId: string,
) {
  if (error instanceof AppError && error.code === "cancelled") return;
  const provider = error instanceof AppError ? error : undefined;
  console.error(
    JSON.stringify({
      event: "margin.ai.failure",
      diagnosticId,
      action: [
        "analyze",
        "define",
        "questions",
        "practice",
        "evaluate",
        "production",
        "daily",
      ].includes(action)
        ? action
        : "request",
      code: identifier(
        error instanceof AppError
          ? error.code
          : error instanceof ZodError
            ? "validation"
            : "internal_error",
      ),
      status:
        error instanceof AppError
          ? error.status
          : error instanceof ZodError
            ? 400
            : 500,
      providerStatus: provider?.providerStatus,
      transportStatus: provider?.transportStatus,
      requestId: identifier(
        error instanceof AppError ? error.requestId : undefined,
      ),
      responseId: identifier(provider?.responseId),
      eventType: identifier(provider?.eventType),
      param: identifier(provider?.param),
    }),
  );
}
