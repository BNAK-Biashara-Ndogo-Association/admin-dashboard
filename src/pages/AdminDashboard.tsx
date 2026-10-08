import { EventsPanel } from '../components/EventsPanel';
import { EmailPanel } from '../components/EmailPanel';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, BarChart3, Download, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, UsersRound, Wallet, X } from 'lucide-react';
import { adminService, type AdminMember } from '../services/adminService';
import { authService } from '../services/authService';
import { formatMoney } from '../services/format';
import { AddMemberForm } from '../components/AddMemberForm';
import { AnalyticsSegments } from '../components/AnalyticsSegments';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import type { MembershipPackage } from '../types';

export function AdminDashboard() {
  const [adding, setAdding] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [businessType, setBusinessType] = useState('all');
  const [county, setCounty] = useState('all');
  const [constituency, setConstituency] = useState('all');
  const [ward, setWard] = useState('all');
  const [packageId, setPackageId] = useState('all');
  const [sort, setSort] = useState('updated');
  const loadVersion = useRef(0);
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.split('/')[2] || 'overview';
  async function load() {
    const version = ++loadVersion.current;
    setLoading(true); setError('');
    try { const data = await adminService.members(sort); if (version === loadVersion.current) { setMembers(data.members); setPackages(data.packages); } }
    catch (cause) { if (version === loadVersion.current) setError(cause instanceof Error ? cause.message : 'Could not load members.'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }
  useEffect(() => { void load(); document.title = 'Admin dashboard | BNAK'; return () => { loadVersion.current++; }; }, [sort]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setSelected(null);
      if (event.key !== 'Tab') return;
      const controls = Array.from(document.querySelectorAll<HTMLElement>('.admin-modal button:not(:disabled), .admin-modal a[href]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handler);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = overflow; previous?.focus(); };
  }, [selected, busy]);
  const optionsFor = (field: 'sector' | 'county' | 'constituency' | 'ward', source = members) => [...new Set(source.map(member => member[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const countyMembers = members.filter(member => county === 'all' || member.county === county);
  const constituencyMembers = countyMembers.filter(member => constituency === 'all' || member.constituency === constituency);
  const filtered = members.filter(member =>
    (businessType === 'all' || member.sector === businessType) &&
    (county === 'all' || member.county === county) &&
    (constituency === 'all' || member.constituency === constituency) &&
    (ward === 'all' || member.ward === ward) &&
    (packageId === 'all' || member.packageId === packageId) &&
    (status === 'all' || member.membershipStatus === status) &&
    `${member.fullName} ${member.businessName} ${member.county} ${member.membershipNumber} ${member.mobileNumber}`.toLowerCase().includes(query.toLowerCase()));
  const active = filtered.filter(member => member.membershipStatus === 'active').length;
  const pending = filtered.filter(member => member.kycStatus !== 'Verified').length;
  const collected = filtered.reduce((total, member) => total + (member.paymentStatus === 'paid' ? member.paymentAmount ?? (packages.find(item => item.id === member.packageId)?.amount || 0) : 0), 0);
  const counties = Object.entries(filtered.reduce<Record<string, number>>((result, member) => { result[member.county] = (result[member.county] || 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]);
  const hasFilters = [businessType, county, constituency, ward, packageId, status].some(value => value !== 'all') || !!query;
  function clearFilters() { setBusinessType('all'); setCounty('all'); setConstituency('all'); setWard('all'); setPackageId('all'); setStatus('all'); setQuery(''); }
  async function manage(action: string) {
    if (!selected || busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await adminService.manage(selected.userId, action, action === 'record-payment' ? { reference: paymentReference, method: paymentMethod } : undefined); setSelected(null); setMessage('Member updated successfully.'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update member.'); }
    finally { setBusy(false); }
  }
  async function downloadDocument(side: 'front' | 'back') {
    if (!selected) return;
    try {
      const { document: identityDocument } = await adminService.document(selected.userId, side);
      const bytes = Uint8Array.from(atob(identityDocument.data), character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: identityDocument.mimeType }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = identityDocument.name.replace(/[\\/]/g, '_'); anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not download ID document.'); }
  }
  function exportMembers() {
    const rows = [['Name', 'Business', 'Business type', 'County', 'Constituency', 'Ward', 'Membership', 'Status', 'KYC'], ...filtered.map(member => [member.fullName, member.businessName, member.sector, member.county, member.constituency, member.ward, member.membershipNumber, member.membershipStatus, member.kycStatus])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/^[\s]*[=+@\-]|^[\t\r\n]/, match => `'${match}`).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'bnak-members.csv'; anchor.click(); URL.revokeObjectURL(url);
  }
  const nav = [{ path: '/admin', label: 'Overview', icon: LayoutDashboard }, { path: '/admin/members', label: 'Members', icon: UsersRound }, { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 }, { path: '/admin/email', label: 'Email', icon: ArrowUpRight }, { path: '/admin/events', label: 'Events', icon: LayoutDashboard }];
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a>
    <aside className={`sidebar sidebar-desktop admin-sidebar ${open ? 'admin-nav-open' : ''}`}><div className="flex items-center justify-between"><Link className="brand flex-col items-start gap-2" to="/admin" aria-label="BNAK admin portal home"><img src="/bnak-logo.svg" alt="Biashara Ndogo Association of Kenya" className="h-auto w-[168px]" width="1040" height="340" /><small>ADMIN PORTAL</small></Link><button className="icon-button menu-toggle" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button></div><p className="association-name">Biashara Ndogo Association<br />of Kenya</p><p className="nav-label">ADMINISTRATION</p><nav aria-label="Admin navigation" className="space-y-1.5">{nav.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} end className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}><Icon size={19} />{label}</NavLink>)}</nav><div className="sidebar-bottom"><div className="community-note"><p className="eyebrow">GROWING OUR COMMUNITY</p><h3 className="mt-2 font-semibold">A stronger voice for<br />small businesses.</h3><p className="mt-3 text-xs text-muted">Membership administration</p></div><button className="nav-item mt-5 w-full" onClick={async () => { try { await authService.logout(); navigate('/login'); } catch { setError('Could not sign out. Please retry.'); } }}><LogOut size={18} />Sign out</button><div className="sidebar-foot">© 2026 BNAK. All rights reserved.</div></div></aside>
    <div className="workspace"><header className="header"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="icon-button menu-toggle" onClick={() => setOpen(true)}><Menu size={22} /></button><h1 className="text-sm font-semibold">Administration</h1><span className="header-context">BNAK community management</span></div><span className="member-number"><ShieldCheck size={15} />Administrator</span></header>
      <main id="main-content" tabIndex={-1} className="main-content"><div className="page-intro"><div><p className="eyebrow mb-2">YOUR ADMIN WORKSPACE</p><h2>{section === 'events' ? 'Community events' : section === 'email' ? 'Member emails' : section === 'members' ? 'Member management' : section === 'analytics' ? 'Community analytics' : 'Community at a glance.'}</h2><p>Monitor membership, review registrations and help your community grow.</p></div><div className="flex flex-wrap gap-3"><button className="primary-button" onClick={() => setAdding(true)}>Add member</button><button className="secondary-button flex items-center gap-2" disabled={loading || !!error} onClick={exportMembers}><Download size={15} />Export members</button></div></div>
      {adding && <AddMemberForm onCancel={() => setAdding(false)} onAdded={member => { setAdding(false); setMessage(`Registered ${member.fullName}. Membership number: ${member.membershipNumber}. KYC and payment are pending.`); void load(); }} />}{error && <div role="alert" className="payment-error mb-5">{error} <button className="text-link ml-3" onClick={() => void load()}>Retry</button></div>}{message && <p role="status" className="notice mb-5">{message}</p>}
      {section === 'events' ? <EventsPanel /> : section === 'email' ? <EmailPanel members={members} /> : loading ? <p className="notice" role="status">Loading community data…</p> : error && !members.length ? <p className="notice">Community data could not be loaded. Retry to view analytics and members.</p> : <>
      <section className="panel analytics-filter-panel mb-5" aria-label="Analytics filters"><div className="section-heading"><div><h2>Filter and segment members</h2><p className="mt-1 text-xs text-muted">Business type uses the registered sector. Region uses county, constituency and ward.</p></div><button className="text-link" disabled={!hasFilters} onClick={clearFilters}>Clear filters</button></div><div className="analytics-filter-grid">
<label className="admin-field">Business type<select className="payment-input" value={businessType} onChange={event => setBusinessType(event.target.value)}><option value="all">All business types</option>{optionsFor('sector').map(value => <option key={value}>{value}</option>)}</select></label>
<label className="admin-field">Region / county<select className="payment-input" value={county} onChange={event => { setCounty(event.target.value); setConstituency('all'); setWard('all'); }}><option value="all">All counties</option>{optionsFor('county').map(value => <option key={value}>{value}</option>)}</select></label>
<label className="admin-field">Constituency<select className="payment-input" value={constituency} disabled={county === 'all'} onChange={event => { setConstituency(event.target.value); setWard('all'); }}><option value="all">All constituencies</option>{optionsFor('constituency', countyMembers).map(value => <option key={value}>{value}</option>)}</select></label>
<label className="admin-field">Ward<select className="payment-input" value={ward} disabled={constituency === 'all'} onChange={event => setWard(event.target.value)}><option value="all">All wards</option>{optionsFor('ward', constituencyMembers).map(value => <option key={value}>{value}</option>)}</select></label>
<label className="admin-field">Membership package<select className="payment-input" value={packageId} onChange={event => setPackageId(event.target.value)}><option value="all">All packages</option>{packages.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
<label className="admin-field">Sort members<select className="payment-input" value={sort} onChange={event => setSort(event.target.value)}><option value="updated">Recently updated</option><option value="newest">Newest registrations</option><option value="oldest">Oldest registrations</option><option value="county">County A?Z</option><option value="sector">Business type A?Z</option><option value="status">Membership status A?Z</option></select></label></div><p className="analytics-filter-summary" role="status">Showing {filtered.length} of {members.length} members. Totals, charts, segment breakdown and exports use these filters, directory search and membership status.</p></section>
      <div className="admin-stats"><StatCard label="Matching members" value={String(filtered.length)} note="Members in the selected segment" icon={UsersRound} /><StatCard label="Active memberships" value={String(active)} note={`${filtered.length ? Math.round(active / filtered.length * 100) : 0}% of matching members`} icon={ShieldCheck} /><StatCard label="Awaiting KYC review" value={String(pending)} note="Registrations awaiting verification" icon={LayoutDashboard} /><StatCard label="Registration collections" value={formatMoney(collected)} note="Confirmed registration payments only" icon={Wallet} /></div>
      {section !== 'members' && <div className="admin-analytics"><section className="panel"><div className="section-heading"><div><h2>Membership distribution</h2><p className="mt-1 text-xs text-muted">Current status of registered members</p></div><BarChart3 size={19} /></div><div className="admin-chart">{(['active', 'pending', 'suspended', 'expired'] as const).map(item => { const count = filtered.filter(member => member.membershipStatus === item).length; return <div className="admin-bar-row" key={item}><span className="capitalize">{item}</span><div className="admin-bar-track"><div style={{ width: `${filtered.length ? count / filtered.length * 100 : 0}%` }} /></div><strong>{count}</strong></div>; })}{!filtered.length && <p className="text-xs text-muted">No members match the selected filters.</p>}</div></section><section className="panel"><div className="section-heading"><h2>Members by county</h2><span className="text-xs text-muted">{counties.length} counties</span></div><div className="admin-chart">{counties.map(([county, count]) => <div className="admin-bar-row" key={county}><span>{county}</span><div className="admin-bar-track"><div style={{ width: `${count / filtered.length * 100}%` }} /></div><strong>{count}</strong></div>)}{!counties.length && <p className="text-xs text-muted">No counties match the selected filters.</p>}</div></section></div>}
      {section === 'analytics' && <AnalyticsSegments members={filtered} packages={packages} />}
      <section className="panel"><div className="section-heading"><div><h2>Member directory</h2><p className="mt-1 text-xs text-muted">Review details and manage membership access.</p></div><span className="member-number">{filtered.length} members</span></div><div className="admin-filters"><label className="admin-search"><Search size={17} /><input aria-label="Search members" placeholder="Search name, business, county or phone…" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Filter membership status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{['active', 'pending', 'suspended', 'expired'].map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></div><div className="overflow-x-auto"><table className="payment-table"><thead><tr><th>Member / business</th><th>Business type</th><th>County</th><th>Membership</th><th>KYC</th><th>Payment</th><th>Action</th></tr></thead><tbody>{filtered.map(member => <tr key={member.userId}><td><strong>{member.fullName}</strong><p className="mt-1 text-muted">{member.businessName}</p></td><td>{member.sector}</td><td>{member.county}</td><td><StatusBadge status={member.membershipStatus} /></td><td>{member.kycStatus}</td><td><StatusBadge status={member.paymentStatus} /></td><td><button className="text-link" onClick={() => { setSelected(member); setPaymentReference(''); setError(''); }}>Manage <ArrowUpRight size={14} /></button></td></tr>)}</tbody></table></div>{!filtered.length && <div className="admin-empty"><UsersRound size={30} /><h3>{members.length ? 'No matching members' : 'Your community starts here'}</h3><p>{members.length ? 'Try another search or clear the business type and region filters.' : 'Submitted member registrations will appear here for review.'}</p></div>}</section></>}
      </main><footer className="main-footer"><span>Biashara Ndogo Association of Kenya</span><span>Empowering businesses. Building Kenya.</span></footer></div>
      {selected && <div className="admin-modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="member-title" className="panel admin-modal"><div className="section-heading"><div><p className="eyebrow">MEMBER DETAILS</p><h2 id="member-title" className="mt-2">{selected.fullName}</h2></div><button className="icon-button" aria-label="Close member details" disabled={busy} onClick={() => setSelected(null)} autoFocus><X size={20} /></button></div><div className="p-6"><dl className="detail-list">{[['Registration', selected.registrationSource === 'admin-assisted' ? 'Admin assisted' : 'Member submitted'], ['Business', selected.businessName], ['Phone', selected.mobileNumber || 'Not provided'], ['County', selected.county], ['Sector', selected.sector], ['Membership number', selected.membershipNumber || 'Not assigned'], ['KYC', selected.kycStatus], ['Payment', selected.paymentStatus], ['Payment reference', selected.paymentReference || 'Not recorded'], ['Registered by', selected.createdBy || 'Member'], ['Membership', selected.membershipStatus]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="notice mt-4">Activation and restoration require verified KYC and confirmed payment. Suspension prevents new membership payment requests.</p>{error && <p role="alert" className="payment-error mt-4">{error}</p>}{selected.registrationSource === 'admin-assisted' && selected.paymentStatus !== 'paid' && <form className="admin-payment-form mt-5" onSubmit={event => { event.preventDefault(); void manage('record-payment'); }}><h3 className="text-sm font-semibold">Record confirmed registration payment</h3><p className="text-xs text-muted mt-2">Record payment only after checking the receipt or transaction. This records payment without activating membership.</p><label className="admin-field mt-3">Payment method<select className="payment-input" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} disabled={busy}><option value="cash">Cash receipt</option><option value="bank">Bank transfer</option><option value="mpesa-manual">M-PESA transaction</option></select></label><label className="admin-field mt-3">Receipt / transaction reference<input className="payment-input" value={paymentReference} onChange={event => setPaymentReference(event.target.value)} required maxLength={100} disabled={busy} /></label><p className="text-sm my-3">Package fee: {formatMoney(packages.find(item => item.id === selected.packageId)?.amount || 0)}</p><button className="secondary-button" type="submit" disabled={busy}>Confirm payment received</button></form>}<button className="secondary-button mt-4 admin-print-button" onClick={() => window.print()}>Print member record</button><div className="admin-actions"><button className="secondary-button" disabled={busy || !selected.documents.frontUploaded} onClick={() => void downloadDocument('front')}>Download ID front</button><button className="secondary-button" disabled={busy || !selected.documents.backUploaded} onClick={() => void downloadDocument('back')}>Download ID back</button>{selected.kycStatus !== 'Verified' && <button className="secondary-button" disabled={busy} onClick={() => void manage('approve-kyc')}>Approve KYC</button>}{selected.membershipStatus !== 'active' && <button className="primary-button" disabled={busy || selected.kycStatus !== 'Verified' || selected.paymentStatus !== 'paid'} onClick={() => void manage(selected.membershipStatus === 'suspended' ? 'restore' : 'activate')}>{selected.membershipStatus === 'suspended' ? 'Restore membership' : 'Activate membership'}</button>}{selected.membershipStatus !== 'suspended' && <button className="secondary-button admin-danger" disabled={busy} onClick={() => void manage('suspend')}>Suspend membership</button>}</div>{selected.adminHistory?.length ? <div className="mt-5"><h3 className="text-xs font-semibold">Recent administration activity</h3>{selected.adminHistory.slice(-5).reverse().map((item, index) => <p key={index} className="mt-2 text-xs text-muted">{item.action} · {item.actor} · {new Date(item.at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</p>)}</div> : null}</div></section></div>}
    </div>;
}
