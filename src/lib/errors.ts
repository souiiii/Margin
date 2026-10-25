export class AppError extends Error {
  declare providerCode?: string | null;
  declare providerMessage?: string;
  declare providerStatus?: number;
  declare transportStatus?: number;
  declare responseId?: string;
  declare param?: string | null;
  declare eventType?: string;
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
      status: error.status,
      providerCode: error.providerCode,
      providerMessage: error.providerMessage,
      providerStatus: error.providerStatus,
      transportStatus: error.transportStatus,
      responseId: error.responseId,
      param: error.param,
      eventType: error.eventType,
      code: error.code,
      requestId: error.requestId,
    };
  if (error instanceof Error && error.name === "AbortError")
    return { error: "Request cancelled.", code: "cancelled" };
  return {
    error: "Something went wrong. Your saved work is safe. Please try again.",
    code: "internal_error",
  };
}
