import { createBrowserRouter, Navigate, redirect } from 'react-router-dom';
import { authService } from '../services/authService';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboard } from '../pages/AdminDashboard';
import { adminRequest } from '../services/adminService';
import { useState } from 'react';
function AdminAccessError() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <main className="main-content"><section className="panel p-8"><h1 className="text-xl font-semibold">Administrator access unavailable</h1><p className="mt-3 text-muted">Use an authorized administrator account. If you already have access, check your connection and reload.</p>{error && <p role="alert" className="payment-error mt-4">{error}</p>}<button className="primary-button mt-5" disabled={busy} onClick={async () => { setBusy(true); try { await authService.logout(); window.location.assign('/login'); } catch { setError('Could not sign out. Check your connection and retry.'); setBusy(false); } }}>Sign in with another account</button></section></main>;
}
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin" replace /> },
  { path: '/admin', loader: async ({ request }) => {
    let user;
    try { user = await authService.session(); } catch { user = null; }
    if (!user) return redirect(`/login?returnTo=${encodeURIComponent(new URL(request.url).pathname)}`);
    try { await adminRequest('access'); } catch (cause) { throw new Response(cause instanceof Error ? cause.message : 'Admin access unavailable.', { status: 403 }); }
    return null;
  }, shouldRevalidate: () => true, element: <AdminDashboard />, errorElement: <AdminAccessError />, children: [{ index: true }, { path: 'members' }, { path: 'analytics' }, { path: 'email' }, { path: 'events' }] },

  { path: '/login', element: <LoginPage key="login" /> },
  { path: '/forgot-password', element: <LoginPage key="forgot" mode="forgot" /> },
  { path: '/reset-password', element: <LoginPage key="reset" mode="reset" /> },
  { path: '*', element: <main className="main-content"><h1>Page not found</h1><a className="text-link" href="/admin">Return to admin dashboard</a></main> },
]);
