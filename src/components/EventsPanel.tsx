import { useEffect, useState, type FormEvent } from 'react';
import { eventService, type PublishedEvent } from '../services/eventService';
import { emailRequestKey } from '../services/emailService';

export function EventsPanel() {
  const [events, setEvents] = useState<PublishedEvent[]>([]);
  const [emailReady, setEmailReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState<{ body: object; key: string } | null>(null);
  async function refresh() { const result = await eventService.list(); setEvents(result.events); setEmailReady(result.emailReady); }
  useEffect(() => { let active = true; const load = () => void eventService.list().then(result => { if (active) { setEvents(result.events); setEmailReady(result.emailReady); } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load events.'); }); load(); const timer = window.setInterval(load, 20000); return () => { active = false; window.clearInterval(timer); }; }, []);
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    setBusy(true); setError(''); setMessage('');
    try {
      const data = new FormData(form);
      const body = Object.fromEntries(['name', 'date', 'time', 'location', 'category', 'description'].map(name => [name, String(data.get(name)).trim()]));
      const draft = attempt || { body, key: await emailRequestKey('publish-event', body) };
      setAttempt(draft);
      const result = await eventService.publish(draft.body, draft.key);
      setAttempt(null); form.reset();
      setMessage(`Published ${result.event.name}. Email notifications queued for ${result.event.notification.total} members.`);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Publication could not be confirmed. Retry the same event.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6"><section className="panel p-6"><h3 className="text-lg font-semibold">Publish an event</h3><p className="text-sm text-muted mt-2">Publishing adds the event to the member dashboard and automatically emails registered members with a saved email address. Suspended members are excluded.</p>
    {!emailReady && <p className="notice mt-4">Resend is not configured. Events can be published; email notifications will remain queued until sending is enabled.</p>}
    {error && <p role="alert" className="payment-error mt-4">{error}</p>}{message && <p role="status" className="notice mt-4">{message}</p>}
    <form onSubmit={event => void publish(event)} className="mt-5 space-y-5"><fieldset disabled={busy || Boolean(attempt)} className="space-y-5"><div className="admin-form-grid">
      <label className="admin-field">Event name<input name="name" className="payment-input" maxLength={140} required /></label>
      <label className="admin-field">Category<input name="category" className="payment-input" maxLength={80} defaultValue="Community event" required /></label>
      <label className="admin-field">Date<input name="date" className="payment-input" type="date" required /></label>
      <label className="admin-field">Time (Kenya)<input name="time" className="payment-input" type="time" required /></label>
      <label className="admin-field">Location<input name="location" className="payment-input" maxLength={200} required /></label>
    </div><label className="admin-field">Event details<textarea name="description" className="payment-input" rows={6} maxLength={8500} required placeholder="Describe the event and include attendance or registration instructions." /></label></fieldset>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Publishing…' : attempt ? 'Retry the same event' : 'Publish and notify members'}</button>
      {attempt && <button className="secondary-button ml-3" type="button" disabled={busy} onClick={() => { setAttempt(null); setError(''); }}>Edit draft</button>}
    </form></section>
    <section className="panel"><div className="section-heading"><h3>Published events</h3><button className="text-link" disabled={busy} onClick={() => void refresh().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not refresh events.'))}>Refresh</button></div><div className="overflow-x-auto"><table className="payment-table"><thead><tr><th>Event</th><th>Date / Kenya time</th><th>Location</th><th>Email notifications</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td><strong>{event.name}</strong><p className="text-muted mt-1">{event.category}</p></td><td>{event.date} · {event.time}</td><td>{event.location}</td><td>{event.notification.accepted} accepted · {event.notification.queued} queued{event.notification.expired > 0 && ` ? ${event.notification.expired} expired`}{event.notification.review > 0 && ` · ${event.notification.review} need provider review`}{event.notification.total === 0 && <p className="text-muted mt-1">No member email addresses available at publication.</p>}</td></tr>)}</tbody></table></div>{!events.length && <p className="notice m-6">No events have been published yet.</p>}<p className="px-6 pb-5 text-xs text-muted">Accepted means Resend accepted the emails. Queued requests retry automatically. Check Resend for delivery status.</p></section></div>;
}
