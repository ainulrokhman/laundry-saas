# Role: STAFF (Tenant Operator)

STAFF is an outlet operator responsible for day-to-day operations. Access is restricted to prevent changes to sensitive outlet configuration.

## Key features
- **Dashboard & Operasional**
  - View outlet activity summary (dashboard)
  - Create and manage orders (POS/order) (roadmap)
  - Update order status following the operational workflow
- **Customer Handling**
  - Assist with customer recording and search (roadmap)
- **Settings (limited)**
  - Change own PIN

## Restrictions (not allowed)
- Do not manage sensitive outlet settings:
  - Bank accounts
  - Payment gateway configuration
  - Subscription settings
- Do not manage users (create/update/deactivate), including other STAFF.
- Do not change anyone’s role.

## Security notes
- All STAFF access must be scoped to the outlet (tenant isolation) and must not cross outlets.
- Sensitive endpoints/features must validate roles server-side (do not rely only on UI/menu).

