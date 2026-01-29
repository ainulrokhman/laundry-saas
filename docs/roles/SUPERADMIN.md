# Role: SUPERADMIN (Admin SaaS)

SUPERADMIN is a **SaaS platform** admin. The focus is to manage the system (cross-outlet) and platform operations, not day-to-day outlet operations.

## Key features
## Key features
- **Subscription Management (SaaS Relationship)**
  - Manage Packages (`SubscriptionPackage`): Define pricing, limits (`maxOutlets`), and features.
  - Manage User Subscriptions:
    - Relations: `User` -> `SubscriptionPackage`.
    - Updates: Admin can manually upgrade/downgrade a User's package.
    - Expiry: Monitor `User.subscriptionExpiresAt`.
- **Outlet Management**
  - View all outlets (Global List).
  - Deactivate outlets (for TOS violation).
- **User Management**
  - View all Owners (`User` list).
  - Reset PIN / Lock Account.
- **Payment Verification**
  - Verify manual transfer proofs for Subscription payments.

## Menu Structure
*   **Dashboard**: Platform health metrics.
*   **Users**: List of all registered Owners & Staff.
*   **Outlets**: List of all Outlets registered in the system.
*   **Packages**: CRUD Subscription Packages.
*   **Payments / Verifikasi**: List of pending transfer proofs.
*   **Bank Accounts (Admin)**: Destination accounts for subscription payments.

## Updates Required (Reflects Recent Architecture)
- **Relation Change**: Subscription is now linked to `User` (Owner), not `Outlet`.
- **Schema Impact**: `Outlet.packageId` is removed. `User.packageId` is added.
- **Quota Enforcement**: Logic moved to `POST /api/dashboard/outlets` to check `User.package.maxOutlets`.

## Restrictions (not allowed)

## Restrictions (not allowed)
- Do not perform daily outlet operations (POS, updating order status) as the primary activity.
- Do not change outlet configuration that should belong to OWNER (e.g., bank accounts, outlet payment configuration) unless required by platform policy.

## Security notes
- SUPERADMIN access is separated from outlet dashboard access to preserve the multi-tenancy model and minimize data leakage risk.
- All administrative actions should be recorded (audit/logging) for traceability.

## SUPERADMIN backlog
- **Impersonation for support (optional)**: SUPERADMIN can impersonate OWNER/STAFF for troubleshooting, with a clear audit log (who impersonated whom, when, and why).

