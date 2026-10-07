import { useEffect, useState, type FormEvent } from 'react';
import { emailService, emailRequestKey, type EmailConfig, type EmailDelivery } from '../services/emailService';
import type { AdminMember } from '../services/adminService';

export function EmailPanel({ members }: { members: AdminMember[] }) {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [history, setHistory] = useState<EmailDelivery[]>([]);
  const [kind, setKind] = useState<'event' | 'certificate'>('event');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState<{ kind: 'event' | 'certificate'; body: object; key: string } | null>(null);
  async function refresh() {
    const [settings, sent] = await Promise.all([emailService.config(), emailService.history()]);
    setConfig(settings); setHistory(sent.deliveries);
  }
  useEffect(() => { let active = true; void Promise.all([emailService.config(), emailService.history()]).then(([settings, sent]) => { if (active) { setConfig(settings); setHistory(sent.deliveries); } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load email settings.'); }); return () => { active = false; }; }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !config?.ready) return;
    setBusy(true); setError(''); setMessage('');
    const form = event.currentTarget;
    try {
      const fields = new FormData(form);
      const body = kind === 'event' ? {
        recipients: [...new Set(String(fields.get('recipients')).split(/[\s,;]+/).filter(Boolean).map(value => value.toLowerCase()))].sort(),
        subject: String(fields.get('subject')).trim(), message: String(fields.get('message')).trim(),
      } : { userId: String(fields.get('userId')), recipient: String(fields.get('recipient')).trim().toLowerCase() };
      const draft = attempt || { kind, body, key: await emailRequestKey(kind, body) };
      setAttempt(draft);
      const result = await emailService.send(draft.kind, draft.body, draft.key);
      setMessage(`Email accepted by Resend for ${result.delivery.recipientCount} recipient${result.delivery.recipientCount === 1 ? '' : 's'}.`);
      setAttempt(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Email acceptance could not be confirmed. Retry the same email.');
      try { await refresh(); } catch { /* Preserve the original send error. */ }
    } finally { setBusy(false); }
  }
  const eligible = members.filter(member => member.membershipStatus === 'active' && member.kycStatus === 'Verified' && member.paymentStatus === 'paid');
  return <div className="space-y-6">
    <section className="panel p-6"><h3 className="text-lg font-semibold">Events and membership certificates</h3><p className="text-sm text-muted mt-2">Send event details or generate a certificate from an active member’s record.</p>
      {!config && <p className="notice mt-4">Loading email settings…</p>}
      {config && !config.ready && <p className="notice mt-4">Email sending is unavailable. Configure the Resend API key and verified sender on the backend.</p>}
      {error && <p role="alert" className="payment-error mt-4">{error}</p>}{message && <p role="status" className="notice mt-4">{message}</p>}
      <form onSubmit={event => void submit(event)} className="mt-5 space-y-5">
        <fieldset disabled={busy || Boolean(attempt)} className="space-y-5">
          <label className="admin-field">Email type<select className="payment-input" value={kind} onChange={event => { setKind(event.target.value as 'event' | 'certificate'); setMessage(''); }}><option value="event">Event announcement</option><option value="certificate">Membership certificate</option></select></label>
          {kind === 'event' ? <>
            <label className="admin-field">Recipient emails<textarea className="payment-input" name="recipients" required rows={3} maxLength={12500} placeholder="member@example.com, another@example.com" /><small>Up to {config?.maxEventRecipients || 49} recipients. Separate addresses with commas or new lines. Addresses are hidden from other recipients.</small></label>
            <label className="admin-field">Subject<input className="payment-input" name="subject" required maxLength={160} /></label>
            <label className="admin-field">Event details<textarea className="payment-input" name="message" required rows={7} maxLength={10000} placeholder="Include the event name, date, time, location and registration details." /></label>
          </> : <>
            <label className="admin-field">Member<select className="payment-input" name="userId" required defaultValue=""><option value="" disabled>Select an active member</option>{eligible.map(member => <option key={member.userId} value={member.userId}>{member.fullName} · {member.membershipNumber}</option>)}</select></label>
            <label className="admin-field">Member’s email<input className="payment-input" name="recipient" type="email" required maxLength={254} /></label>
            <p className="notice">The PDF uses the member’s name, business, membership number, package and expiry date. Expired or unverified memberships cannot receive certificates.</p>
          </>}
          <label className="admin-consent"><input type="checkbox" required /><span>I have checked the recipient addresses and details. These recipients should receive this email.</span></label>
        </fieldset>
        <button className="primary-button" type="submit" disabled={busy || !config?.ready}>{busy ? 'Sending…' : attempt ? 'Retry the same email' : kind === 'certificate' ? 'Generate and email certificate' : 'Send event announcement'}</button>
        {attempt && <p className="notice">This draft is locked while its result is uncertain. Retry it unchanged, or check the request in Resend before starting another email.</p>}
        {attempt && <button type="button" className="secondary-button" disabled={busy} onClick={() => { setAttempt(null); setError(''); }}>I checked Resend — edit draft</button>}
      </form>
    </section>
    <section className="panel"><div className="section-heading"><h3>Recent email requests</h3><button className="text-link" disabled={busy} onClick={() => void refresh().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not refresh emails.'))}>Refresh</button></div><p className="px-6 pb-4 text-xs text-muted">Accepted means Resend accepted the request. Check Resend for delivery, bounce or spam status.</p><div className="overflow-x-auto"><table className="payment-table"><thead><tr><th>Subject</th><th>Type</th><th>Recipients</th><th>Status</th><th>Requested</th><th>Resend ID</th></tr></thead><tbody>{history.map(item => <tr key={item.id}><td>{item.subject}</td><td>{item.kind}</td><td>{item.recipientCount}</td><td>{item.status}</td><td>{new Date(item.createdAt).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</td><td>{item.providerId || 'Not confirmed'}</td></tr>)}</tbody></table></div>{!history.length && <p className="notice m-6">No email requests yet.</p>}</section>
  </div>;
}
