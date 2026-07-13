# Kiosk Management System (KMS)

Offline-first desktop kiosk management application for POS, inventory, suppliers, purchasing, sales history, expenses, reporting, users, settings, backup/restore, Arabic/English UI, barcode-style search, and receipt printing.

## Implemented modules

- **Authentication and roles:** administrator/staff profiles, active status checks, admin-only operations.
- **Dashboard:** daily/monthly revenue and profit, margins, inventory value, low inventory count, supplier purchase value, expenses, net profit.
- **Products and categories:** barcode uniqueness, bilingual names, category/supplier metadata, minimum stock, inactive soft delete.
- **Inventory:** automatic movements for purchases and sales with before/after quantities and references.
- **Suppliers and purchases:** purchase invoices increase inventory and update product cost.
- **POS:** barcode/name search, cart, discounts, cash/card/mixed payments, receipt number generation, inventory non-negativity.
- **Sales history and reports:** sales, low stock, out of stock, inventory value, gross/net profit, best sellers, slow movers.
- **Expenses:** operating expenses included in net profit.
- **Settings:** store name, currency, language, receipt footer, tax, backup location.
- **Backup/restore:** JSON state export/import for offline database snapshots.
- **Exports/printing:** CSV exports and printable receipt text.

## API coverage

The Express API now includes endpoints for authentication, categories, suppliers, products, inventory movements/adjustments, purchases, sales history, expenses, dashboard metrics, financial/inventory/product reports, settings, user activation, backup creation, and restore validation.

See `ACCEPTANCE.md` for BRD acceptance coverage and remaining production hardening items.

## Commands

```bash
npm install
npm run dev
npm run electron
npm test
npm run build
```

> In this environment, dependency installation may be blocked by registry policy for scoped packages. The TypeScript check can still validate project source with the included local shims.

## Demo credentials

- Administrator: `admin` / `admin-demo-hash`
- Staff: `cashier` / `cashier-demo-hash`

Replace demo hashes with BCrypt hashes before production use.
