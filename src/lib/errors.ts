export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "request_error",
    public requestId?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function errorPayload(error: unknown) {
  if (error instanceof AppError)
    return {
      error: error.message,
      code: error.code,
      requestId: error.requestId,
      details: error.details,
    };
  if (error instanceof Error && error.name === "AbortError")
    return { error: "Request cancelled.", code: "cancelled" };
  return {
    error: "Something went wrong. Your saved work is safe. Please try again.",
    code: "internal_error",
  };
}
