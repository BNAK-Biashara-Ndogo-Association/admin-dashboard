# BNAK Admin Dashboard

Standalone React + TypeScript frontend with its own dependencies, routes, build and hosting configuration. No imports from the member frontend; both apps share the backend API.

## Run locally

Start ../backend on port 3001. Then run:

```powershell
cd admin_dashboard
npm ci
npm run dev
```

Open http://127.0.0.1:5174. On Windows use npm.cmd if PowerShell blocks npm. Member frontend stays on 5173; admin preview uses 4174. Both dev and preview proxy /api to the backend.

Only biasharandogoassociation@gmail.com can access administration, using email and password. Provision this account on the backend with npm run create:admin (optionally set ADMIN_INITIAL_PASSWORD). Generated credentials are saved to the git-ignored .env.admin-credentials.json. Existing accounts are not overwritten. Public signup cannot claim this address. Add the admin origin to backend APP_ORIGINS. Every admin API request checks both the email and password authentication method; Google sessions cannot access administration.

## Deploy separately

npm run build creates dist. Deploy as its own site. For Netlify, set API_UPSTREAM to the shared backend HTTPS origin and use the included netlify.toml. The API proxy must precede the SPA fallback. Add the deployed admin origin to backend APP_ORIGINS . API requests and session cookies use the admin site's same-origin /api proxy. Backend secrets stay on the backend.

Password reset emails use the backend's shared PASSWORD_RESET_ORIGIN; the updated password also works in the admin app.

## Data and controls

Analytics use stored membership registrations, not the member dashboard sample data. Collections represent confirmed registration payments at package prices, not a full financial ledger. Administrators can approve KYC, activate paid and verified memberships, suspend memberships and restore paid and verified memberships. Suspension prevents new payment requests and cannot be overwritten by payment reconciliation. Every admin action is saved with its actor and timestamp. Suspension affects membership status, not the ability to sign in to an account. Uploaded identity images and identity numbers are excluded from the directory response; approving KYC here records an administrative decision and does not perform identity verification automatically.

## Assisted registration

Use **Add member** in the admin dashboard to register someone without an email, smartphone or online account. A contact phone and M-PESA phone are optional; identity details, ID documents, business details, package selection and member consent are required. The member receives a membership number with pending status. Duplicate identity numbers are rejected for assisted registrations. The administrator and creation time are saved in the encrypted registration record.

Open **Manage** to record a confirmed cash receipt, bank transfer or M-PESA transaction reference. The server sets the amount from the membership package and rejects duplicate payment references or a second payment recording. Recording payment does not activate the member: approve KYC and then activate membership separately. **Print member record** prints the member details with their current status and payment reference. No online account or password is created for an assisted member.

## Analytics segmentation

Use the filters above the totals to combine business type (registered sector), county, constituency, ward and membership package. Select a county before choosing its constituency, then choose a ward. Changing a parent location resets the child location filters. Directory search and membership status also apply to the totals, charts and CSV export. Clear filters resets the complete selection.

The Analytics page includes business-type distribution and a business-type-by-county table showing members, active memberships and confirmed registration collections. Empty selections show zero totals and an explicit no-results message. CSV includes sector, county, constituency and ward for the matching members.
# admin-dashboard

## Authentication tests

Run `npm test` to check the frontend auth service and protected route loader: password request handling and the absence of Google sign-in, rejected credentials, malformed responses, anonymous session redirects, and administrator access checks. These tests mock network responses and load the actual TypeScript services and routes; they do not drive a browser or perform a real Google OAuth exchange. The backend's `server/dashboard-auth.test.mjs` exercises real password hashing, session cookies, member registration, admin permissions, assisted registration, payment recording, activation, logout and expiry in an isolated database.
