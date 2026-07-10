import type { HttpClient } from "../client.js";
import { normalizeContactItem, normalizePagination, normalizeStatus } from "../normalize.js";
import type {
  ContactItem,
  ContactListResponse,
  CreateContactRequest,
  StatusResponse,
  UpdateContactRequest,
} from "../types.js";

export class ContactsResource {
  constructor(private http: HttpClient) {}

  async create(req: CreateContactRequest): Promise<ContactItem> {
    const body: Record<string, unknown> = { email: req.email };
    if (req.firstName !== undefined) body.first_name = req.firstName;
    if (req.lastName !== undefined) body.last_name = req.lastName;
    if (req.phone !== undefined) body.phone = req.phone;
    if (req.isGloballyUnsubscribed !== undefined)
      body.is_globally_unsubscribed = req.isGloballyUnsubscribed;
    if (req.categories !== undefined) body.categories = req.categories;
    if (req.emailTopics !== undefined) body.email_topics = req.emailTopics;

    const data = await this.http.request("POST", "/contacts", body);
    return normalizeContactItem(data);
  }

  async list(perPage?: number, after?: string, before?: string): Promise<ContactListResponse> {
    const query = new URLSearchParams();
    if (perPage !== undefined) query.set("per_page", String(perPage));
    if (after !== undefined) query.set("after", after);
    if (before !== undefined) query.set("before", before);

    const qs = query.toString();
    const path = qs ? `/contacts?${qs}` : "/contacts";

    const data = await this.http.request("GET", path);
    return {
      data: (data.data as Record<string, unknown>[]).map(normalizeContactItem),
      pagination: normalizePagination(data.pagination as Record<string, unknown>),
    };
  }

  async get(id: string): Promise<ContactItem> {
    const data = await this.http.request("GET", `/contacts/${id}`);
    return normalizeContactItem(data);
  }

  /**
   * The update endpoint returns only `{ id }`. Returns a minimal object.
   */
  async update(id: string, req: UpdateContactRequest): Promise<{ id: string }> {
    const body: Record<string, unknown> = {};
    if (req.firstName !== undefined) body.first_name = req.firstName;
    if (req.lastName !== undefined) body.last_name = req.lastName;
    if (req.phone !== undefined) body.phone = req.phone;
    if (req.isGloballyUnsubscribed !== undefined)
      body.is_globally_unsubscribed = req.isGloballyUnsubscribed;
    if (req.categories !== undefined) body.categories = req.categories;
    if (req.emailTopics !== undefined) body.email_topics = req.emailTopics;
    if (req.syncCategories !== undefined) body.sync_categories = req.syncCategories;
    if (req.syncEmailTopics !== undefined) body.sync_email_topics = req.syncEmailTopics;

    const data = await this.http.request("PUT", `/contacts/${id}`, body);
    return { id: data.id as string };
  }

  async delete(id: string): Promise<StatusResponse> {
    const data = await this.http.request("DELETE", `/contacts/${id}`);
    return normalizeStatus(data);
  }
}
