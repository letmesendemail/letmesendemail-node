import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookSigningError, WebhookVerificationError } from "../errors.js";

const TOLERANCE_SECONDS = 300;
const REQUIRED_HEADERS = ["webhook-id", "webhook-log-id", "webhook-timestamp", "webhook-signature"];

export interface WebhookVerifyOptions {
  tolerance?: number;
}

/**
 * Normalize incoming webhook headers into a plain lower-case map.
 * Accepts:
 * - plain `Record<string, string | string[] | undefined>`
 * - the Web API `Headers` class
 * - varied header casing (Web-Header-Id, webhook-id, etc.)
 * - `HTTP_` / `http_` server-style keys
 * - array header values (takes first)
 */
function resolveHeaders(
  headers: Record<string, string | string[] | undefined> | Headers,
): Record<string, string | undefined> {
  const map: Record<string, string | undefined> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      map[key.toLowerCase()] = value;
    });
  } else {
    for (const [key, value] of Object.entries(headers)) {
      const lower = key.toLowerCase();
      map[lower] = Array.isArray(value) ? value[0] : value;
    }
  }

  return map;
}

function getHeader(map: Record<string, string | undefined>, name: string): string | undefined {
  const canon = name.toLowerCase();
  const httpKey = `http_${name.replace(/-/g, "_").toLowerCase()}`;
  return map[canon] ?? map[httpKey] ?? undefined;
}

/**
 * Verify a webhook payload.
 */
export function verify(
  payload: string,
  headers: Record<string, string | string[] | undefined> | Headers,
  secret: string,
  options?: WebhookVerifyOptions,
): Record<string, unknown> {
  const tolerance = options?.tolerance ?? TOLERANCE_SECONDS;
  const map = resolveHeaders(headers);

  const resolved: Record<string, string> = {};
  for (const h of REQUIRED_HEADERS) {
    const value = getHeader(map, h);
    if (value === undefined || value === "") {
      throw new WebhookVerificationError(`Missing required webhook header: ${h}.`);
    }
    resolved[h] = value;
  }

  const timestampStr = resolved["webhook-timestamp"];
  if (!/^\d+$/.test(timestampStr)) {
    throw new WebhookVerificationError("Webhook timestamp is not numeric.");
  }

  const timestamp = Number.parseInt(timestampStr, 10);
  const now = Math.floor(Date.now() / 1000);

  if (timestamp <= 0) {
    throw new WebhookVerificationError("Webhook timestamp must be a positive integer.");
  }
  if (timestamp < now - tolerance) {
    throw new WebhookVerificationError("Webhook timestamp is too old.");
  }
  if (timestamp > now + tolerance) {
    throw new WebhookVerificationError("Webhook timestamp is too far in the future.");
  }

  const signedPayload = `${resolved["webhook-id"]}.${resolved["webhook-log-id"]}.${timestampStr}.${payload}`;

  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(rawSecret)) {
    throw new WebhookSigningError("Webhook secret could not be decoded.");
  }

  const decodedSecret = Buffer.from(rawSecret, "base64");
  if (decodedSecret.byteLength === 0) {
    throw new WebhookSigningError("Webhook secret could not be decoded.");
  }

  const hexHash = createHmac("sha256", decodedSecret).update(signedPayload).digest("hex");
  const expectedSig = Buffer.from(hexHash, "hex").toString("base64");
  const expectedBuf = Buffer.from(expectedSig);

  const entries = resolved["webhook-signature"].split(" ");
  let matchFound = false;
  for (const entry of entries) {
    const trimmed = entry.trim();
    const commaIndex = trimmed.indexOf(",");
    if (commaIndex === -1) continue;
    const version = trimmed.slice(0, commaIndex);
    const candidate = trimmed.slice(commaIndex + 1);
    if (version !== "v1") continue;
    const candidateBuf = Buffer.from(candidate);
    if (
      candidateBuf.byteLength === expectedBuf.byteLength &&
      timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      matchFound = true;
      break;
    }
  }

  if (!matchFound) {
    throw new WebhookVerificationError("No matching webhook signature found.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new WebhookVerificationError("Webhook payload is not valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new WebhookVerificationError("Webhook payload must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}
