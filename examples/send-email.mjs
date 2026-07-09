import { LetMeSendEmail } from "../dist/index.mjs";

const client = new LetMeSendEmail(process.env.LETMESENDEMAIL_API_KEY ?? "lms_live_...");

try {
  const email = await client.emails.send({
    from: "Acme <hello@acme.com>",
    to: ["person@example.com"],
    subject: "Hello from letmesend.email",
    html: "<p>Hello from letmesend.email</p>",
    type: "transactional",
  });

  console.log("Email sent!");
  console.log("  ID:", email.id);
  console.log("  Status:", email.status);
  console.log("  Recipients:", email.emails.join(", "));
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : err);
}
