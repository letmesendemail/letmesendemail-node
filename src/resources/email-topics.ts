import type { HttpClient } from "../client.js";
import { normalizeEmailTopicItem, normalizePagination, normalizeStatus } from "../normalize.js";
import type {
  CreateEmailTopicRequest,
  EmailTopicItem,
  EmailTopicListResponse,
  StatusResponse,
  UpdateEmailTopicRequest,
} from "../types.js";

export class EmailTopicsResource {
  constructor(private http: HttpClient) {}

  async create(req: CreateEmailTopicRequest): Promise<EmailTopicItem> {
    const body: Record<string, unknown> = { name: req.name, slug: req.slug };
    if (req.autoSubscribe !== undefined) body.auto_subscribe = req.autoSubscribe;
    if (req.public !== undefined) body.public = req.public;
    if (req.description !== undefined) body.description = req.description;
    if (req.domainId !== undefined) body.domain = { id: req.domainId };

    const data = await this.http.request("POST", "/email-topics", body);
    return normalizeEmailTopicItem(data);
  }

  async list(perPage?: number, after?: string, before?: string): Promise<EmailTopicListResponse> {
    const query = new URLSearchParams();
    if (perPage !== undefined) query.set("per_page", String(perPage));
    if (after !== undefined) query.set("after", after);
    if (before !== undefined) query.set("before", before);

    const qs = query.toString();
    const path = qs ? `/email-topics?${qs}` : "/email-topics";

    const data = await this.http.request("GET", path);
    return {
      data: (data.data as Record<string, unknown>[]).map(normalizeEmailTopicItem),
      pagination: normalizePagination(data.pagination as Record<string, unknown>),
    };
  }

  async get(id: string): Promise<EmailTopicItem> {
    const data = await this.http.request("GET", `/email-topics/${id}`);
    return normalizeEmailTopicItem(data);
  }

  async update(id: string, req: UpdateEmailTopicRequest): Promise<EmailTopicItem> {
    const body: Record<string, unknown> = {};
    if (req.name !== undefined) body.name = req.name;
    if (req.slug !== undefined) body.slug = req.slug;
    if (req.description !== undefined) body.description = req.description;
    if (req.public !== undefined) body.public = req.public;
    if (req.autoSubscribe !== undefined) body.auto_subscribe = req.autoSubscribe;

    const data = await this.http.request("PUT", `/email-topics/${id}`, body);
    return normalizeEmailTopicItem(data);
  }

  async delete(id: string): Promise<StatusResponse> {
    const data = await this.http.request("DELETE", `/email-topics/${id}`);
    return normalizeStatus(data);
  }
}
