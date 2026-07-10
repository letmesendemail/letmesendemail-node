import type { HttpClient } from "../client.js";
import { normalizeDomainItem, normalizePagination, normalizeStatus } from "../normalize.js";
import type { DomainItem, DomainListResponse, StatusResponse } from "../types.js";

export class DomainsResource {
  constructor(private http: HttpClient) {}

  async list(perPage?: number, after?: string, before?: string): Promise<DomainListResponse> {
    const query = new URLSearchParams();
    if (perPage !== undefined) query.set("per_page", String(perPage));
    if (after !== undefined) query.set("after", after);
    if (before !== undefined) query.set("before", before);

    const qs = query.toString();
    const path = qs ? `/domains?${qs}` : "/domains";

    const data = await this.http.request("GET", path);
    return {
      data: (data.data as Record<string, unknown>[]).map(normalizeDomainItem),
      pagination: normalizePagination(data.pagination as Record<string, unknown>),
    };
  }

  async get(id: string): Promise<DomainItem> {
    const data = await this.http.request("GET", `/domains/${id}`);
    return normalizeDomainItem(data);
  }

  async verify(domain: string): Promise<StatusResponse> {
    const data = await this.http.request("POST", "/domains/verify", { domain });
    return normalizeStatus(data);
  }
}
