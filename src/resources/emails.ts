import type { HttpClient } from "../client.js";
import type {
  EmailListResponse,
  SendEmailRequest,
  SendEmailResponse,
  SendWithTemplateRequest,
  ShowEmailResponse,
  VerifyEmailResponse,
} from "../types.js";

export class EmailsResource {
  constructor(private http: HttpClient) {}

  async send(req: SendEmailRequest): Promise<SendEmailResponse> {
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
    if (req.attachments !== undefined) body.attachments = req.attachments;

    const extraHeaders: Record<string, string> = {};
    if (req.idempotencyKey !== undefined) {
      extraHeaders["Idempotency-Key"] = req.idempotencyKey;
    }

    const data = await this.http.request("POST", "/emails", body, extraHeaders);
    return data as unknown as SendEmailResponse;
  }

  async sendWithTemplate(req: SendWithTemplateRequest): Promise<SendEmailResponse> {
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
    if (req.attachments !== undefined) body.attachments = req.attachments;

    const extraHeaders: Record<string, string> = {};
    if (req.idempotencyKey !== undefined) {
      extraHeaders["Idempotency-Key"] = req.idempotencyKey;
    }

    const data = await this.http.request("POST", "/emails", body, extraHeaders);
    return data as unknown as SendEmailResponse;
  }

  async verify(email: string): Promise<VerifyEmailResponse> {
    const data = await this.http.request("POST", "/emails/verify", { email });
    return data as unknown as VerifyEmailResponse;
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
      pagination: data.pagination as EmailListResponse["pagination"],
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
      recipientsCount: data.recipients_count as number,
      attachmentsCount: data.attachments_count as number,
      recipients: (data.recipients as Record<string, unknown>[]).map(normalizeRecipient),
      attachments: (data.attachments as Record<string, unknown>[]).map(normalizeEmailAttachment),
    };
  }
}

function normalizeEmailListItem(item: Record<string, unknown>) {
  return {
    id: item.id as string,
    status: item.status as string,
    subject: (item.subject as string) ?? null,
    eventName: (item.event_name as string) ?? null,
    type: item.type as string,
    createdAt: item.created_at as string,
    sentAt: (item.sent_at as string) ?? null,
    recipientsCount: item.recipients_count as number,
    attachmentsCount: item.attachments_count as number,
  };
}

function normalizeRecipient(r: Record<string, unknown>) {
  return {
    type: r.type as string,
    status: r.status as string,
    emailAddress: r.email_address as string,
    bounceType: (r.bounce_type as string) ?? null,
    bounceReason: (r.bounce_reason as string) ?? null,
    bouncedAt: (r.bounced_at as string) ?? null,
    complaintType: (r.complaint_type as string) ?? null,
    complainedAt: (r.complained_at as string) ?? null,
    isSuppressed: r.is_suppressed as boolean,
    suppressionReason: (r.suppression_reason as string) ?? null,
    openedAt: (r.opened_at as string) ?? null,
    openCount: r.open_count as number,
    clickedAt: (r.clicked_at as string) ?? null,
    clickCount: r.click_count as number,
    failedAt: (r.failed_at as string) ?? null,
    errorMessage: (r.error_message as string) ?? null,
    deliveredAt: (r.delivered_at as string) ?? null,
    sentAt: (r.sent_at as string) ?? null,
  };
}

function normalizeEmailAttachment(a: Record<string, unknown>) {
  return {
    id: a.id as string,
    name: a.name as string,
    mime: a.mime as string,
    contentId: a.content_id as string,
    contentDisposition: a.content_disposition as string,
    size: a.size as number,
    downloadUrl: a.download_url as string,
  };
}
