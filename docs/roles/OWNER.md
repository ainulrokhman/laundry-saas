# Role: OWNER (Tenant Admin)

OWNER is an outlet owner responsible for outlet configuration and operations. OWNER can also manage STAFF accounts for their own outlet.

Note: OWNER can be **multi-outlet**. Dashboard actions always run within the **active outlet** (outlet context) selected by the user.

## Key features
- **Subscription & Outlet Management (NEW)**
  - Manage Subscription (Owner-level): View package status, upgrade plan.
  - Manage Outlets: Create, Update, and Deactivate outlets (limited by Subscription Quota).
  - Switch active outlet context.
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
  - View outlet operational reports (daily/weekly/monthly)
  - View Global Business Reports (Aggregated from all outlets) (roadmap)

## Menu Structure & Scope

### 1. Global / Tenant Level (No Active Outlet Required)
Items here apply to the Account or Business as a whole, across all outlets.
*   **Settings**
    *   **Manajemen Outlet**: Add, view, edit all branches.
    *   **Paket Langganan**: Manage subscription plan and billing invoice.
    *   **Profile**: Change PIN, Personal Info.
*   **Global Reports (Roadmap)**: Consolidated revenue/transactions from all outlets.

### 2. Single Outlet Level (Requires Active Outlet Context)
Items here only show data specific to the *currently selected outlet* in the navbar.
*   **Dashboard**: Outlet permormance summary.
*   **Sales / POS**: Cashier interface for this outlet.
*   **Orders**: Order history for this outlet.
*   **Customers**: Customer database for this outlet.
*   **Services**: Products/Services sold at this outlet.
*   **Settings (Outlet)**:
    *   Bank Accounts (local to outlet).
    *   Payment Gateways (local to outlet).
    *   Staff Management (local to outlet).

## Restrictions (not allowed)
- Do not manage outlets outside of the OWNER’s ownership.
- Do not escalate roles to OWNER/SUPERADMIN (role escalation).
- Do not access platform admin features (SUPERADMIN).

## Security notes
- All data shown/modified by OWNER must always be scoped to the active outlet (tenant isolation).
- Subscription data is scoped to the OWNER (User).
- Sensitive operations (bank accounts, payment configuration) should be restricted to OWNER only.

## OWNER backlog
- Upload subscription payment proof (manual transfer) and view verification status.

