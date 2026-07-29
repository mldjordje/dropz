export function resendPayload(input: {
  from: string;
  recipient: string;
  subject: string;
  body: string;
  replyTo?: string;
}) {
  return {
    from: input.from,
    to: [input.recipient],
    subject: input.subject,
    text: input.body,
    ...(input.replyTo ? { reply_to: input.replyTo } : {}),
  };
}

export function emailAddressFromContact(contact: string): string | null {
  const value = contact.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
