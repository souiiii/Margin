import { AppError } from "./errors";

export interface ProviderFailure {
  providerCode?: string | null;
  providerMessage?: string;
  providerStatus?: number;
  transportStatus?: number;
  requestId?: string;
  responseId?: string;
  param?: string | null;
  providerType?: string;
  eventType?: string;
}
export class ProviderError extends AppError implements ProviderFailure {
  declare providerCode?: string | null;
  declare providerMessage?: string;
  declare providerStatus?: number;
  declare transportStatus?: number;
  declare responseId?: string;
  declare param?: string | null;
  providerType?: string;
  declare eventType?: string;
  constructor(message: string, failure: ProviderFailure) {
    const actualStatus = failure.providerStatus ?? failure.transportStatus;
    super(
      message,
      actualStatus && actualStatus >= 400 ? actualStatus : 502,
      failure.providerCode ||
        (actualStatus && actualStatus >= 400
          ? `http_${actualStatus}`
          : "provider_error"),
      failure.requestId,
    );
    Object.assign(this, failure);
  }
}
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const string = (value: unknown) =>
  typeof value === "string" ? value : undefined;
const status = (value: unknown) =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 100 &&
  value <= 599
    ? value
    : undefined;
const messages: Record<string, string> = {
  subscription_sharing_usage_limit_exceeded:
    "ChatGPT usage limit reached. Review Margin’s allowance in ChatGPT Settings → Usage, then try again when available.",
  subscription_sharing_usage_unavailable:
    "ChatGPT cannot check usage right now. Try again later.",
  subscription_sharing_user_not_eligible:
    "ChatGPT plan usage is unavailable for this account or workspace.",
  subscription_sharing_unsupported_capability:
    "ChatGPT rejected an unsupported request setting. Review the model and reasoning settings.",
  subscription_sharing_route_not_supported:
    "The ChatGPT plan route is unavailable. Check your connection in Settings.",
  subscription_sharing_invalid_user:
    "ChatGPT could not validate this account. Reconnect it in Settings.",
  chatpass_v2_scope_not_authorized:
    "ChatGPT plan permission was not accepted. Reconnect and enable plan usage.",
  chatpass_v2_invalid_authorization_context:
    "ChatGPT plan permission was not accepted. Reconnect and enable plan usage.",
  rate_limit_exceeded:
    "ChatGPT is limiting requests. Wait before trying again.",
  server_error:
    "ChatGPT encountered a server error. Try this request again later.",
  context_length_exceeded:
    "This reading is too long for the selected model. Use a shorter passage or choose another model.",
  invalid_api_key:
    "Your ChatGPT session was not accepted. Reconnect ChatGPT in Settings.",
  unsupported_parameter:
    "ChatGPT rejected a request setting. Review the provider details below.",
  invalid_request_error:
    "ChatGPT could not accept this request. Review the provider details below.",
};
/** Accept documented flat error events, response.failed, and nested error envelopes. */
export function normalizeProviderError(
  payload: unknown,
  context: ProviderFailure = {},
): ProviderError {
  const envelope = record(payload),
    response = record(envelope.response);
  let error = record(response.error);
  if (!Object.keys(error).length) error = record(envelope.error);
  if (!Object.keys(error).length) error = envelope;
  if (error.error && typeof error.message !== "string")
    error = record(error.error);
  const code =
    string(error.code) ??
    string(envelope.code) ??
    (error.code === null ? null : undefined);
  const providerMessage =
    string(error.message) ??
    string(envelope.message) ??
    string(envelope.detail);
  const failure: ProviderFailure = {
    providerCode: code,
    providerMessage,
    providerStatus:
      status(error.status_code) ??
      status(error.status) ??
      status(response.status_code) ??
      status(envelope.status_code) ??
      status(envelope.status) ??
      context.providerStatus,
    transportStatus: context.transportStatus,
    requestId:
      context.requestId ??
      string(envelope.request_id) ??
      string(error.request_id) ??
      string(response.request_id),
    responseId:
      string(response.id) ?? string(envelope.response_id) ?? context.responseId,
    param:
      typeof error.param === "string" || error.param === null
        ? error.param
        : undefined,
    providerType: string(error.type),
    eventType: string(envelope.type) ?? context.eventType,
  };
  const fallback =
    failure.transportStatus === 401
      ? "Your ChatGPT session was not accepted. Reconnect in Settings."
      : failure.transportStatus === 403
        ? "ChatGPT denied this request. Check your account permissions in Settings."
        : failure.transportStatus === 503
          ? "ChatGPT is temporarily unavailable. Try again later."
          : "ChatGPT could not complete the request. Try again later; your saved work is safe.";
  return new ProviderError(
    (code && messages[code]) || providerMessage || fallback,
    failure,
  );
}
export async function providerError(
  response: Response,
): Promise<ProviderError> {
  const data = await response.json().catch(() => ({}));
  return normalizeProviderError(data, {
    transportStatus: response.status,
    requestId: response.headers.get("x-request-id") || undefined,
  });
}
