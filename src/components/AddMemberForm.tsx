import { useEffect, useState, type FormEvent } from 'react';
import { adminService, type AdminMember } from '../services/adminService';
import type { MembershipConfig } from '../types';
import { formatMoney } from '../services/format';

async function upload(file: File) {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('Each ID document must be a file up to 5 MB.');
  return new Promise<{ name: string; mimeType: string; data: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the ID document.'));
    reader.onload = () => resolve({ name: file.name, mimeType: file.type, data: String(reader.result).split(',')[1] });
    reader.readAsDataURL(file);
  });
}

export function AddMemberForm({ onAdded, onCancel }: { onAdded: (member: AdminMember) => void; onCancel: () => void }) {
  const [config, setConfig] = useState<MembershipConfig | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState('');
  useEffect(() => { let active = true; adminService.config().then(data => { if (active) setConfig(data); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load registration options.'); }); return () => { active = false; }; }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      const body: Record<string, unknown> = Object.fromEntries(data.entries());
      body.consent = data.get('consent') === 'on';
      const front = data.get('idFront'), back = data.get('idBack');
      if (!(front instanceof File) || !(back instanceof File)) throw new Error('Upload both sides of the member’s ID.');
      [body.idFront, body.idBack] = await Promise.all([upload(front), upload(back)]);
      const { member } = await adminService.add(body);
      onAdded(member);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not register member.'); }
    finally { setBusy(false); }
  }
  const input = (name: string, label: string, required = true, maxLength = 120) => <label className="admin-field" key={name}>{label}<input name={name} required={required} maxLength={maxLength} className="payment-input" type={name.includes('Number') && name !== 'idNumber' ? 'tel' : 'text'} /></label>;
  const select = (name: string, label: string, options: string[]) => <label className="admin-field" key={name}>{label}<select name={name} required defaultValue="" className="payment-input" onChange={name === 'locationType' ? event => setLocation(event.target.value) : undefined}><option value="" disabled>Select an option</option>{options.map(value => <option key={value}>{value}</option>)}</select></label>;
  return <section className="panel mb-6"><div className="section-heading"><div><h2>Add member on their behalf</h2><p className="mt-2 text-xs text-muted">No email, smartphone or online account required.</p></div><button className="secondary-button" disabled={busy} onClick={onCancel}>Cancel</button></div><div className="p-6">
    {error && <p role="alert" className="payment-error mb-4">{error}</p>}
    {!config ? <p role="status">{error ? 'Close this form and reopen it to retry.' : 'Loading registration options…'}</p> : <form onSubmit={submit}><fieldset disabled={busy}><p className="notice mb-5">Collect the member’s consent before entering their details. Registration starts pending; KYC approval and a confirmed payment are required for activation. A contact phone is optional.</p>
    <h3 className="font-semibold mb-4">Personal details</h3><div className="admin-form-grid">{input('fullName', 'Full name')}{input('idNumber', 'National ID / passport number', true, 40)}{select('gender', 'Gender', config.options.genders)}{select('ageGroup', 'Age group', config.options.ageGroups)}{input('mobileNumber', 'Contact mobile number (optional)', false, 24)}</div>
    <h3 className="font-semibold my-5">Business and location</h3><div className="admin-form-grid">{input('businessName', 'Business name')}{select('county', 'County', config.counties)}{input('constituency', 'Constituency')}{input('ward', 'Ward')}{input('businessArea', 'Business area')}{select('locationType', 'Location type', config.options.locationTypes)}{location === 'Other' && input('otherLocationType', 'Describe location type', true, 100)}{input('locationName', 'Location name (optional)', false)}{select('sector', 'Sector', config.options.sectors)}{select('registrationStatus', 'Business registration status', config.options.registrationStatuses)}{select('employees', 'Employees', config.options.employeeGroups)}{select('turnover', 'Monthly turnover', config.options.turnoverGroups)}</div>
    <h3 className="font-semibold my-5">Membership and identity documents</h3><div className="admin-form-grid"><label className="admin-field">Membership package<select className="payment-input" name="packageId" required defaultValue=""><option value="" disabled>Select a package</option>{config.packages.map(item => <option key={item.id} value={item.id}>{item.title} · {formatMoney(item.amount)}</option>)}</select></label>{input('paymentMobileNumber', 'M-PESA mobile number (optional)', false, 24)}{(['idFront', 'idBack'] as const).map(name => <label key={name} className="admin-field">{name === 'idFront' ? 'Front of ID' : 'Back of ID'}<input className="payment-input" name={name} type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" /><small className="text-muted">JPEG, PNG, WebP or PDF, up to 5 MB each.</small></label>)}</div>
    <label className="admin-consent"><input name="consent" type="checkbox" required /><span>I confirm that the member provided these details, confirmed their accuracy, and gave informed consent for BNAK to collect and process this information and identity documents for membership administration and KYC. I have explained the purpose to the member and recorded their consent.</span></label>
    <button className="primary-button" type="submit">{busy ? 'Saving member…' : 'Create member record'}</button></fieldset></form>}
  </div></section>;
}
