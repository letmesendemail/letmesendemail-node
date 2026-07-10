import type { PaginationInfo, StatusResponse } from "./types.js";

export function normalizePagination(raw: Record<string, unknown>): PaginationInfo {
  return {
    hasMore: (raw.has_more as boolean) ?? false,
    perPage: (raw.per_page as number) ?? 0,
    fetched: (raw.fetched as number) ?? 0,
    total: (raw.total as number) ?? 0,
  };
}

export function normalizeStatus(raw: Record<string, unknown>): StatusResponse {
  return {
    status: (raw.status as string) ?? "",
    message: (raw.message as string) ?? undefined,
  };
}

export function normalizeSendEmailResponse(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    status: raw.status as string,
    emails: (raw.emails as string[]) ?? [],
    restrictedEmails: (raw.restricted_emails as string[]) ?? [],
    duplicate: (raw.duplicate as boolean) ?? false,
  };
}

export function normalizeVerifyEmailResponse(raw: Record<string, unknown>) {
  return {
    email: raw.email as string,
    score: (raw.score as number) ?? 0,
    status: raw.status as string,
    domainExists: (raw.domain_exists as boolean) ?? false,
    disposable: (raw.disposable as boolean) ?? false,
    roleBased: (raw.role_based as boolean) ?? false,
    hasMailbox: (raw.has_mailbox as boolean) ?? false,
    receiveEmail: (raw.receive_email as boolean) ?? false,
    mxRecords: (raw.mx_records as boolean) ?? false,
    validSyntax: (raw.valid_syntax as boolean) ?? false,
    belongsTo: (raw.belongs_to as string) ?? null,
  };
}

export function normalizeEmailListItem(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    status: raw.status as string,
    subject: (raw.subject as string) ?? null,
    eventName: (raw.event_name as string) ?? null,
    type: raw.type as string,
    createdAt: raw.created_at as string,
    sentAt: (raw.sent_at as string) ?? null,
    recipientsCount: (raw.recipients_count as number) ?? 0,
    attachmentsCount: (raw.attachments_count as number) ?? 0,
  };
}

export function normalizeRecipient(raw: Record<string, unknown>) {
  return {
    type: raw.type as string,
    status: raw.status as string,
    emailAddress: raw.email_address as string,
    bounceType: (raw.bounce_type as string) ?? null,
    bounceReason: (raw.bounce_reason as string) ?? null,
    bouncedAt: (raw.bounced_at as string) ?? null,
    complaintType: (raw.complaint_type as string) ?? null,
    complainedAt: (raw.complained_at as string) ?? null,
    isSuppressed: (raw.is_suppressed as boolean) ?? false,
    suppressionReason: (raw.suppression_reason as string) ?? null,
    openedAt: (raw.opened_at as string) ?? null,
    openCount: (raw.open_count as number) ?? 0,
    clickedAt: (raw.clicked_at as string) ?? null,
    clickCount: (raw.click_count as number) ?? 0,
    failedAt: (raw.failed_at as string) ?? null,
    errorMessage: (raw.error_message as string) ?? null,
    deliveredAt: (raw.delivered_at as string) ?? null,
    sentAt: (raw.sent_at as string) ?? null,
  };
}

export function normalizeEmailAttachment(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    name: raw.name as string,
    mime: raw.mime as string,
    contentId: raw.content_id as string,
    contentDisposition: raw.content_disposition as string,
    size: (raw.size as number) ?? 0,
    downloadUrl: raw.download_url as string,
  };
}

export function normalizeDomainItem(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    domainName: raw.domain_name as string,
    status: raw.status as string,
    createdAt: raw.created_at as string,
  };
}

export function normalizeContactItem(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    email: raw.email as string,
    firstName: (raw.first_name as string) ?? null,
    lastName: (raw.last_name as string) ?? null,
    phone: (raw.phone as string) ?? null,
    isGloballyUnsubscribed: (raw.is_globally_unsubscribed as boolean) ?? false,
    createdAt: raw.created_at as string,
    categories: (raw.categories as { id: string; name: string; slug: string }[]) ?? undefined,
  };
}

export function normalizeContactCategoryItem(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    name: raw.name as string,
    slug: raw.slug as string,
  };
}

export function normalizeEmailTopicItem(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    name: raw.name as string,
    slug: raw.slug as string,
    description: (raw.description as string) ?? null,
    autoSubscribe: (raw.auto_subscribe as boolean) ?? false,
    public: (raw.public as boolean) ?? false,
    createdAt: raw.created_at as string,
    domain: raw.domain as { id: string; name?: string } | undefined,
  };
}
