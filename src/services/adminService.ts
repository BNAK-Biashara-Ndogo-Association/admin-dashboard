import type { KycRegistration, MembershipPackage, MembershipConfig } from '../types';
export interface AdminMember extends Omit<KycRegistration, 'idNumber'> { userId: string; updatedAt: string; registrationSource?: string; createdBy?: string; paymentMethod?: string; paymentAmount?: number; adminHistory?: { action: string; actor: string; at: string }[]; }
export async function adminRequest<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, { credentials: 'same-origin', signal: AbortSignal.timeout(45000), ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Administrator service is unavailable.');
  return data;
}
export const adminService = {
  members: (sort = 'updated') => adminRequest<{ members: AdminMember[]; packages: MembershipPackage[] }>(`members?sort=${encodeURIComponent(sort)}`),
  config: () => adminRequest<MembershipConfig>('registration-config'),
  add: (body: Record<string, unknown>) => adminRequest<{ member: AdminMember }>('members', body),
  manage: (id: string, action: string, details?: object) => adminRequest(`members/${encodeURIComponent(id)}`, { ...details, action }),
};
