import "server-only";
import { getSql } from "@/lib/db";
import { resendPayload } from "@/lib/email-payload";
import { SITE } from "@/lib/site";

export type EmailInput = {
  userId: number | null;
  recipient: string;
  templateKey: string;
  subject: string;
  body: string;
  replyTo?: string;
};

/**
 * Store first, send second. The booking/request remains successful even when
 * Resend is missing or temporarily unavailable, while the failed attempt stays
 * visible in email_outbox.
 */
export async function queueTransactionalEmail(input: EmailInput) {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO email_outbox (user_id, recipient, template_key, subject, body)
    VALUES (${input.userId}, ${input.recipient}, ${input.templateKey}, ${input.subject}, ${input.body})
    RETURNING id
  `) as { id: number }[];
  const outboxId = rows[0].id;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { queued: true, sent: false, outboxId };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `dropz-outbox-${outboxId}`,
      },
      body: JSON.stringify(
        resendPayload({
          from,
          recipient: input.recipient,
          subject: input.subject,
          body: input.body,
          replyTo: input.replyTo,
        }),
      ),
    });
    const result = (await response.json()) as { id?: string; message?: string };
    if (!response.ok) throw new Error(result.message ?? `Email HTTP ${response.status}`);

    await sql`
      UPDATE email_outbox
      SET status = 'sent', sent_at = now(), provider_ref = ${result.id ?? null}, error = NULL
      WHERE id = ${outboxId}
    `;
    return { queued: true, sent: true, outboxId };
  } catch (error) {
    await sql`
      UPDATE email_outbox
      SET status = 'failed',
          error = ${error instanceof Error ? error.message.slice(0, 1000) : "Unknown email error"}
      WHERE id = ${outboxId}
    `;
    return { queued: true, sent: false, outboxId };
  }
}

export async function queueQuietly(input: EmailInput) {
  try {
    return await queueTransactionalEmail(input);
  } catch (error) {
    console.error(`[email] ${input.templateKey} failed to queue`, error);
    return { queued: false, sent: false };
  }
}

export async function queueStudioNotice(
  input: Omit<EmailInput, "userId" | "recipient">,
) {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT email FROM studio_settings WHERE id = 1
    `) as { email: string | null }[];
    const recipient =
      process.env.EMAIL_NOTIFY_TO?.trim() ||
      rows[0]?.email?.trim() ||
      SITE.email;
    if (!recipient) return { queued: false, sent: false };
    return await queueTransactionalEmail({ ...input, userId: null, recipient });
  } catch (error) {
    console.error("[email] studio notice failed", error);
    return { queued: false, sent: false };
  }
}
