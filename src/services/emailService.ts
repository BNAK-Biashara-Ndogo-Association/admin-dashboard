export interface EmailDelivery { id: string; kind: 'event' | 'certificate'; subject: string; recipientCount: number; status: 'accepted' | 'pending' | 'failed'; providerId: string; createdAt: string; }
export interface EmailConfig { ready: boolean; maxEventRecipients: number; }

async function request<T>(path: string, body?: object, key?: string): Promise<T> {
  const response = await fetch(`/api/admin/email/${path}`, {
    credentials: 'same-origin', signal: AbortSignal.timeout(30000),
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key || '' }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Email service is unavailable.');
  return data;
}

export const emailService = {
  config: () => request<EmailConfig>('config'),
  history: () => request<{ deliveries: EmailDelivery[] }>('history'),
  send: (kind: 'event' | 'certificate', body: object, key: string) => request<{ delivery: EmailDelivery }>(kind, body, key),
};

// Retain only the draft fingerprint and request key; no addresses or message contents.
export async function emailRequestKey(kind: string, body: object) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body)));
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = `bnak-email-${kind}-${fingerprint}`;
  const previous = sessionStorage.getItem(storageKey);
  if (previous) return previous;
  const key = crypto.randomUUID();
  sessionStorage.setItem(storageKey, key);
  return key;
}
