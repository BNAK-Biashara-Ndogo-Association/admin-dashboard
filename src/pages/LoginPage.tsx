import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

type Mode = 'login' | 'forgot' | 'reset';
export function LoginPage({ mode = 'login' }: { mode?: Mode }) {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetToken] = useState(() => mode === 'reset' ? new URLSearchParams(window.location.hash.slice(1)).get('token') || '' : '');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('returnTo') || '/admin';
  const returnTo = requested === '/admin' || requested.startsWith('/admin/') ? requested : '/admin';
  const withReturn = (path: string) => path + '?returnTo=' + encodeURIComponent(returnTo);
  useEffect(() => {
    if (mode === 'reset') window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [mode]);
  useEffect(() => {
    if (mode !== 'login') return;
    let active = true;
    void authService.session().then(user => { if (active && user?.email === 'biasharandogoassociation@gmail.com') navigate(returnTo, { replace: true }); }).catch(() => {});
    return () => { active = false; };
  }, [mode, navigate, returnTo]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') || '');
    const password = String(fields.get('password') || '');
    setError(''); setMessage('');
    if ((mode === 'reset') && password !== fields.get('confirmPassword')) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      if (mode === 'forgot') { setMessage((await authService.forgotPassword(email)).message); }
      else if (mode === 'reset') { setMessage((await authService.resetPassword(resetToken, password)).message); setResetDone(true); }
      else {
        await authService.passwordLogin(email, password);
        navigate(returnTo, { replace: true });
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please try again later.'); }
    finally { setBusy(false); }
  }
  const title = { login: 'Welcome back', forgot: 'Forgot your password?', reset: 'Choose a new password' }[mode];
  const description = { login: 'Sign in with your authorized BNAK administrator account.', forgot: 'Request a password reset link for the BNAK administrator account.', reset: 'Use a strong password you have not used elsewhere.' }[mode];
  return <main className="grid min-h-screen place-items-center p-6"><section className="panel w-full max-w-md p-8">
    <div className="text-center"><img src="/bnak-logo.svg" alt="Biashara Ndogo Association of Kenya" className="mx-auto block h-auto w-52" width="1040" height="340" /><p className="eyebrow mt-6">BNAK ADMIN PORTAL</p><h1 className="mt-4 text-2xl font-semibold">{title}</h1><p className="my-5 text-sm leading-6 text-muted">{description}</p></div>
    {mode === 'reset' && !resetToken ? <p role="alert">This reset link is missing or invalid. <Link className="underline" to="/forgot-password">Request a new link</Link>.</p> : !resetDone && <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        {mode !== 'reset' && <label className="block text-sm font-medium">Email address<input className="payment-input" name="email" type="email" autoComplete="email" value="biasharandogoassociation@gmail.com" readOnly required maxLength={254} /></label>}
        {mode !== 'forgot' && <label className="block text-sm font-medium">{mode === 'reset' ? 'New password' : 'Password'}<input className="payment-input" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? undefined : 12} maxLength={128} />{mode !== 'login' && <span className="mt-1 block text-xs text-muted">At least 12 characters.</span>}</label>}
        {(mode === 'reset') && <label className="block text-sm font-medium">Confirm password<input className="payment-input" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>}
        {mode === 'login' && <div className="text-right text-sm"><Link className="underline" to="/forgot-password">Forgot password?</Link></div>}
        <button className="primary-button w-full justify-center" type="submit">{busy ? 'Please wait...' : { login: 'Sign in', forgot: 'Send reset link', reset: 'Reset password' }[mode]}</button>
      </fieldset>
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    <p className="mt-6 text-center text-sm text-muted">{mode === 'login' ? 'Administrator access is granted by BNAK.' : <Link className="font-semibold underline" to={withReturn('/login')}>Back to sign in</Link>}</p>
  </section></main>;
}
