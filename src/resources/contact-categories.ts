import type { HttpClient } from "../client.js";
import {
  normalizeContactCategoryItem,
  normalizePagination,
  normalizeStatus,
} from "../normalize.js";
import type { ContactCategoryItem, ContactCategoryListResponse, StatusResponse } from "../types.js";

export class ContactCategoriesResource {
  constructor(private http: HttpClient) {}

  async create(name: string, slug?: string): Promise<ContactCategoryItem> {
    const body: Record<string, unknown> = { name };
    if (slug !== undefined) body.slug = slug;
    const data = await this.http.request("POST", "/contact-categories", body);
    return normalizeContactCategoryItem(data);
  }

  async list(
    perPage?: number,
    after?: string,
    before?: string,
  ): Promise<ContactCategoryListResponse> {
    const query = new URLSearchParams();
    if (perPage !== undefined) query.set("per_page", String(perPage));
    if (after !== undefined) query.set("after", after);
    if (before !== undefined) query.set("before", before);

    const qs = query.toString();
    const path = qs ? `/contact-categories?${qs}` : "/contact-categories";

    const data = await this.http.request("GET", path);
    return {
      data: (data.data as Record<string, unknown>[]).map(normalizeContactCategoryItem),
      pagination: normalizePagination(data.pagination as Record<string, unknown>),
    };
  }

  async get(id: string): Promise<ContactCategoryItem> {
    const data = await this.http.request("GET", `/contact-categories/${id}`);
    return normalizeContactCategoryItem(data);
  }

  async update(id: string, name: string, slug?: string): Promise<ContactCategoryItem> {
    const body: Record<string, unknown> = { name };
    if (slug !== undefined) body.slug = slug;
    const data = await this.http.request("PUT", `/contact-categories/${id}`, body);
    return normalizeContactCategoryItem(data);
  }

  async delete(id: string): Promise<StatusResponse> {
    const data = await this.http.request("DELETE", `/contact-categories/${id}`);
    return normalizeStatus(data);
  }
}
