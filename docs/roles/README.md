# Roles & Permissions (RBAC)

This document describes **which features** each role can access in the Laundry SaaS Platform.

## Role Summary
- **SUPERADMIN**: SaaS platform admin (manages the system, not outlet operations)
- **OWNER**: outlet admin (tenant admin) + manages outlet staff
- **STAFF**: outlet operator (day-to-day operations)

## How to read this
- Each role document focuses on **high-level features**, not route/API details.
- Technical rules (multi-tenancy, outlet context, proxy auth) are referenced from:
  - `DEVELOPMENT-PLAN.md` (section **Role Model & Access (RBAC)**)
  - `.cursorrules`

## Per-role documents
- [`SUPERADMIN.md`](SUPERADMIN.md)
- [`OWNER.md`](OWNER.md)
- [`STAFF.md`](STAFF.md)

## Access-related backlog
- **Impersonation (support, optional)**: SUPERADMIN can impersonate OWNER/STAFF for troubleshooting via the admin panel, with strict audit/logging.

