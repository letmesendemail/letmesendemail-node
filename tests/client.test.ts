import { describe, expect, test } from "vitest";
import { HttpClient } from "../src/client.js";
import { LetMeSendEmail } from "../src/index.js";

describe("client config", () => {
  test("accepts string api key", () => {
    const client = new LetMeSendEmail("lms_live_test");
    expect(client).toBeInstanceOf(LetMeSendEmail);
  });

  test("accepts config object", () => {
    const client = new LetMeSendEmail({
      apiKey: "lms_live_test",
      baseUrl: "https://custom.example.com/api",
      timeoutMs: 60_000,
    });
    expect(client).toBeInstanceOf(LetMeSendEmail);
  });

  test("uses default base URL when not provided", () => {
    const http = new HttpClient("lms_live_test");
    const config = http.getConfig();
    expect(config.baseUrl).toBe("https://letmesend.email/api/v1");
  });

  test("uses custom base URL", () => {
    const http = new HttpClient({ apiKey: "test", baseUrl: "https://custom.test/api" });
    const config = http.getConfig();
    expect(config.baseUrl).toBe("https://custom.test/api");
  });

  test("uses default timeout when not provided", () => {
    const http = new HttpClient("lms_live_test");
    const config = http.getConfig();
    expect(config.timeoutMs).toBe(30_000);
  });

  test("uses custom timeout", () => {
    const http = new HttpClient({ apiKey: "test", timeoutMs: 10_000 });
    const config = http.getConfig();
    expect(config.timeoutMs).toBe(10_000);
  });

  test("default retries is 0", () => {
    const http = new HttpClient("lms_live_test");
    const config = http.getConfig();
    expect(config.retries).toBe(0);
  });
});

describe("client resources", () => {
  test("emails resource is accessible", () => {
    const client = new LetMeSendEmail("lms_live_test");
    expect(client.emails).toBeDefined();
  });

  test("domains resource is accessible", () => {
    const client = new LetMeSendEmail("lms_live_test");
    expect(client.domains).toBeDefined();
  });

  test("contacts resource is accessible", () => {
    const client = new LetMeSendEmail("lms_live_test");
    expect(client.contacts).toBeDefined();
  });

  test("contactCategories resource is accessible", () => {
    const client = new LetMeSendEmail("lms_live_test");
    expect(client.contactCategories).toBeDefined();
  });

  test("emailTopics resource is accessible", () => {
    const client = new LetMeSendEmail("lms_live_test");
    expect(client.emailTopics).toBeDefined();
  });
});
