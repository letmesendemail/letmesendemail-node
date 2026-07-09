import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookSigningError, WebhookVerificationError } from "../errors.js";

const TOLERANCE_SECONDS = 300;

const REQUIRED_HEADERS = ["webhook-id", "webhook-log-id", "webhook-timestamp", "webhook-signature"];

function resolveHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();

  const candidates = [lower, `http_${name.replace(/-/g, "_").toLowerCase()}`];

  for (const key of candidates) {
    const raw = headers[key];
    if (raw !== undefined && raw !== "") {
      return Array.isArray(raw) ? raw[0] : raw;
    }
  }

  return undefined;
}

export interface WebhookVerifyOptions {
  tolerance?: number;
}

/**
 * Verify a webhook payload.
 */
export function verify(
  payload: string,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
  options?: WebhookVerifyOptions,
): Record<string, unknown> {
  const tolerance = options?.tolerance ?? TOLERANCE_SECONDS;

  const resolved: Record<string, string> = {};
  for (const h of REQUIRED_HEADERS) {
    const value = resolveHeader(headers, h);
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

  // Validate base64 before decoding (Node's Buffer.from base64 is lenient)
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(rawSecret)) {
    throw new WebhookSigningError("Webhook secret could not be decoded.");
  }

  const decodedSecret = Buffer.from(rawSecret, "base64");

  if (decodedSecret.byteLength === 0) {
    throw new WebhookSigningError("Webhook secret could not be decoded.");
  }

  const hexHash = createHmac("sha256", decodedSecret).update(signedPayload).digest("hex");
  const expectedSignature = Buffer.from(hexHash, "hex").toString("base64");
  const expectedBuf = Buffer.from(expectedSignature);

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
