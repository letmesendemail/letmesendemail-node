import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { WebhookSigningError, WebhookVerificationError } from "../src/errors.js";
import { verify } from "../src/webhooks/verify.js";

function makeWebhookData(payload: Record<string, unknown>, secret: string, timestamp?: number) {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const rawPayload = JSON.stringify(payload);
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const decodedSecret = Buffer.from(rawSecret, "base64");

  const toSign = `web_123.web_log_123.${ts}.${rawPayload}`;
  const hexHash = createHmac("sha256", decodedSecret).update(toSign).digest("hex");
  const signature = Buffer.from(hexHash, "hex").toString("base64");

  return {
    payload: rawPayload,
    headers: {
      "webhook-id": "web_123",
      "webhook-log-id": "web_log_123",
      "webhook-timestamp": String(ts),
      "webhook-signature": `v1,${signature}`,
    },
  };
}

describe("webhook verification", () => {
  test("verifies a valid signature", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeWebhookData({ event: "email.sent" }, secret);

    const result = verify(data.payload, data.headers, secret);
    expect(result).toEqual({ event: "email.sent" });
  });

  test("verifies with whsec_ prefixed secret", () => {
    const raw = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const prefixedSecret = `whsec_${raw}`;
    const data = makeWebhookData({ event: "email.sent" }, prefixedSecret);

    const result = verify(data.payload, data.headers, prefixedSecret);
    expect(result).toEqual({ event: "email.sent" });
  });

  test("fails with wrong secret", () => {
    const secret1 = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const secret2 = Buffer.from("fedcba9876543210fedcba9876543210", "hex").toString("base64");
    const data = makeWebhookData({ event: "email.sent" }, secret1);

    expect(() => verify(data.payload, data.headers, secret2)).toThrow(WebhookVerificationError);
  });

  test("fails when timestamp is expired", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeWebhookData({ event: "test" }, secret, Math.floor(Date.now() / 1000) - 600);

    expect(() => verify(data.payload, data.headers, secret)).toThrow(
      "Webhook timestamp is too old.",
    );
  });

  test("fails when timestamp is too new", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeWebhookData({ event: "test" }, secret, Math.floor(Date.now() / 1000) + 600);

    expect(() => verify(data.payload, data.headers, secret)).toThrow(
      "Webhook timestamp is too far in the future.",
    );
  });

  test("fails when required headers are missing", () => {
    expect(() => verify("{}", {}, "secret")).toThrow(WebhookVerificationError);
  });

  test("fails when timestamp is not numeric", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeWebhookData({ event: "test" }, secret);
    data.headers["webhook-timestamp"] = "not-a-number";

    expect(() => verify(data.payload, data.headers, secret)).toThrow(
      "Webhook timestamp is not numeric.",
    );
  });

  test("supports multiple signatures with one v1 match", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeWebhookData({ event: "test" }, secret);
    data.headers["webhook-signature"] = `v1,badsig ${data.headers["webhook-signature"]}`;

    const result = verify(data.payload, data.headers, secret);
    expect(result).toEqual({ event: "test" });
  });

  test("ignores unknown signature versions", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeWebhookData({ event: "test" }, secret);
    data.headers["webhook-signature"] = `v2,ignored v0,also ${data.headers["webhook-signature"]}`;

    const result = verify(data.payload, data.headers, secret);
    expect(result).toEqual({ event: "test" });
  });

  test("supports lowercase headers", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeWebhookData({ event: "email.delivered" }, secret);

    const lowerHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.headers)) {
      lowerHeaders[k.toLowerCase()] = v;
    }

    const result = verify(data.payload, lowerHeaders, secret);
    expect(result).toEqual({ event: "email.delivered" });
  });

  test("supports HTTP_ prefixed headers", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeWebhookData({ event: "email.complaint" }, secret);

    const httpHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.headers)) {
      const httpKey = `http_${k.replace(/-/g, "_")}`;
      httpHeaders[httpKey] = v;
    }

    const result = verify(data.payload, httpHeaders, secret);
    expect(result).toEqual({ event: "email.complaint" });
  });

  test("fails on malformed JSON", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const ts = Math.floor(Date.now() / 1000);
    const rawPayload = "not-json";
    const toSign = `web_123.web_log_123.${ts}.${rawPayload}`;
    const hexHash = createHmac("sha256", Buffer.from(secret, "base64"))
      .update(toSign)
      .digest("hex");
    const signature = Buffer.from(hexHash, "hex").toString("base64");

    expect(() =>
      verify(
        rawPayload,
        {
          "webhook-id": "web_123",
          "webhook-log-id": "web_log_123",
          "webhook-timestamp": String(ts),
          "webhook-signature": `v1,${signature}`,
        },
        secret,
      ),
    ).toThrow(WebhookVerificationError);
  });

  test("fails when secret cannot be decoded", () => {
    expect(() =>
      verify(
        "{}",
        {
          "webhook-id": "id",
          "webhook-log-id": "log",
          "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
          "webhook-signature": "v1,sig",
        },
        "not-base64!!!?",
      ),
    ).toThrow(WebhookSigningError);
  });
});
