import { Product } from './domain';
import { ReportBundle, SaleInvoice } from './kms';

function csvEscape(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
export function toCsv(headers: string[], rows: unknown[][]) { return [headers.map(csvEscape).join(','), ...rows.map(row => row.map(csvEscape).join(','))].join('\n'); }
export function exportProductsCsv(products: Product[]) { return toCsv(['Barcode', 'Arabic Name', 'English Name', 'Category', 'Supplier', 'Purchase Price', 'Selling Price', 'Quantity', 'Minimum Quantity', 'Unit', 'Status'], products.map(p => [p.barcode, p.nameAr, p.nameEn, p.category, p.supplier, p.purchasePrice, p.sellingPrice, p.quantity, p.minimumQuantity, p.unit, p.status])); }
export function exportSalesCsv(sales: SaleInvoice[]) { return toCsv(['Receipt', 'Cashier', 'Date', 'Subtotal', 'Discount', 'Total', 'COGS', 'Payment'], sales.map(s => [s.receiptNumber, s.cashierId, s.date, s.subtotal, s.discount, s.total, s.costOfGoods, s.paymentMethod])); }
export function exportFinancialSummary(report: ReportBundle) { return toCsv(['Metric', 'Value'], [['Inventory Value', report.inventoryValue], ['Gross Profit', report.grossProfit], ['Net Profit', report.netProfit], ['Low Stock Count', report.lowStock.length], ['Out Of Stock Count', report.outOfStock.length]]); }
export function printableReceipt(sale: SaleInvoice, storeName: string, footer: string) {
  const lines = sale.items.map(item => `${item.quantity} x ${item.product.nameEn} = ${(item.product.sellingPrice * item.quantity).toFixed(2)}`);
  return [storeName, `Receipt: ${sale.receiptNumber}`, `Date: ${sale.date}`, ...lines, `Subtotal: ${sale.subtotal.toFixed(2)}`, `Discount: ${sale.discount.toFixed(2)}`, `Total: ${sale.total.toFixed(2)}`, `Payment: ${sale.paymentMethod}`, footer].join('\n');
}
