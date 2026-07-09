import { HttpClient } from "./client.js";
import type { LetMeSendEmailConfig } from "./config.js";
import { ContactCategoriesResource } from "./resources/contact-categories.js";
import { ContactsResource } from "./resources/contacts.js";
import { DomainsResource } from "./resources/domains.js";
import { EmailTopicsResource } from "./resources/email-topics.js";
import { EmailsResource } from "./resources/emails.js";
import { verify as verifyWebhook } from "./webhooks/verify.js";

export * from "./errors.js";
export * from "./types.js";
export type { LetMeSendEmailConfig };

export class LetMeSendEmail {
  private http: HttpClient;

  constructor(configOrKey: string | LetMeSendEmailConfig) {
    this.http = new HttpClient(configOrKey);
  }

  get emails(): EmailsResource {
    return new EmailsResource(this.http);
  }

  get domains(): DomainsResource {
    return new DomainsResource(this.http);
  }

  get contacts(): ContactsResource {
    return new ContactsResource(this.http);
  }

  get contactCategories(): ContactCategoriesResource {
    return new ContactCategoriesResource(this.http);
  }

  get emailTopics(): EmailTopicsResource {
    return new EmailTopicsResource(this.http);
  }

  static verifyWebhook = verifyWebhook;
}
