# Role: OWNER (Tenant Admin)

OWNER is an outlet owner responsible for outlet configuration and operations. OWNER can also manage STAFF accounts for their own outlet.

Note: OWNER can be **multi-outlet**. Dashboard actions always run within the **active outlet** (outlet context) selected by the user.

## Key features
- **Dashboard & Outlet Operations**
  - View outlet performance summary (dashboard)
  - Manage orders and operational workflow
  - Manage customers
- **Service Management**
  - Create/update/deactivate outlet services
  - Manage pricing and service descriptions
- **Settings (outlet configuration)**
  - Manage outlet bank accounts for manual transfer
  - Configure outlet features (as per product scope)
  - Change own PIN
- **Landing Page Settings (per outlet)**
  - Configure public outlet landing page content (e.g., description, WhatsApp/contact, business hours) (roadmap)
- **Staff Management (tenant-level)**
  - Create STAFF accounts for the same outlet
  - Update STAFF data (name/phone) and active/inactive status
  - Deactivate STAFF when needed
- **Reports**
  - View outlet operational reports (daily/weekly/monthly) (roadmap)

## Restrictions (not allowed)
- Do not manage outlets outside of the OWNER’s ownership.
- Do not escalate roles to OWNER/SUPERADMIN (role escalation).
- Do not access platform admin features (SUPERADMIN).

## Security notes
- All data shown/modified by OWNER must always be scoped to the active outlet (tenant isolation).
- Sensitive operations (bank accounts, payment configuration) should be restricted to OWNER only.

## OWNER backlog
- Subscription management on the outlet side (view status, make payments/renewals) per product design.
- Upload subscription payment proof (manual transfer) and view verification status (roadmap).

