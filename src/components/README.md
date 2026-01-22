# Components Layer

This layer contains reusable UI components following the **Single Responsibility Principle** - each component has a single, well-defined purpose.

## Structure

- Components are reusable and composable
- Components should be presentational (UI only) or container (with logic)
- Components use AdminLTE/Bootstrap 5 styling
- Components are organized by feature/domain

## Example Structure

```
components/
  ├── common/
  │   ├── Button.tsx
  │   ├── Card.tsx
  │   └── Modal.tsx
  ├── layout/
  │   ├── Sidebar.tsx
  │   ├── Navbar.tsx
  │   └── Footer.tsx
  ├── orders/
  │   ├── OrderList.tsx
  │   └── OrderForm.tsx
  └── outlets/
      ├── OutletList.tsx
      └── OutletForm.tsx
```
