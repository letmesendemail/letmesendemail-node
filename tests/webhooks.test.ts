import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { WebhookSigningError, WebhookVerificationError } from "../src/errors.js";
import { verify } from "../src/webhooks/verify.js";

function makeData(payload: Record<string, unknown>, secret: string, timestamp?: number) {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const raw = JSON.stringify(payload);
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const decoded = Buffer.from(rawSecret, "base64");
  const toSign = `web_123.web_log_123.${ts}.${raw}`;
  const hexHash = createHmac("sha256", decoded).update(toSign).digest("hex");
  const sig = Buffer.from(hexHash, "hex").toString("base64");
  return {
    payload: raw,
    headers: {
      "webhook-id": "web_123",
      "webhook-log-id": "web_log_123",
      "webhook-timestamp": String(ts),
      "webhook-signature": `v1,${sig}`,
    },
  };
}

describe("webhook verification", () => {
  test("valid signature", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeData({ sample: "value" }, secret);
    expect(verify(data.payload, data.headers, secret)).toEqual({ sample: "value" });
  });

  test("whsec_ prefix", () => {
    const raw = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const prefixed = `whsec_${raw}`;
    const data = makeData({ sample: "value" }, prefixed);
    expect(verify(data.payload, data.headers, prefixed)).toEqual({ sample: "value" });
  });

  test("wrong secret", () => {
    const s1 = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const s2 = Buffer.from("fedcba9876543210fedcba9876543210", "hex").toString("base64");
    const data = makeData({ sample: "value" }, s1);
    expect(() => verify(data.payload, data.headers, s2)).toThrow(WebhookVerificationError);
  });

  test("expired timestamp", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeData({ sample: "value" }, secret, Math.floor(Date.now() / 1000) - 600);
    expect(() => verify(data.payload, data.headers, secret)).toThrow(/too old/);
  });

  test("future timestamp", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeData({ sample: "value" }, secret, Math.floor(Date.now() / 1000) + 600);
    expect(() => verify(data.payload, data.headers, secret)).toThrow(/too far/);
  });

  test("missing headers", () => {
    expect(() => verify("{}", {}, "secret")).toThrow(WebhookVerificationError);
  });

  test("non-numeric timestamp", () => {
    expect(() =>
      verify(
        "{}",
        {
          "webhook-id": "id",
          "webhook-log-id": "log",
          "webhook-timestamp": "abc",
          "webhook-signature": "v1,s",
        },
        "s",
      ),
    ).toThrow(/not numeric/);
  });

  test("multiple signatures", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeData({ sample: "value" }, secret);
    data.headers["webhook-signature"] = `v1,badsig ${data.headers["webhook-signature"]}`;
    expect(verify(data.payload, data.headers, secret)).toEqual({ sample: "value" });
  });

  test("ignores unknown versions", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeData({ sample: "value" }, secret);
    data.headers["webhook-signature"] = `v2,ignored ${data.headers["webhook-signature"]}`;
    expect(verify(data.payload, data.headers, secret)).toEqual({ sample: "value" });
  });

  test("varied header casing preserves values", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeData({ sample: "value" }, secret);
    // Vary key casing only — values stay untouched
    const mixed: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.headers)) {
      const upperKey = k.toUpperCase();
      mixed[upperKey] = v; // values unchanged
    }
    expect(verify(data.payload, mixed, secret)).toEqual({ sample: "value" });
  });

  test("HTTP_ server-style headers", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeData({ sample: "value" }, secret);
    const http: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.headers)) {
      const httpKey = `HTTP_${k.replace(/-/g, "_").toUpperCase()}`;
      http[httpKey] = v;
    }
    expect(verify(data.payload, http, secret)).toEqual({ sample: "value" });
  });

  test("Web API Headers class", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeData({ sample: "value" }, secret);
    const h = new Headers();
    for (const [k, v] of Object.entries(data.headers)) h.set(k, v);
    expect(verify(data.payload, h, secret)).toEqual({ sample: "value" });
  });

  test("array header values", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const data = makeData({ sample: "value" }, secret);
    const arr: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(data.headers)) arr[k] = [v];
    expect(verify(data.payload, arr, secret)).toEqual({ sample: "value" });
  });

  test("malformed JSON", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
    const ts = Math.floor(Date.now() / 1000);
    const toSign = `web_123.web_log_123.${ts}.not-json`;
    const hexHash = createHmac("sha256", Buffer.from(secret, "base64"))
      .update(toSign)
      .digest("hex");
    const sig = Buffer.from(hexHash, "hex").toString("base64");
    expect(() =>
      verify(
        "not-json",
        {
          "webhook-id": "web_123",
          "webhook-log-id": "web_log_123",
          "webhook-timestamp": String(ts),
          "webhook-signature": `v1,${sig}`,
        },
        secret,
      ),
    ).toThrow(WebhookVerificationError);
  });

  test("bad secret", () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      verify(
        "{}",
        {
          "webhook-id": "id",
          "webhook-log-id": "log",
          "webhook-timestamp": String(ts),
          "webhook-signature": "v1,sig",
        },
        "not-base64!!!?",
      ),
    ).toThrow(WebhookSigningError);
  });
});
