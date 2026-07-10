// ── Shared types ──

export interface PaginationInfo {
  hasMore: boolean;
  perPage: number;
  fetched: number;
  total: number;
}

// ── Emails ──

export interface SendEmailRequest {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  type?: "broadcast" | "transactional";
  eventName?: string;
  emailTopicId?: string;
  replyTo?: string[];
  cc?: string[];
  bcc?: string[];
  headers?: Record<string, string>;
  attachments?: SendAttachment[];
  idempotencyKey?: string;
}

export interface SendWithTemplateRequest {
  from: string;
  to: string[];
  templateId: string;
  subject?: string;
  templateVariables?: TemplateVariable[];
  type?: "broadcast" | "transactional";
  eventName?: string;
  emailTopicId?: string;
  replyTo?: string[];
  cc?: string[];
  bcc?: string[];
  headers?: Record<string, string>;
  attachments?: SendAttachment[];
  idempotencyKey?: string;
}

/**
 * Request attachment. Provide either `path` (a URL) or `content` (base64 data).
 * `name` is required. `mime` is recommended but not strictly required by the API.
 */
export interface SendAttachment {
  name: string;
  path?: string;
  content?: string;
  mime?: string;
  contentId?: string;
  contentDisposition?: string;
}

export interface TemplateVariable {
  key: string;
  type: "string" | "number";
  value: string | number;
}

export interface SendEmailResponse {
  id: string;
  status: string;
  emails: string[];
  restrictedEmails: string[];
  duplicate?: boolean;
}

export interface VerifyEmailResponse {
  email: string;
  score: number;
  status: string;
  domainExists: boolean;
  disposable: boolean;
  roleBased: boolean;
  hasMailbox: boolean;
  receiveEmail: boolean;
  mxRecords: boolean;
  validSyntax: boolean;
  belongsTo: string | null;
}

export interface EmailListItem {
  id: string;
  status: string;
  subject: string | null;
  eventName: string | null;
  type: string;
  createdAt: string;
  sentAt: string | null;
  recipientsCount: number;
  attachmentsCount: number;
}

export interface EmailListResponse {
  data: EmailListItem[];
  pagination: PaginationInfo;
}

export interface ShowEmailResponse {
  id: string;
  status: string;
  subject: string | null;
  eventName: string | null;
  type: string;
  createdAt: string;
  sentAt: string | null;
  recipientsCount: number;
  attachmentsCount: number;
  recipients: Recipient[];
  attachments: EmailAttachment[];
}

export interface Recipient {
  type: string;
  status: string;
  emailAddress: string;
  bounceType: string | null;
  bounceReason: string | null;
  bouncedAt: string | null;
  complaintType: string | null;
  complainedAt: string | null;
  isSuppressed: boolean;
  suppressionReason: string | null;
  openedAt: string | null;
  openCount: number;
  clickedAt: string | null;
  clickCount: number;
  failedAt: string | null;
  errorMessage: string | null;
  deliveredAt: string | null;
  sentAt: string | null;
}

export interface EmailAttachment {
  id: string;
  name: string;
  mime: string;
  contentId: string;
  contentDisposition: string;
  size: number;
  downloadUrl: string;
}

// ── Domains ──

export interface DomainItem {
  id: string;
  domainName: string;
  status: string;
  createdAt: string;
}

export interface DomainListResponse {
  data: DomainItem[];
  pagination: PaginationInfo;
}

export interface DomainVerifyResponse {
  status: string;
}

// ── Contacts ──

export interface CreateContactRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isGloballyUnsubscribed?: boolean;
  categories?: string[];
  emailTopics?: string[];
}

export interface UpdateContactRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isGloballyUnsubscribed?: boolean;
  categories?: string[];
  emailTopics?: string[];
  syncCategories?: boolean;
  syncEmailTopics?: boolean;
}

export interface ContactItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isGloballyUnsubscribed: boolean;
  createdAt: string;
  categories?: ContactCategoryRef[];
}

export interface ContactCategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface ContactListResponse {
  data: ContactItem[];
  pagination: PaginationInfo;
}

export interface ContactDeleteResponse {
  status: string;
}

// ── Contact Categories ──

export interface ContactCategoryItem {
  id: string;
  name: string;
  slug: string;
}

export interface ContactCategoryListResponse {
  data: ContactCategoryItem[];
  pagination: PaginationInfo;
}

export interface ContactCategoryDeleteResponse {
  status: string;
}

// ── Email Topics ──

export interface CreateEmailTopicRequest {
  name: string;
  slug: string;
  autoSubscribe?: boolean;
  public?: boolean;
  description?: string;
  domainId?: string;
}

export interface UpdateEmailTopicRequest {
  name?: string;
  slug?: string;
  description?: string;
  public?: boolean;
  autoSubscribe?: boolean;
}

export interface EmailTopicItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  autoSubscribe: boolean;
  public: boolean;
  createdAt: string;
  domain?: { id: string; name?: string };
}

export interface EmailTopicListResponse {
  data: EmailTopicItem[];
  pagination: PaginationInfo;
}

export interface EmailTopicDeleteResponse {
  status: string;
  message?: string;
}

// ── Status response (shared for delete / verify status) ──

export interface StatusResponse {
  status: string;
  message?: string;
}
