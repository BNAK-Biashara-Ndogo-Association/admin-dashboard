export interface PublishedEvent { id: string; name: string; date: string; time: string; location: string; category: string; description: string; notification: { total: number; accepted: number; queued: number; review: number; expired: number }; }
async function request<T>(body?: object, key?: string): Promise<T> {
  const response = await fetch('/api/admin/events', { credentials: 'same-origin', signal: AbortSignal.timeout(30000), ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key || '' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Events are unavailable.');
  return data;
}
export const eventService = {
  list: () => request<{ events: PublishedEvent[]; emailReady: boolean }>(),
  publish: (body: object, key: string) => request<{ event: PublishedEvent }>(body, key),
};
