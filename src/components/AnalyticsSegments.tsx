import type { AdminMember } from '../services/adminService';
import type { MembershipPackage } from '../types';
import { formatMoney } from '../services/format';

export function AnalyticsSegments({ members, packages }: { members: AdminMember[]; packages: MembershipPackage[] }) {
  const rows = Object.values(members.reduce<Record<string, { sector: string; county: string; total: number; active: number; collections: number }>>((result, member) => {
    const key = JSON.stringify([member.sector, member.county]);
    const row = result[key] ||= { sector: member.sector || 'Not provided', county: member.county || 'Not provided', total: 0, active: 0, collections: 0 };
    row.total++; row.active += member.membershipStatus === 'active' ? 1 : 0;
    if (member.paymentStatus === 'paid') row.collections += member.paymentAmount ?? (packages.find(item => item.id === member.packageId)?.amount || 0);
    return result;
  }, {})).sort((a, b) => b.total - a.total || a.sector.localeCompare(b.sector) || a.county.localeCompare(b.county));
  const sectors = Object.entries(members.reduce<Record<string, number>>((result, member) => { const label = member.sector || 'Not provided'; result[label] = (result[label] || 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]);
  return <><section className="panel mb-6"><div className="section-heading"><h2>Members by business type</h2><span className="text-xs text-muted">{sectors.length} business types</span></div><div className="admin-chart">{sectors.map(([sector, count]) => <div className="admin-bar-row analytics-sector-row" key={sector}><span>{sector}</span><div className="admin-bar-track"><div style={{ width: `${count / members.length * 100}%` }} /></div><strong>{count}</strong></div>)}{!sectors.length && <p className="text-xs text-muted">No business types match the selected filters.</p>}</div></section>
    <section className="panel mb-6"><div className="section-heading"><div><h2>Business type by region</h2><p className="mt-1 text-xs text-muted">Membership and collections for each business type and county.</p></div></div><div className="overflow-x-auto"><table className="payment-table"><thead><tr><th>Business type</th><th>County</th><th>Members</th><th>Active</th><th>Registration collections</th></tr></thead><tbody>{rows.map(row => <tr key={JSON.stringify([row.sector, row.county])}><td>{row.sector}</td><td>{row.county}</td><td>{row.total}</td><td>{row.active}</td><td>{formatMoney(row.collections)}</td></tr>)}</tbody></table></div>{!rows.length && <p className="p-6 text-sm text-muted">No members match these filters. Clear filters to view all members.</p>}</section></>;
}
