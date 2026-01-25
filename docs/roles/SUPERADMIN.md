# Role: SUPERADMIN (Admin SaaS)

SUPERADMIN is a **SaaS platform** admin. The focus is to manage the system (cross-outlet) and platform operations, not day-to-day outlet operations.

## Key features
- **Outlet Management**
  - Create / update / deactivate outlets
  - Monitor outlet status (e.g., Pro/subscription status later)
- **User Management (platform)**
  - Create OWNER users (outlet onboarding)
  - Manage users across outlets (activate/deactivate, data changes)
  - Reset user PIN (emergency/support)
- **Payment Verification (Subscription SaaS)**
  - Verify/approve/reject subscription payments (manual transfer)
  - View the list of pending subscription payments
- **Subscription Management**
  - Manage subscription status per outlet
  - Renewal/expiry tracking and actions on expiry
- **Audit & Security (platform)**
  - Access audit logs/security events for admin operations and security incidents
  - Monitor suspicious activity (rate limit hits, repeated lockouts, etc.)

## Restrictions (not allowed)
- Do not perform daily outlet operations (POS, updating order status) as the primary activity.
- Do not change outlet configuration that should belong to OWNER (e.g., bank accounts, outlet payment configuration) unless required by platform policy.

## Security notes
- SUPERADMIN access is separated from outlet dashboard access to preserve the multi-tenancy model and minimize data leakage risk.
- All administrative actions should be recorded (audit/logging) for traceability.

## SUPERADMIN backlog
- **Impersonation for support (optional)**: SUPERADMIN can impersonate OWNER/STAFF for troubleshooting, with a clear audit log (who impersonated whom, when, and why).

