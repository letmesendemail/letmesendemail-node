import { describe, expect, test } from "vitest";
import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  errorFromStatusCode,
  LetMeSendEmailError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from "../src/errors.js";

describe("error classes", () => {
  test("all classes extend LetMeSendEmailError", () => {
    expect(new ApiError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new AuthenticationError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new AuthorizationError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new ValidationError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new NotFoundError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new ConflictError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new RateLimitError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new NetworkError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new TimeoutError("test")).toBeInstanceOf(LetMeSendEmailError);
  });

  test("errorFromStatusCode maps 401 to AuthenticationError", () => {
    const err = errorFromStatusCode(401, { message: "Unauthorized", name: "unauth" }, {});
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.apiCode).toBe("unauth");
  });

  test("errorFromStatusCode maps 404 to NotFoundError", () => {
    const err = errorFromStatusCode(404, { message: "Not found" }, {});
    expect(err).toBeInstanceOf(NotFoundError);
  });

  test("errorFromStatusCode maps 422 to ValidationError", () => {
    const err = errorFromStatusCode(
      422,
      { message: "Invalid", errors: { email: ["Required"] } },
      {},
    );
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.validationErrors).toEqual({ email: ["Required"] });
  });

  test("errorFromStatusCode maps 429 to RateLimitError with retryAfter", () => {
    const err = errorFromStatusCode(429, { message: "Limited" }, { "retry-after": "120" });
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(120);
  });

  test("errorFromStatusCode maps 500 to ApiError", () => {
    const err = errorFromStatusCode(500, { message: "Server error" }, {});
    expect(err).toBeInstanceOf(ApiError);
  });

  test("errorFromStatusCode maps 400/413/422 to ValidationError", () => {
    expect(errorFromStatusCode(400, {}, {})).toBeInstanceOf(ValidationError);
    expect(errorFromStatusCode(413, {}, {})).toBeInstanceOf(ValidationError);
    expect(errorFromStatusCode(422, {}, {})).toBeInstanceOf(ValidationError);
  });

  test("errorFromStatusCode maps 403 to AuthorizationError", () => {
    expect(errorFromStatusCode(403, {}, {})).toBeInstanceOf(AuthorizationError);
  });

  test("errorFromStatusCode maps 409 to ConflictError", () => {
    expect(errorFromStatusCode(409, {}, {})).toBeInstanceOf(ConflictError);
  });
});
