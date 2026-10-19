import type { AdminKycDetail } from './adminService';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const value = (input: unknown) => input === undefined || input === null || input === '' ? 'Not recorded' : String(input);
const field = (label: string, input: unknown) => `<div class="field"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value(input))}</dd></div>`;
const date = (input?: string) => {
  if (!input) return 'Not recorded';
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? input : new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeZone: 'Africa/Nairobi' }).format(parsed);
};
const amount = (input?: number) => input === undefined ? 'Not recorded' : `KES ${new Intl.NumberFormat('en-KE').format(input)}`;

export function createKycReport(member: AdminKycDetail, packageTitle?: string, packageAmount?: number) {
  const generated = new Intl.DateTimeFormat('en-KE', { dateStyle: 'long', timeZone: 'Africa/Nairobi' }).format(new Date());
  const name = escapeHtml(member.fullName);
  const membershipId = escapeHtml(member.membershipNumber || member.userId);
  const status = escapeHtml(member.kycStatus || 'Pending');
  const sections = [
    {
      title: 'Member identity',
      description: 'Personal identity and contact information supplied during registration.',
      fields: [
        field('Full legal name', member.fullName), field('National ID / passport', member.idNumber),
        field('Gender', member.gender), field('Age group', member.ageGroup),
        field('Primary phone', member.mobileNumber), field('Email address', member.contactEmail),
      ],
    },
    {
      title: 'Location',
      description: 'Member and business location details.',
      fields: [
        field('County', member.county), field('Constituency', member.constituency),
        field('Ward', member.ward), field('Business area', member.businessArea),
        field('Location type', member.locationType === 'Other' ? member.otherLocationType || 'Other' : member.locationType),
        field('Premises / trading location', member.locationName),
      ],
    },
    {
      title: 'Business profile',
      description: 'Enterprise information provided for membership and KYC review.',
      fields: [
        field('Business / enterprise', member.businessName), field('Business sector', member.sector),
        field('Registration status', member.registrationStatus), field('Employees', member.employees),
        field('Monthly turnover band', member.turnover), field('Consent recorded', member.consent ? 'Yes' : 'Not available'),
      ],
    },
    {
      title: 'Membership and payment',
      description: 'Membership selection and payment record.',
      fields: [
        field('Membership package', packageTitle || member.packageId), field('Package fee', amount(packageAmount)),
        field('Membership number', member.membershipNumber), field('Membership status', member.membershipStatus),
        field('Payment status', member.paymentStatus), field('Payment method', member.paymentMethod),
        field('Payment reference', member.paymentReference), field('Payment phone', member.paymentMobileNumber),
        field('Membership start', date(member.joinedAt)), field('Valid until', date(member.validUntil)),
      ],
    },
    {
      title: 'KYC review and documents',
      description: 'Verification history and the identity documents held on the member record.',
      fields: [
        field('KYC status', member.kycStatus), field('Verified by', member.verifiedBy),
        field('Verification date', date(member.verifiedAt)), field('Registered by', member.createdBy || (member.registrationSource === 'admin-assisted' ? 'Administrator' : 'Member')), 
        field('Registration source', member.registrationSource === 'admin-assisted' ? 'Admin assisted' : 'Member submitted'),
        field('Registration date', date(member.createdAt)),
        field('Last record update', date(member.updatedAt)),
        field('ID front', member.documents.frontUploaded ? 'Document on file' : 'Not uploaded'),
        field('ID back', member.documents.backUploaded ? 'Document on file' : 'Not uploaded'),
      ],
    },
  ];

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KYC dossier â€” ${name}</title>
<style>
  :root{color-scheme:light;--blue:#1a6eaf;--navy:#123757;--ink:#182b3d;--muted:#607286;--line:#dce5ed;--paper:#fff;--wash:#f3f7fa;--gold:#c9a85a}
  *{box-sizing:border-box}body{margin:0;background:#eaf0f5;color:var(--ink);font:14px/1.55 Inter,Segoe UI,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .toolbar{position:sticky;top:0;z-index:1;display:flex;justify-content:center;padding:14px;background:#123757;color:#fff}.toolbar button{border:0;border-radius:7px;background:#fff;color:#123757;padding:11px 17px;font:600 13px Inter,Segoe UI,Arial,sans-serif;cursor:pointer}
  .sheet{width:min(920px,calc(100% - 36px));margin:34px auto;background:var(--paper);box-shadow:0 18px 55px #17334a1a}
  .hero{position:relative;overflow:hidden;padding:34px 42px 30px;background:linear-gradient(116deg,#123757,#1a6eaf);color:#fff}.hero:after{position:absolute;right:-42px;top:-112px;width:320px;height:320px;border:1px solid #ffffff26;border-radius:50%;box-shadow:0 0 0 30px #ffffff0b,0 0 0 62px #ffffff08;content:""}
  .brand{position:relative;z-index:1;display:flex;align-items:center;gap:12px}.brand-mark{display:grid;width:42px;height:42px;place-items:center;border:1px solid #ffffff70;border-radius:10px;color:#fff;font-size:14px;font-weight:800;letter-spacing:.08em}.brand-name{font-size:11px;font-weight:700;letter-spacing:.16em}.brand-sub{margin-top:3px;color:#d5e5f2;font-size:9px;letter-spacing:.1em}
  .hero-main{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-top:38px}.kicker{margin:0 0 8px;color:#d6e8f4;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}.hero h1{margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:400;letter-spacing:-.02em}.hero-copy{max-width:530px;margin:8px 0 0;color:#e4eff7;font-size:12px}.record{min-width:155px;padding-left:18px;border-left:1px solid #ffffff50;text-align:right}.record small{display:block;color:#d6e8f4;font-size:9px;letter-spacing:.13em;text-transform:uppercase}.record strong{display:block;margin-top:5px;font-size:13px;letter-spacing:.05em}.gold-rule{height:3px;background:var(--gold)}
  .content{padding:28px 42px 34px}.summary{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:15px 18px;border:1px solid var(--line);border-radius:8px;background:var(--wash)}.summary-title{font-size:15px;font-weight:700}.summary-sub{margin-top:2px;color:var(--muted);font-size:11px}.pill{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid #b8d8ef;border-radius:999px;background:#eaf4fb;color:#145a91;font-size:10px;font-weight:700;letter-spacing:.04em}.pill i{width:6px;height:6px;border-radius:50%;background:currentColor}
  .section{margin-top:25px;break-inside:avoid}.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding-bottom:9px;border-bottom:1px solid var(--line)}.section h2{margin:0;color:#193c5b;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:400}.section-head p{margin:0;color:var(--muted);font-size:10px;text-align:right}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:34px;padding-top:7px}.field{min-width:0;padding:10px 0 9px;border-bottom:1px solid #edf1f5}.field dt{color:var(--muted);font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}.field dd{margin:3px 0 0;overflow-wrap:anywhere;color:var(--ink);font-size:12px;font-weight:550}.footer{display:flex;justify-content:space-between;gap:20px;margin-top:31px;padding-top:13px;border-top:1px solid var(--line);color:var(--muted);font-size:9px}.confidential{color:#193c5b;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.footnote{margin:13px 0 0;color:#718096;font-size:9px;line-height:1.6}
  @media(max-width:640px){.sheet{width:100%;margin:0}.hero{padding:26px 22px}.hero-main{align-items:flex-start;flex-direction:column;margin-top:28px}.hero h1{font-size:29px}.record{padding:0;border:0;text-align:left}.content{padding:22px}.summary{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:1fr}.section-head{align-items:flex-start;flex-direction:column}.section-head p{text-align:left}.footer{flex-direction:column;gap:5px}}
  @page{size:A4;margin:12mm}@media print{body{background:#fff;font-size:12px}.toolbar{display:none}.sheet{width:auto;margin:0;box-shadow:none}.hero{padding:24px 30px 22px}.hero-main{margin-top:25px}.hero h1{font-size:30px}.content{padding:20px 30px 25px}.section{margin-top:18px}.field{padding:7px 0}.field dd{font-size:11px}.footer{margin-top:22px}}
</style></head><body>
<div class="toolbar"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
<main class="sheet"><header class="hero"><div class="brand"><div class="brand-mark">BN</div><div><div class="brand-name">BNAK</div><div class="brand-sub">BIASHARA NDOGO ASSOCIATION OF KENYA</div></div></div><div class="hero-main"><div><p class="kicker">Membership administration Â· confidential record</p><h1>Member KYC dossier</h1><p class="hero-copy">A structured profile of the member identity, business, membership and verification details held by BNAK.</p></div><div class="record"><small>Member reference</small><strong>${membershipId}</strong></div></div></header><div class="gold-rule"></div>
<div class="content"><section class="summary"><div><div class="summary-title">${name}</div><div class="summary-sub">${escapeHtml(member.businessName)} Â· ${escapeHtml(member.county)}</div></div><span class="pill"><i></i>${status}</span></section>
${sections.map(section => `<section class="section"><div class="section-head"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.description)}</p></div><dl class="grid">${section.fields.join('')}</dl></section>`).join('')}
<footer class="footer"><span class="confidential">Confidential Â· For authorised BNAK administration</span><span>Prepared ${escapeHtml(generated)} Â· ${membershipId}</span></footer><p class="footnote">This document contains personal information and must be handled only for membership administration and KYC purposes. Keep it secure and share it only with authorised personnel.</p></div></main></body></html>`;
}

export function downloadKycReport(html: string, memberName: string) {
  const safeName = memberName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'member';
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bnak-kyc-${safeName}-${stamp}.html`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
