import type { HttpClient } from "../client.js";
import {
  normalizeEmailAttachment,
  normalizeEmailListItem,
  normalizePagination,
  normalizeRecipient,
  normalizeSendEmailResponse,
  normalizeVerifyEmailResponse,
} from "../normalize.js";
import type {
  EmailListResponse,
  SendAttachment,
  SendEmailRequest,
  SendEmailResponse,
  SendWithTemplateRequest,
  ShowEmailResponse,
  VerifyEmailResponse,
} from "../types.js";

function serializeAttachments(attachments: SendAttachment[]): Record<string, unknown>[] {
  return attachments.map((a) => {
    const out: Record<string, unknown> = { name: a.name };
    if (a.path !== undefined) out.path = a.path;
    if (a.content !== undefined) out.content = a.content;
    if (a.mime !== undefined) out.mime = a.mime;
    if (a.contentId !== undefined) out.content_id = a.contentId;
    if (a.contentDisposition !== undefined) out.content_disposition = a.contentDisposition;
    return out;
  });
}

function buildSendBody(req: SendEmailRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    from: req.from,
    to: req.to,
    subject: req.subject,
  };
  if (req.html !== undefined) body.html = req.html;
  if (req.text !== undefined) body.text = req.text;
  if (req.type !== undefined) body.type = req.type;
  if (req.eventName !== undefined) body.event_name = req.eventName;
  if (req.emailTopicId !== undefined) body.email_topic_id = req.emailTopicId;
  if (req.replyTo !== undefined) body.reply_to = req.replyTo;
  if (req.cc !== undefined) body.cc = req.cc;
  if (req.bcc !== undefined) body.bcc = req.bcc;
  if (req.headers !== undefined) body.headers = req.headers;
  if (req.attachments !== undefined) body.attachments = serializeAttachments(req.attachments);
  return body;
}

function buildTemplateBody(req: SendWithTemplateRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    from: req.from,
    to: req.to,
    template_id: req.templateId,
  };
  if (req.subject !== undefined) body.subject = req.subject;
  if (req.templateVariables !== undefined) body.template_variables = req.templateVariables;
  if (req.type !== undefined) body.type = req.type;
  if (req.eventName !== undefined) body.event_name = req.eventName;
  if (req.emailTopicId !== undefined) body.email_topic_id = req.emailTopicId;
  if (req.replyTo !== undefined) body.reply_to = req.replyTo;
  if (req.cc !== undefined) body.cc = req.cc;
  if (req.bcc !== undefined) body.bcc = req.bcc;
  if (req.headers !== undefined) body.headers = req.headers;
  if (req.attachments !== undefined) body.attachments = serializeAttachments(req.attachments);
  return body;
}

export class EmailsResource {
  constructor(private http: HttpClient) {}

  async send(req: SendEmailRequest): Promise<SendEmailResponse> {
    const extra: Record<string, string> = {};
    if (req.idempotencyKey !== undefined) extra["Idempotency-Key"] = req.idempotencyKey;
    const body = buildSendBody(req);
    const data = await this.http.request("POST", "/emails", body, extra);
    return normalizeSendEmailResponse(data);
  }

  async sendWithTemplate(req: SendWithTemplateRequest): Promise<SendEmailResponse> {
    const extra: Record<string, string> = {};
    if (req.idempotencyKey !== undefined) extra["Idempotency-Key"] = req.idempotencyKey;
    const body = buildTemplateBody(req);
    const data = await this.http.request("POST", "/emails", body, extra);
    return normalizeSendEmailResponse(data);
  }

  async verify(email: string): Promise<VerifyEmailResponse> {
    const data = await this.http.request("POST", "/emails/verify", { email });
    return normalizeVerifyEmailResponse(data);
  }

  async list(perPage?: number, after?: string, before?: string): Promise<EmailListResponse> {
    const query = new URLSearchParams();
    if (perPage !== undefined) query.set("per_page", String(perPage));
    if (after !== undefined) query.set("after", after);
    if (before !== undefined) query.set("before", before);
    const qs = query.toString();
    const path = qs ? `/emails?${qs}` : "/emails";
    const data = await this.http.request("GET", path);
    return {
      data: (data.data as Record<string, unknown>[]).map(normalizeEmailListItem),
      pagination: normalizePagination(data.pagination as Record<string, unknown>),
    };
  }

  async get(id: string): Promise<ShowEmailResponse> {
    const data = await this.http.request("GET", `/emails/${id}`);
    return {
      id: data.id as string,
      status: data.status as string,
      subject: (data.subject as string) ?? null,
      eventName: (data.event_name as string) ?? null,
      type: data.type as string,
      createdAt: data.created_at as string,
      sentAt: (data.sent_at as string) ?? null,
      recipientsCount: (data.recipients_count as number) ?? 0,
      attachmentsCount: (data.attachments_count as number) ?? 0,
      recipients: (data.recipients as Record<string, unknown>[]).map(normalizeRecipient),
      attachments: (data.attachments as Record<string, unknown>[]).map(normalizeEmailAttachment),
    };
  }
}
