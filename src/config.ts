export interface LetMeSendEmailConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
}

export const DEFAULT_BASE_URL = "https://letmesend.email/api/v1";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_RETRIES = 0;

export function resolveConfig(
  configOrKey: string | LetMeSendEmailConfig,
): Required<LetMeSendEmailConfig> {
  const input: LetMeSendEmailConfig =
    typeof configOrKey === "string" ? { apiKey: configOrKey } : configOrKey;

  return {
    apiKey: input.apiKey,
    baseUrl: input.baseUrl ?? DEFAULT_BASE_URL,
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    retries: input.retries ?? DEFAULT_RETRIES,
  };
}
