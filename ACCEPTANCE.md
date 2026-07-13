# KMS Acceptance Coverage

This document maps the BRD acceptance criteria to the current implementation and identifies operational notes for handoff.

| Acceptance criterion | Implementation coverage |
| --- | --- |
| Users can authenticate securely | `/auth/login` validates active users and BCrypt password hashes; `KmsStore.authenticate` supports offline authentication fixtures. |
| Products can be managed | API endpoints support product search, create, update, and admin soft-delete; domain store enforces unique barcode and below-cost approval. |
| Inventory updates automatically after purchases and sales | Purchase and sale transactions update product quantity and write inventory movement audit rows. |
| Barcode scanning functions correctly | Product search accepts barcode, Arabic name, and English name; USB scanners that type barcode text work with the POS search input. |
| Sales receipts can be printed | Sales generate receipt numbers; `printableReceipt` formats receipt text for print output. |
| Dashboard displays accurate KPIs | Dashboard API and offline store calculate revenue, gross profit, net profit, inventory value, product/supplier counts, expenses, low stock, and supplier purchase value. |
| Reports can be generated and exported | Financial, inventory, and product report APIs are available; CSV exporters support products, sales, and financial summaries. |
| Backup and restore operate successfully | Backup endpoint writes JSON snapshots; offline store supports JSON backup/restore; restore validation endpoint checks backup shape. |
| Arabic and English interfaces are functional | i18next resources include English and Arabic labels, and the UI switches `dir` between LTR and RTL. |
| Standalone Windows installer | Electron entry and build scaffold exist; installer packaging still requires dependency installation and an electron-builder/electron-forge packaging step in an environment with registry access. |

## Remaining production hardening

- Replace demo passwords with first-run administrator setup and persisted BCrypt hashes.
- Add a migration/seed command once Prisma packages can be installed from the registry.
- Add electron-builder or Electron Forge packaging configuration for a Windows installer.
- Add end-to-end UI tests after runtime dependencies install successfully.
