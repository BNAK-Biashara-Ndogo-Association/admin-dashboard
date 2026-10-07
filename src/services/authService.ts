import type { User } from '../types';


async function request<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, { credentials: 'same-origin', signal: AbortSignal.timeout(15000), ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Sign-in is temporarily unavailable. Please try again later.'); }
  if (!response.ok) throw new Error(data.message || 'Sign-in is unavailable. Please try again.');
  return data;
}
export const authService = {
  async session() { const { user } = await request<{ user: User | null }>('session'); return user; },
  async passwordLogin(email: string, password: string) { const { user } = await request<{ user: User }>('admin-login', { email, password }); return user; },
  forgotPassword: (email: string) => request<{ message: string }>('forgot-password', { email }),
  resetPassword: (token: string, password: string) => request<{ message: string }>('reset-password', { token, password }),
  async logout() { await request('logout', {}); },
};
