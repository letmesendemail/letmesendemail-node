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
  test("LetMeSendEmailError is base class", () => {
    const err = new LetMeSendEmailError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("LetMeSendEmailError");
  });

  test("all error classes extend LetMeSendEmailError", () => {
    expect(new ApiError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new AuthenticationError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new AuthorizationError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new ValidationError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new RateLimitError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new NotFoundError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new ConflictError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new NetworkError("test")).toBeInstanceOf(LetMeSendEmailError);
    expect(new TimeoutError("test")).toBeInstanceOf(LetMeSendEmailError);
  });

  test("errorFromStatusCode maps 401 to AuthenticationError", () => {
    const err = errorFromStatusCode(401, { message: "Unauthorized", name: "unauthorized" }, {});
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.message).toBe("Unauthorized");
    expect(err.apiCode).toBe("unauthorized");
  });

  test("errorFromStatusCode maps 404 to NotFoundError", () => {
    const err = errorFromStatusCode(404, { message: "Not found", name: "not_found" }, {});
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

  test("errorFromStatusCode maps 429 to RateLimitError", () => {
    const err = errorFromStatusCode(
      429,
      { message: "Rate limited", name: "rate_limited" },
      { "retry-after": "120" },
    ) as RateLimitError;
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBe(120);
  });

  test("errorFromStatusCode maps 500 to ApiError", () => {
    const err = errorFromStatusCode(500, { message: "Server error" }, {});
    expect(err).toBeInstanceOf(ApiError);
  });

  test("errorFromStatusCode maps 400 to ValidationError", () => {
    const err = errorFromStatusCode(400, { message: "Bad request" }, {});
    expect(err).toBeInstanceOf(ValidationError);
  });

  test("errorFromStatusCode maps 403 to AuthorizationError", () => {
    const err = errorFromStatusCode(403, { message: "Forbidden" }, {});
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  test("errorFromStatusCode maps 409 to ConflictError", () => {
    const err = errorFromStatusCode(409, { message: "Conflict" }, {});
    expect(err).toBeInstanceOf(ConflictError);
  });

  test("errorFromStatusCode maps 413 to ValidationError", () => {
    const err = errorFromStatusCode(413, { message: "Too large" }, {});
    expect(err).toBeInstanceOf(ValidationError);
  });
});
