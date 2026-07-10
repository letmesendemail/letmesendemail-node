export class LetMeSendEmailError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly apiCode?: string,
    public readonly validationErrors?: Record<string, string[]>,
    public readonly requestId?: string,
    public readonly responseHeaders?: Record<string, string>,
    public readonly rawBody?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ApiError extends LetMeSendEmailError {}
export class AuthenticationError extends LetMeSendEmailError {}
export class AuthorizationError extends LetMeSendEmailError {}
export class ValidationError extends LetMeSendEmailError {}
export class RateLimitError extends LetMeSendEmailError {
  constructor(
    message: string,
    statusCode?: number,
    apiCode?: string,
    validationErrors?: Record<string, string[]>,
    requestId?: string,
    responseHeaders?: Record<string, string>,
    rawBody?: string,
    public readonly retryAfter?: number,
    public readonly limit?: number,
    public readonly remaining?: number,
    public readonly resetAt?: string,
  ) {
    super(message, statusCode, apiCode, validationErrors, requestId, responseHeaders, rawBody);
  }
}
export class NotFoundError extends LetMeSendEmailError {}
export class ConflictError extends LetMeSendEmailError {}
export class NetworkError extends LetMeSendEmailError {}
export class TimeoutError extends LetMeSendEmailError {}
export class WebhookVerificationError extends LetMeSendEmailError {}
export class WebhookSigningError extends LetMeSendEmailError {}

export function errorFromStatusCode(
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  rawBodyText?: string,
): LetMeSendEmailError {
  const message = (body.message as string) ?? "Unknown error.";
  const apiCode = (body.name as string) ?? undefined;
  const validationErrors = (body.errors as Record<string, string[]>) ?? undefined;
  const rawBody = rawBodyText ?? JSON.stringify(body);
  const requestId = headers["x-request-id"] ?? undefined;

  const make = (
    ErrorClass: new (
      message: string,
      statusCode?: number,
      apiCode?: string,
      validationErrors?: Record<string, string[]>,
      requestId?: string,
      responseHeaders?: Record<string, string>,
      rawBody?: string,
    ) => LetMeSendEmailError,
  ) => {
    return new ErrorClass(message, status, apiCode, validationErrors, requestId, headers, rawBody);
  };

  switch (status) {
    case 400:
    case 413:
    case 422:
      return make(ValidationError);
    case 401:
      return make(AuthenticationError);
    case 403:
      return make(AuthorizationError);
    case 404:
      return make(NotFoundError);
    case 409:
      return make(ConflictError);
    case 429: {
      const retryAfter = headers["retry-after"]
        ? Number.parseInt(headers["retry-after"], 10)
        : undefined;
      const limit = headers["x-ratelimit-limit"]
        ? Number.parseInt(headers["x-ratelimit-limit"], 10)
        : undefined;
      const remaining = headers["x-ratelimit-remaining"]
        ? Number.parseInt(headers["x-ratelimit-remaining"], 10)
        : undefined;
      const resetAt = headers["x-ratelimit-reset"] ?? undefined;
      return new RateLimitError(
        message,
        status,
        apiCode,
        validationErrors,
        requestId,
        headers,
        rawBody,
        retryAfter,
        limit,
        remaining,
        resetAt,
      );
    }
    default:
      return make(ApiError);
  }
}
